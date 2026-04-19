from datetime import datetime


class Claim:
    """Claim model schema"""

    @staticmethod
    def create_claim(
        item_id,
        claimer_id,
        claimer_username,
        owner_id,
        description,
        proof_image="",
    ):
        return {
            "item_id": item_id,
            "claimer_id": claimer_id,
            "claimer_username": claimer_username,
            "owner_id": owner_id,
            "description": description,
            "proof_image": proof_image,
            "status": "pending",  # pending, approved, rejected
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "admin_notes": "",
        }

    @staticmethod
    def claim_response(claim):
        return {
            "id": str(claim["_id"]),
            "item_id": claim["item_id"],
            "claimer_id": claim["claimer_id"],
            "claimer_username": claim["claimer_username"],
            "owner_id": claim["owner_id"],
            "description": claim["description"],
            "proof_image": claim.get("proof_image", ""),
            "status": claim["status"],
            "created_at": claim["created_at"].isoformat(),
            "admin_notes": claim.get("admin_notes", ""),
        }