from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from datetime import datetime

from routes.auth_routes import token_required, admin_required

admin_bp = Blueprint("admin", __name__)

mongo = None
config = None


def init_admin(mongo_instance, config_instance):
    global mongo, config
    mongo = mongo_instance
    config = config_instance


@admin_bp.route("/dashboard", methods=["GET"])
@token_required
@admin_required
def dashboard(current_user):
    """Get admin dashboard statistics"""
    total_users = mongo.db.users.count_documents({})
    total_lost = mongo.db.items.count_documents({"item_type": "lost"})
    total_found = mongo.db.items.count_documents({"item_type": "found"})
    total_resolved = mongo.db.items.count_documents({"is_resolved": True})
    total_pending_claims = mongo.db.claims.count_documents({"status": "pending"})
    total_approved_claims = mongo.db.claims.count_documents({"status": "approved"})

    # Recent items
    recent_items = list(mongo.db.items.find().sort("created_at", -1).limit(10))
    recent_items_list = []
    for item in recent_items:
        recent_items_list.append(
            {
                "id": str(item["_id"]),
                "name": item["name"],
                "item_type": item["item_type"],
                "category": item["category"],
                "username": item["username"],
                "status": item["status"],
                "created_at": item["created_at"].isoformat(),
            }
        )

    # Recent claims
    recent_claims = list(mongo.db.claims.find().sort("created_at", -1).limit(10))
    recent_claims_list = []
    for claim in recent_claims:
        recent_claims_list.append(
            {
                "id": str(claim["_id"]),
                "item_name": claim.get("item_name", ""),
                "claimer_username": claim["claimer_username"],
                "status": claim["status"],
                "created_at": claim["created_at"].isoformat(),
            }
        )

    return jsonify(
        {
            "stats": {
                "total_users": total_users,
                "total_lost": total_lost,
                "total_found": total_found,
                "total_resolved": total_resolved,
                "total_pending_claims": total_pending_claims,
                "total_approved_claims": total_approved_claims,
                "resolution_rate": round(
                    (total_resolved / max(total_lost + total_found, 1)) * 100, 1
                ),
            },
            "recent_items": recent_items_list,
            "recent_claims": recent_claims_list,
        }
    )


@admin_bp.route("/users", methods=["GET"])
@token_required
@admin_required
def get_users(current_user):
    """Get all users"""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))

    total = mongo.db.users.count_documents({})
    users = (
        mongo.db.users.find()
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    users_list = []
    for user in users:
        users_list.append(
            {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "full_name": user.get("full_name", ""),
                "role": user.get("role", "user"),
                "items_posted": user.get("items_posted", 0),
                "successful_claims": user.get("successful_claims", 0),
                "is_active": user.get("is_active", True),
                "created_at": user["created_at"].isoformat(),
            }
        )

    return jsonify({"users": users_list, "total": total, "page": page})


@admin_bp.route("/users/<user_id>/toggle", methods=["PUT"])
@token_required
@admin_required
def toggle_user(current_user, user_id):
    """Activate/deactivate a user"""
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    if not user:
        return jsonify({"error": "User not found"}), 404

    new_status = not user.get("is_active", True)
    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"is_active": new_status}}
    )

    return jsonify(
        {"message": f"User {'activated' if new_status else 'deactivated'} successfully"}
    )


@admin_bp.route("/claims", methods=["GET"])
@token_required
@admin_required
def get_all_claims(current_user):
    """Get all claims"""
    status_filter = request.args.get("status", "")
    query = {}
    if status_filter:
        query["status"] = status_filter

    claims = list(mongo.db.claims.find(query).sort("created_at", -1))

    claims_list = []
    for claim in claims:
        claims_list.append(
            {
                "id": str(claim["_id"]),
                "item_id": claim["item_id"],
                "item_name": claim.get("item_name", ""),
                "item_type": claim.get("item_type", ""),
                "claimer_username": claim["claimer_username"],
                "claimer_id": claim["claimer_id"],
                "owner_id": claim["owner_id"],
                "description": claim["description"],
                "proof_image": claim.get("proof_image", ""),
                "status": claim["status"],
                "created_at": claim["created_at"].isoformat(),
                "admin_notes": claim.get("admin_notes", ""),
            }
        )

    return jsonify({"claims": claims_list})


@admin_bp.route("/items", methods=["GET"])
@token_required
@admin_required
def get_all_items_admin(current_user):
    """Get all items for admin"""
    items = list(mongo.db.items.find().sort("created_at", -1))

    items_list = []
    for item in items:
        items_list.append(
            {
                "id": str(item["_id"]),
                "name": item["name"],
                "item_type": item["item_type"],
                "category": item["category"],
                "location": item["location"],
                "username": item["username"],
                "user_id": item["user_id"],
                "status": item["status"],
                "matches_count": len(item.get("matches", [])),
                "claims_count": len(item.get("claims", [])),
                "is_resolved": item.get("is_resolved", False),
                "created_at": item["created_at"].isoformat(),
            }
        )

    return jsonify({"items": items_list})