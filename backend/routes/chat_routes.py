from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from datetime import datetime

from routes.auth_routes import token_required

chat_bp = Blueprint("chat", __name__)

mongo = None
config = None


def init_chat(mongo_instance, config_instance):
    global mongo, config
    mongo = mongo_instance
    config = config_instance


@chat_bp.route("/send", methods=["POST"])
@token_required
def send_message(current_user):
    """Send a chat message"""
    data = request.get_json()

    if not data.get("receiver_id") or not data.get("content"):
        return jsonify({"error": "receiver_id and content are required"}), 400

    message = {
        "sender_id": str(current_user["_id"]),
        "sender_username": current_user["username"],
        "receiver_id": data["receiver_id"],
        "item_id": data.get("item_id", ""),
        "content": data["content"].strip(),
        "created_at": datetime.utcnow(),
        "is_read": False,
    }

    result = mongo.db.messages.insert_one(message)

    return (
        jsonify(
            {
                "message": "Message sent",
                "message_id": str(result.inserted_id),
            }
        ),
        201,
    )


@chat_bp.route("/conversation/<other_user_id>", methods=["GET"])
@token_required
def get_conversation(current_user, other_user_id):
    """Get conversation between current user and another user"""
    item_id = request.args.get("item_id", "")
    user_id = str(current_user["_id"])

    query = {
        "$or": [
            {"sender_id": user_id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user_id},
        ]
    }

    if item_id:
        query["item_id"] = item_id

    messages = list(mongo.db.messages.find(query).sort("created_at", 1))

    # Mark messages as read
    mongo.db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user_id, "is_read": False},
        {"$set": {"is_read": True}},
    )

    messages_list = []
    for msg in messages:
        messages_list.append(
            {
                "id": str(msg["_id"]),
                "sender_id": msg["sender_id"],
                "sender_username": msg["sender_username"],
                "receiver_id": msg["receiver_id"],
                "item_id": msg.get("item_id", ""),
                "content": msg["content"],
                "created_at": msg["created_at"].isoformat(),
                "is_read": msg.get("is_read", False),
                "is_mine": msg["sender_id"] == user_id,
            }
        )

    return jsonify({"messages": messages_list})


@chat_bp.route("/conversations", methods=["GET"])
@token_required
def get_all_conversations(current_user):
    """Get all conversations for current user"""
    user_id = str(current_user["_id"])

    # Get unique conversation partners
    pipeline = [
        {
            "$match": {
                "$or": [{"sender_id": user_id}, {"receiver_id": user_id}]
            }
        },
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", user_id]},
                        "$receiver_id",
                        "$sender_id",
                    ]
                },
                "last_message": {"$first": "$content"},
                "last_time": {"$first": "$created_at"},
                "last_sender": {"$first": "$sender_username"},
                "item_id": {"$first": "$item_id"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$eq": ["$receiver_id", user_id]},
                                    {"$eq": ["$is_read", False]},
                                ]
                            },
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"last_time": -1}},
    ]

    conversations = list(mongo.db.messages.aggregate(pipeline))

    conv_list = []
    for conv in conversations:
        # Get partner info
        try:
            partner = mongo.db.users.find_one({"_id": ObjectId(conv["_id"])})
            partner_name = partner["username"] if partner else "Unknown"
        except Exception:
            partner_name = "Unknown"

        conv_list.append(
            {
                "partner_id": conv["_id"],
                "partner_username": partner_name,
                "last_message": conv["last_message"],
                "last_time": conv["last_time"].isoformat(),
                "item_id": conv.get("item_id", ""),
                "unread_count": conv["unread_count"],
            }
        )

    return jsonify({"conversations": conv_list})