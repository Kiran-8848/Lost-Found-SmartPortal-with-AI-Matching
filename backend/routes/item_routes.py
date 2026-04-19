import os
from flask import Blueprint, request, jsonify, send_from_directory
from bson.objectid import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename

from routes.auth_routes import token_required
from ai_matching.matcher import smart_matcher

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

    # Handle both JSON and form data
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        print(f"  Form data received: {list(data.keys())}")
    else:
        data = request.get_json() or {}
        print(f"  JSON data received: {list(data.keys())}")

    # Validation
    required = ["name", "description", "category", "location", "date_occurred", "item_type"]
    for field in required:
        if field not in data or not str(data[field]).strip():
            print(f"  ERROR: Missing field: {field}")
            return jsonify({"error": f"{field} is required"}), 400

    item_type = data["item_type"].lower()
    if item_type not in ["lost", "found"]:
        return jsonify({"error": "item_type must be 'lost' or 'found'"}), 400

    print(f"  Item type: {item_type}")
    print(f"  Item name: {data['name']}")
    print(f"  Category: {data['category']}")
    print(f"  Location: {data['location']}")

    # Handle image upload
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
            print(f"  Image saved: {filename}")
    else:
        print("  No image uploaded")

    # Create item document
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
        "contact_info": data.get("contact_info", ""),
        "reward": data.get("reward", ""),
        "status": item_type,
        "matches": [],
        "claims": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_resolved": False,
    }

    # Save to database
    result = mongo.db.items.insert_one(item)
    item["_id"] = result.inserted_id
    print(f"  Item saved with ID: {result.inserted_id}")

    # Update user's item count
    mongo.db.users.update_one(
        {"_id": current_user["_id"]}, {"$inc": {"items_posted": 1}}
    )

    # ============================================
    # RUN AI MATCHING
    # ============================================
    opposite_type = "found" if item_type == "lost" else "lost"
    print(f"\n  Searching for {opposite_type} items to match against...")

    # Get ALL opposite type items (not resolved)
    candidates = list(
        mongo.db.items.find({
            "item_type": opposite_type,
            "is_resolved": False
        })
    )

    print(f"  Found {len(candidates)} {opposite_type} items in database")

    # Debug: Show all candidates
    for i, c in enumerate(candidates):
        print(f"    Candidate {i+1}: {c.get('name', 'No name')} "
              f"(category: {c.get('category', 'none')}, "
              f"location: {c.get('location', 'none')})")

    # Run matching with LOW threshold
    matches = smart_matcher.find_matches(
        item,
        candidates,
        threshold=0.4,   # Very low threshold so matches show up
        max_results=20
    )

    # Save matches to the item
    if matches:
        match_ids = [m["item_id"] for m in matches]
        mongo.db.items.update_one(
            {"_id": result.inserted_id},
            {"$set": {"matches": match_ids}}
        )
        print(f"  Saved {len(match_ids)} match references to item")

        # Also add reverse match references
        for match in matches:
            mongo.db.items.update_one(
                {"_id": ObjectId(match["item_id"])},
                {"$addToSet": {"matches": str(result.inserted_id)}},
            )
    else:
        print(f"  No matches found")

    response = {
        "message": f"{item_type.capitalize()} item posted successfully!",
        "item_id": str(result.inserted_id),
        "matches_found": len(matches),
        "matches": matches,
    }

    print(f"\n  RESPONSE: {len(matches)} matches found")
    print(f"  {'='*40}\n")

    return jsonify(response), 201


@item_bp.route("/all", methods=["GET"])
def get_all_items():
    """Get all items with optional filters"""
    item_type = request.args.get("type", "")
    category = request.args.get("category", "")
    search = request.args.get("search", "")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    status = request.args.get("status", "")

    query = {"is_resolved": False}

    if item_type:
        query["item_type"] = item_type
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
        ]

    total = mongo.db.items.count_documents(query)
    items = (
        mongo.db.items.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    items_list = []
    for item in items:
        items_list.append(
            {
                "id": str(item["_id"]),
                "user_id": item["user_id"],
                "username": item["username"],
                "item_type": item["item_type"],
                "name": item["name"],
                "description": item["description"],
                "category": item["category"],
                "location": item["location"],
                "date_occurred": item["date_occurred"],
                "image": item.get("image", ""),
                "contact_info": item.get("contact_info", ""),
                "reward": item.get("reward", ""),
                "status": item["status"],
                "matches_count": len(item.get("matches", [])),
                "created_at": item["created_at"].isoformat(),
                "is_resolved": item.get("is_resolved", False),
            }
        )

    return jsonify(
        {
            "items": items_list,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }
    )


@item_bp.route("/<item_id>", methods=["GET"])
def get_item(item_id):
    """Get item details"""
    try:
        item = mongo.db.items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        return jsonify({"error": "Invalid item ID"}), 400

    if not item:
        return jsonify({"error": "Item not found"}), 404

    # Get match details
    match_details = []
    for match_id in item.get("matches", []):
        try:
            matched_item = mongo.db.items.find_one({"_id": ObjectId(match_id)})
            if matched_item:
                match_details.append(
                    {
                        "id": str(matched_item["_id"]),
                        "name": matched_item["name"],
                        "description": matched_item["description"],
                        "category": matched_item["category"],
                        "location": matched_item["location"],
                        "date_occurred": matched_item["date_occurred"],
                        "image": matched_item.get("image", ""),
                        "item_type": matched_item["item_type"],
                        "username": matched_item["username"],
                        "user_id": matched_item["user_id"],
                    }
                )
        except Exception:
            continue

    item_data = {
        "id": str(item["_id"]),
        "user_id": item["user_id"],
        "username": item["username"],
        "item_type": item["item_type"],
        "name": item["name"],
        "description": item["description"],
        "category": item["category"],
        "location": item["location"],
        "date_occurred": item["date_occurred"],
        "image": item.get("image", ""),
        "contact_info": item.get("contact_info", ""),
        "reward": item.get("reward", ""),
        "status": item["status"],
        "matches": match_details,
        "claims": item.get("claims", []),
        "created_at": item["created_at"].isoformat(),
        "is_resolved": item.get("is_resolved", False),
    }

    return jsonify({"item": item_data})


@item_bp.route("/my-items", methods=["GET"])
@token_required
def get_my_items(current_user):
    """Get current user's items"""
    items = (
        mongo.db.items.find({"user_id": str(current_user["_id"])})
        .sort("created_at", -1)
    )

    items_list = []
    for item in items:
        items_list.append(
            {
                "id": str(item["_id"]),
                "item_type": item["item_type"],
                "name": item["name"],
                "description": item["description"],
                "category": item["category"],
                "location": item["location"],
                "date_occurred": item["date_occurred"],
                "image": item.get("image", ""),
                "status": item["status"],
                "matches_count": len(item.get("matches", [])),
                "claims_count": len(item.get("claims", [])),
                "created_at": item["created_at"].isoformat(),
                "is_resolved": item.get("is_resolved", False),
            }
        )

    return jsonify({"items": items_list})


@item_bp.route("/<item_id>/matches", methods=["GET"])
@token_required
def get_item_matches(current_user, item_id):
    """Get AI-generated matches for an item - RECALCULATES FRESH"""
    print(f"\n>>> GET MATCHES for item: {item_id}")

    try:
        item = mongo.db.items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        return jsonify({"error": "Invalid item ID"}), 400

    if not item:
        return jsonify({"error": "Item not found"}), 404

    # Re-run matching to get fresh scores
    opposite_type = "found" if item["item_type"] == "lost" else "lost"
    candidates = list(
        mongo.db.items.find({
            "item_type": opposite_type,
            "is_resolved": False
        })
    )

    print(f"  Item: {item.get('name', 'Unknown')} ({item['item_type']})")
    print(f"  Searching {len(candidates)} {opposite_type} items...")

    matches = smart_matcher.find_matches(
        item,
        candidates,
        threshold=10.0,
        max_results=20
    )

    return jsonify({"matches": matches, "total": len(matches)})


@item_bp.route("/<item_id>", methods=["PUT"])
@token_required
def update_item(current_user, item_id):
    """Update an item"""
    try:
        item = mongo.db.items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        return jsonify({"error": "Invalid item ID"}), 400

    if not item:
        return jsonify({"error": "Item not found"}), 404

    if item["user_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    update_fields = {}

    for field in ["name", "description", "category", "location",
                   "date_occurred", "contact_info", "reward", "status"]:
        if field in data:
            update_fields[field] = data[field]

    if update_fields:
        update_fields["updated_at"] = datetime.utcnow()
        mongo.db.items.update_one(
            {"_id": ObjectId(item_id)}, {"$set": update_fields}
        )

    return jsonify({"message": "Item updated successfully"})


@item_bp.route("/<item_id>", methods=["DELETE"])
@token_required
def delete_item(current_user, item_id):
    """Delete an item"""
    try:
        item = mongo.db.items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        return jsonify({"error": "Invalid item ID"}), 400

    if not item:
        return jsonify({"error": "Item not found"}), 404

    if item["user_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    # Delete image file
    if item.get("image"):
        try:
            os.remove(os.path.join(config.UPLOAD_FOLDER, item["image"]))
        except OSError:
            pass

    mongo.db.items.delete_one({"_id": ObjectId(item_id)})
    return jsonify({"message": "Item deleted successfully"})


@item_bp.route("/uploads/<filename>", methods=["GET"])
def get_upload(filename):
    """Serve uploaded files"""
    return send_from_directory(config.UPLOAD_FOLDER, filename)