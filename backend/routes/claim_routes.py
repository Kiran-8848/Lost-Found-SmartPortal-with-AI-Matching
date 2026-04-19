import os
from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename

from routes.auth_routes import token_required

claim_bp = Blueprint("claims", __name__)

mongo = None
config = None


def init_claims(mongo_instance, config_instance):
    global mongo, config
    mongo = mongo_instance
    config = config_instance


@claim_bp.route("/submit", methods=["POST"])
@token_required
def submit_claim(current_user):
    """Submit a claim for an item"""
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
    else:
        data = request.get_json() or {}

    if not data.get("item_id"):
        return jsonify({"error": "item_id is required"}), 400
    if not data.get("description"):
        return jsonify({"error": "Description is required for verification"}), 400

    item_id = data["item_id"]

    try:
        item = mongo.db.items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        return jsonify({"error": "Invalid item ID"}), 400

    if not item:
        return jsonify({"error": "Item not found"}), 404

    if item.get("is_resolved"):
        return jsonify({"error": "This item has already been resolved"}), 400

    # Can't claim your own item
    if item["user_id"] == str(current_user["_id"]):
        return jsonify({"error": "You cannot claim your own item"}), 400

    # Check for existing pending claim
    existing = mongo.db.claims.find_one(
        {
            "item_id": item_id,
            "claimer_id": str(current_user["_id"]),
            "status": "pending",
        }
    )
    if existing:
        return jsonify({"error": "You already have a pending claim for this item"}), 400

    # Handle proof image
    proof_image = ""
    if "proof_image" in request.files:
        file = request.files["proof_image"]
        if file and file.filename:
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            filename = secure_filename(f"proof_{timestamp}_{file.filename}")
            filepath = os.path.join(config.UPLOAD_FOLDER, filename)
            os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
            file.save(filepath)
            proof_image = filename

    claim = {
        "item_id": item_id,
        "claimer_id": str(current_user["_id"]),
        "claimer_username": current_user["username"],
        "owner_id": item["user_id"],
        "item_name": item["name"],
        "item_type": item["item_type"],
        "description": data["description"],
        "proof_image": proof_image,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "admin_notes": "",
    }

    result = mongo.db.claims.insert_one(claim)

    # Add claim reference to item
    mongo.db.items.update_one(
        {"_id": ObjectId(item_id)},
        {"$push": {"claims": str(result.inserted_id)}},
    )

    return (
        jsonify(
            {
                "message": "Claim submitted successfully. Waiting for verification.",
                "claim_id": str(result.inserted_id),
            }
        ),
        201,
    )


@claim_bp.route("/my-claims", methods=["GET"])
@token_required
def get_my_claims(current_user):
    """Get claims made by current user"""
    claims = list(
        mongo.db.claims.find({"claimer_id": str(current_user["_id"])}).sort(
            "created_at", -1
        )
    )

    claims_list = []
    for claim in claims:
        claims_list.append(
            {
                "id": str(claim["_id"]),
                "item_id": claim["item_id"],
                "item_name": claim.get("item_name", ""),
                "item_type": claim.get("item_type", ""),
                "description": claim["description"],
                "proof_image": claim.get("proof_image", ""),
                "status": claim["status"],
                "created_at": claim["created_at"].isoformat(),
                "admin_notes": claim.get("admin_notes", ""),
            }
        )

    return jsonify({"claims": claims_list})


@claim_bp.route("/received", methods=["GET"])
@token_required
def get_received_claims(current_user):
    """Get claims on current user's items"""
    claims = list(
        mongo.db.claims.find({"owner_id": str(current_user["_id"])}).sort(
            "created_at", -1
        )
    )

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
                "description": claim["description"],
                "proof_image": claim.get("proof_image", ""),
                "status": claim["status"],
                "created_at": claim["created_at"].isoformat(),
            }
        )

    return jsonify({"claims": claims_list})


@claim_bp.route("/<claim_id>/respond", methods=["PUT"])
@token_required
def respond_to_claim(current_user, claim_id):
    """Approve or reject a claim (by item owner or admin)"""
    try:
        claim = mongo.db.claims.find_one({"_id": ObjectId(claim_id)})
    except Exception:
        return jsonify({"error": "Invalid claim ID"}), 400

    if not claim:
        return jsonify({"error": "Claim not found"}), 404

    # Only owner or admin can respond
    is_owner = claim["owner_id"] == str(current_user["_id"])
    is_admin = current_user.get("role") == "admin"

    if not is_owner and not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    action = data.get("action", "").lower()

    if action not in ["approve", "reject"]:
        return jsonify({"error": "Action must be 'approve' or 'reject'"}), 400

    new_status = "approved" if action == "approve" else "rejected"

    mongo.db.claims.update_one(
        {"_id": ObjectId(claim_id)},
        {
            "$set": {
                "status": new_status,
                "admin_notes": data.get("notes", ""),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # If approved, mark item as resolved
    if new_status == "approved":
        mongo.db.items.update_one(
            {"_id": ObjectId(claim["item_id"])},
            {"$set": {"status": "returned", "is_resolved": True, "updated_at": datetime.utcnow()}},
        )

        # Update successful claims count
        mongo.db.users.update_one(
            {"_id": ObjectId(claim["claimer_id"])},
            {"$inc": {"successful_claims": 1}},
        )
        mongo.db.users.update_one(
            {"_id": ObjectId(claim["owner_id"])},
            {"$inc": {"successful_claims": 1}},
        )

        # Reject all other pending claims for same item
        mongo.db.claims.update_many(
            {
                "item_id": claim["item_id"],
                "_id": {"$ne": ObjectId(claim_id)},
                "status": "pending",
            },
            {"$set": {"status": "rejected", "admin_notes": "Another claim was approved", "updated_at": datetime.utcnow()}},
        )

    return jsonify({"message": f"Claim {new_status} successfully"})