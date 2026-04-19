from datetime import datetime


class Item:
    """Item model schema for lost and found items"""

    CATEGORIES = [
        "Electronics",
        "Documents",
        "Keys",
        "Wallet/Purse",
        "Clothing",
        "Jewelry",
        "Bags/Backpack",
        "Books",
        "Sports Equipment",
        "Musical Instrument",
        "Pet",
        "Other",
    ]

    STATUS_OPTIONS = ["lost", "found", "matched", "claimed", "returned"]

    @staticmethod
    def create_item(
        user_id,
        username,
        item_type,
        name,
        description,
        category,
        location,
        date_occurred,
        image_filename="",
        contact_info="",
        reward="",
    ):
        return {
            "user_id": user_id,
            "username": username,
            "item_type": item_type,  # "lost" or "found"
            "name": name,
            "description": description,
            "category": category,
            "location": location,
            "date_occurred": date_occurred,
            "image": image_filename,
            "contact_info": contact_info,
            "reward": reward,
            "status": item_type,  # initially same as type
            "matches": [],
            "claims": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_resolved": False,
        }

    @staticmethod
    def item_response(item):
        return {
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
            "matches": item.get("matches", []),
            "claims": item.get("claims", []),
            "created_at": item["created_at"].isoformat(),
            "is_resolved": item.get("is_resolved", False),
        }