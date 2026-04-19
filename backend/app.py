"""
🌍 Lost & Found Smart Portal - Backend Server
Flask + MongoDB + AI Matching
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_pymongo import PyMongo
from flask_cors import CORS
from config import Config

# Import route initializers
from routes.auth_routes import auth_bp, init_auth
from routes.item_routes import item_bp, init_items
from routes.claim_routes import claim_bp, init_claims
from routes.chat_routes import chat_bp, init_chat
from routes.admin_routes import admin_bp, init_admin

import bcrypt
from datetime import datetime


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # MongoDB
    app.config["MONGO_URI"] = Config.MONGO_URI
    mongo = PyMongo(app)

    # Ensure upload folder exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Initialize routes with mongo and config
    init_auth(mongo, Config)
    init_items(mongo, Config)
    init_claims(mongo, Config)
    init_chat(mongo, Config)
    init_admin(mongo, Config)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(item_bp, url_prefix="/api/items")
    app.register_blueprint(claim_bp, url_prefix="/api/claims")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # Serve uploaded files
    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    # Health check
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "message": "Lost & Found Portal API is running"})

    # Create default admin user if not exists
    with app.app_context():
        try:
            admin = mongo.db.users.find_one({"username": "admin"})
            if not admin:
                admin_user = {
                    "username": "admin",
                    "email": "admin@lostfound.com",
                    "password": bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()),
                    "full_name": "System Admin",
                    "phone": "",
                    "role": "admin",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "profile_image": "",
                    "items_posted": 0,
                    "successful_claims": 0,
                    "is_active": True,
                }
                mongo.db.users.insert_one(admin_user)
                print("✅ Default admin user created (admin@lostfound.com / admin123)")

            # Create indexes
            mongo.db.users.create_index("email", unique=True)
            mongo.db.users.create_index("username", unique=True)
            mongo.db.items.create_index([("name", "text"), ("description", "text")])
            mongo.db.items.create_index("item_type")
            mongo.db.items.create_index("category")
            mongo.db.items.create_index("user_id")
            mongo.db.claims.create_index("item_id")
            mongo.db.claims.create_index("claimer_id")
            mongo.db.messages.create_index("sender_id")
            mongo.db.messages.create_index("receiver_id")
            print("✅ Database indexes created")
        except Exception as e:
            print(f"⚠️ DB setup note: {e}")

    return app


if __name__ == "__main__":
    app = create_app()
    print("\n🌍 Lost & Found Smart Portal")
    print("=" * 40)
    print("🚀 Server running on http://localhost:5000")
    print("📡 API Base: http://localhost:5000/api")
    print("👤 Admin: admin@lostfound.com / admin123")
    print("=" * 40 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)