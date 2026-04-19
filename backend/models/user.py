from datetime import datetime


class User:
    """User model schema"""

    @staticmethod
    def create_user(username, email, password_hash, full_name="", phone="", role="user"):
        return {
            "username": username,
            "email": email,
            "password": password_hash,
            "full_name": full_name,
            "phone": phone,
            "role": role,  # "user" or "admin"
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "profile_image": "",
            "items_posted": 0,
            "successful_claims": 0,
            "is_active": True,
        }

    @staticmethod
    def user_response(user):
        """Return safe user data (no password)"""
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", "user"),
            "created_at": user["created_at"].isoformat(),
            "profile_image": user.get("profile_image", ""),
            "items_posted": user.get("items_posted", 0),
            "successful_claims": user.get("successful_claims", 0),
        }