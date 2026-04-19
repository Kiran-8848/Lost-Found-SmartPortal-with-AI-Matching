from datetime import datetime


class Message:
    """Chat message model"""

    @staticmethod
    def create_message(sender_id, sender_username, receiver_id, item_id, content):
        return {
            "sender_id": sender_id,
            "sender_username": sender_username,
            "receiver_id": receiver_id,
            "item_id": item_id,
            "content": content,
            "created_at": datetime.utcnow(),
            "is_read": False,
        }

    @staticmethod
    def message_response(msg):
        return {
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "sender_username": msg["sender_username"],
            "receiver_id": msg["receiver_id"],
            "item_id": msg["item_id"],
            "content": msg["content"],
            "created_at": msg["created_at"].isoformat(),
            "is_read": msg.get("is_read", False),
        }