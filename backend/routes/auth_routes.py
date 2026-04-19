from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps

auth_bp = Blueprint("auth", __name__)

# Will be set from app.py
mongo = None
config = None


def init_auth(mongo_instance, config_instance):
    global mongo, config
    mongo = mongo_instance
    config = config_instance


def token_required(f):
    """JWT authentication decorator"""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid token format"}), 401

        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            data = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            current_user = mongo.db.users.find_one({"_id": ObjectId(data["user_id"])})
            if not current_user:
                return jsonify({"error": "User not found"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    """Admin role decorator"""

    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(current_user, *args, **kwargs)

    return decorated


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new user"""
    data = request.get_json()

    # Validation
    required = ["username", "email", "password"]
    for field in required:
        if field not in data or not data[field].strip():
            return jsonify({"error": f"{field} is required"}), 400

    username = data["username"].strip().lower()
    email = data["email"].strip().lower()
    password = data["password"]

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check if user exists
    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    if mongo.db.users.find_one({"username": username}):
        return jsonify({"error": "Username already taken"}), 409

    # Hash password
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    # Create user
    user = {
        "username": username,
        "email": email,
        "password": password_hash,
        "full_name": data.get("full_name", ""),
        "phone": data.get("phone", ""),
        "role": "user",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "profile_image": "",
        "items_posted": 0,
        "successful_claims": 0,
        "is_active": True,
    }

    result = mongo.db.users.insert_one(user)

    # Generate token
    token = jwt.encode(
        {
            "user_id": str(result.inserted_id),
            "exp": datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS),
        },
        config.SECRET_KEY,
        algorithm="HS256",
    )

    user["_id"] = result.inserted_id

    return (
        jsonify(
            {
                "message": "Account created successfully",
                "token": token,
                "user": {
                    "id": str(result.inserted_id),
                    "username": username,
                    "email": email,
                    "full_name": user["full_name"],
                    "role": "user",
                },
            }
        ),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    """User login"""
    data = request.get_json()

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    email = data["email"].strip().lower()
    user = mongo.db.users.find_one({"email": email})

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.checkpw(data["password"].encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.get("is_active", True):
        return jsonify({"error": "Account is deactivated"}), 403

    # Generate token
    token = jwt.encode(
        {
            "user_id": str(user["_id"]),
            "exp": datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS),
        },
        config.SECRET_KEY,
        algorithm="HS256",
    )

    return jsonify(
        {
            "message": "Login successful",
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "full_name": user.get("full_name", ""),
                "phone": user.get("phone", ""),
                "role": user.get("role", "user"),
                "items_posted": user.get("items_posted", 0),
                "successful_claims": user.get("successful_claims", 0),
            },
        }
    )


@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    """Get user profile"""
    return jsonify(
        {
            "user": {
                "id": str(current_user["_id"]),
                "username": current_user["username"],
                "email": current_user["email"],
                "full_name": current_user.get("full_name", ""),
                "phone": current_user.get("phone", ""),
                "role": current_user.get("role", "user"),
                "created_at": current_user["created_at"].isoformat(),
                "items_posted": current_user.get("items_posted", 0),
                "successful_claims": current_user.get("successful_claims", 0),
            }
        }
    )


@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile(current_user):
    """Update user profile"""
    data = request.get_json()

    update_fields = {}
    if "full_name" in data:
        update_fields["full_name"] = data["full_name"]
    if "phone" in data:
        update_fields["phone"] = data["phone"]

    if "password" in data and data["password"]:
        if len(data["password"]) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        update_fields["password"] = bcrypt.hashpw(
            data["password"].encode("utf-8"), bcrypt.gensalt()
        )

    if update_fields:
        update_fields["updated_at"] = datetime.utcnow()
        mongo.db.users.update_one(
            {"_id": current_user["_id"]}, {"$set": update_fields}
        )

    return jsonify({"message": "Profile updated successfully"})