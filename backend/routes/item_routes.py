import os
from flask import Blueprint, request, jsonify, send_from_directory
from bson.objectid import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename

from routes.auth_routes import token_required

# ✅ FIX 1: Safe AI import
try:
    from ai_matching.matcher import smart_matcher
    AI_AVAILABLE = True
except:
    AI_AVAILABLE = False

item_bp = Blueprint("items", __name__)

mongo = None
config = None


def init_items(mongo_instance, config_instance):
    global mongo, config
    mongo = mongo_instance
    config = config_instance


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_EXTENSIONS
    )


@item_bp.route("/post", methods=["POST"])
@token_required
def post_item(current_user):
    """Post a lost or found item"""
    print(f"\n>>> POST ITEM request from user: {current_user['username']}")

    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
    else:
        data = request.get_json() or {}

    required = ["name", "description", "category", "location", "date_occurred", "item_type"]
    for field in required:
        if field not in data or not str(data[field]).strip():
            return jsonify({"error": f"{field} is required"}), 400

    item_type = data["item_type"].lower()

    image_filename = ""
    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename and allowed_file(file.filename):
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            filename = secure_filename(f"{timestamp}_{file.filename}")
            filepath = os.path.join(config.UPLOAD_FOLDER, filename)
            os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
            file.save(filepath)
            image_filename = filename

    item = {
        "user_id": str(current_user["_id"]),
        "username": current_user["username"],
        "item_type": item_type,
        "name": data["name"].strip(),
        "description": data["description"].strip(),
        "category": data["category"].strip(),
        "location": data["location"].strip(),
        "date_occurred": data["date_occurred"],
        "image": image_filename,
        "status": item_type,
        "matches": [],
        "claims": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_resolved": False,
    }

    result = mongo.db.items.insert_one(item)
    item["_id"] = result.inserted_id

    mongo.db.users.update_one(
        {"_id": current_user["_id"]}, {"$inc": {"items_posted": 1}}
    )

    # ============================================
    # RUN AI MATCHING
    # ============================================
    opposite_type = "found" if item_type == "lost" else "lost"

    candidates = list(
        mongo.db.items.find({
            "item_type": opposite_type,
            "is_resolved": False
        })
    )

    # ✅ FIX 2: Correct indentation
    if AI_AVAILABLE:
        matches = smart_matcher.find_matches(
            item,
            candidates,
            threshold=10.0,
            max_results=20
        )
    else:
        matches = []

    if matches:
        match_ids = [m["item_id"] for m in matches]
        mongo.db.items.update_one(
            {"_id": result.inserted_id},
            {"$set": {"matches": match_ids}}
        )

        for match in matches:
            mongo.db.items.update_one(
                {"_id": ObjectId(match["item_id"])},
                {"$addToSet": {"matches": str(result.inserted_id)}},
            )

    return jsonify({
        "message": "Item posted successfully",
        "matches_found": len(matches),
        "matches": matches
    }), 201


@item_bp.route("/<item_id>/matches", methods=["GET"])
@token_required
def get_item_matches(current_user, item_id):

    item = mongo.db.items.find_one({"_id": ObjectId(item_id)})

    if not item:
        return jsonify({"error": "Item not found"}), 404

    opposite_type = "found" if item["item_type"] == "lost" else "lost"

    candidates = list(
        mongo.db.items.find({
            "item_type": opposite_type,
            "is_resolved": False
        })
    )

    # ✅ FIX 2 applied here also
    if AI_AVAILABLE:
        matches = smart_matcher.find_matches(
            item,
            candidates,
            threshold=0.4,
            max_results=20
        )
    else:
        matches = []

    return jsonify({"matches": matches})


@item_bp.route("/uploads/<filename>", methods=["GET"])
def get_upload(filename):
    return send_from_directory(config.UPLOAD_FOLDER, filename)
