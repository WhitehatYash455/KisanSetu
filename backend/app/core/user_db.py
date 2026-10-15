import os
import sqlite3
import hashlib
import secrets
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> Tuple[str, str]:
    """Hashes a password securely using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    ).hex()
    return pw_hash, salt


def verify_password(password: str, pw_hash: str, salt: str) -> bool:
    """Verifies a plain password against the stored PBKDF2 hash and salt."""
    candidate = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    ).hex()
    return secrets.compare_digest(candidate, pw_hash)


def normalize_identifier(identifier: str) -> str:
    """
    Normalizes mobile numbers or email addresses:
    - Emails converted to lowercase trimmed string.
    - Mobile numbers normalized (removes spaces, dashes).
    """
    cleaned = identifier.strip()
    if "@" in cleaned:
        return cleaned.lower()
    
    # Strip spaces, dashes, brackets
    digits_only = "".join(ch for ch in cleaned if ch.isdigit() or ch == "+")
    if digits_only.startswith("+91") and len(digits_only) == 13:
        return digits_only
    if digits_only.startswith("91") and len(digits_only) == 12:
        return f"+{digits_only}"
    if len(digits_only) == 10 and digits_only.isdigit():
        return f"+91{digits_only}"
    return digits_only or cleaned


class UserDatabase:
    """Persistent SQLite database manager for KrishiSetu Farmers & Accounts."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Resolve relative to backend directory
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.db_path = str(base_dir / settings.SQLITE_DB_PATH)
        else:
            self.db_path = db_path

        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def init_db(self):
        """Initializes tables and seeds initial verified demo farmer account."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    identifier TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    email TEXT,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_identifier ON users(identifier)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")

            # 2. User Profiles Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    farmer_id TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    phone_number TEXT,
                    email TEXT,
                    preferred_language TEXT NOT NULL DEFAULT 'en',
                    state TEXT,
                    district TEXT,
                    sub_district TEXT,
                    village TEXT,
                    pincode TEXT,
                    total_acreage REAL NOT NULL DEFAULT 0.0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_profiles_farmer_id ON user_profiles(farmer_id)")

            # 3. Farmer Settings Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS farmer_settings (
                    id TEXT PRIMARY KEY,
                    farmer_id TEXT UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                    theme_preference TEXT NOT NULL DEFAULT 'light',
                    notification_sms INTEGER NOT NULL DEFAULT 0,
                    notification_push INTEGER NOT NULL DEFAULT 1,
                    notification_whatsapp INTEGER NOT NULL DEFAULT 0,
                    preferred_distance_unit TEXT NOT NULL DEFAULT 'km',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # 4. OTP Verifications Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS otp_verifications (
                    id TEXT PRIMARY KEY,
                    identifier TEXT NOT NULL,
                    otp_code TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    is_used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_verifications(identifier)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_purpose ON otp_verifications(purpose)")

            conn.commit()

            # Seed default demo farmer if empty
            cursor.execute("SELECT COUNT(*) as count FROM users")
            row = cursor.fetchone()
            if row and row["count"] == 0:
                self._seed_default_demo_farmer(cursor)
                conn.commit()

    def _seed_default_demo_farmer(self, cursor: sqlite3.Cursor):
        """Pre-seeds the verified demo farmer (Ramesh Patil) with password 'kisan123'."""
        user_id = "00000000-0000-0000-0000-000000000001"
        identifier = "+919876543210"
        phone = "+919876543210"
        email = "ramesh.patil@kisan.in"
        pw_hash, salt = hash_password("kisan123")
        now = _now_iso()

        cursor.execute("""
            INSERT OR IGNORE INTO users (id, identifier, phone, email, password_hash, salt, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, identifier, phone, email, pw_hash, salt, now, now))

        cursor.execute("""
            INSERT OR IGNORE INTO user_profiles (
                id, farmer_id, full_name, phone_number, email, preferred_language,
                state, district, sub_district, village, pincode, total_acreage, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            "AGRI-8N4K-3M9Q",
            "Ramesh Patil",
            phone,
            email,
            "mr",
            "Maharashtra",
            "Nashik",
            "Niphad",
            "Lasalgaon",
            "422306",
            4.5,
            now,
            now
        ))

        cursor.execute("""
            INSERT OR IGNORE INTO farmer_settings (
                id, farmer_id, theme_preference, notification_sms, notification_push, notification_whatsapp,
                preferred_distance_unit, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"sett-{user_id[:8]}",
            user_id,
            "light",
            0,
            1,
            1,
            "km",
            now,
            now
        ))
        logger.info("Initialized SQLite database and seeded default demo farmer account.")

    def get_user_by_identifier(self, raw_identifier: str) -> Optional[Dict[str, Any]]:
        norm = normalize_identifier(raw_identifier)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM users
                WHERE identifier = ? OR phone = ? OR email = ?
            """, (norm, norm, norm.lower() if "@" in norm else norm))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def check_identifier_exists(self, raw_identifier: str) -> bool:
        norm = normalize_identifier(raw_identifier)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 1 FROM users
                WHERE identifier = ? OR phone = ? OR email = ?
            """, (norm, norm, norm.lower() if "@" in norm else norm))
            return cursor.fetchone() is not None

    def create_user(
        self,
        identifier: str,
        password: str,
        full_name: str,
        phone_number: Optional[str] = None,
        email: Optional[str] = None,
        preferred_language: str = "en",
        state: Optional[str] = "Maharashtra",
        district: Optional[str] = None,
        sub_district: Optional[str] = None,
        village: Optional[str] = None,
        pincode: Optional[str] = None,
        total_acreage: float = 0.0,
    ) -> Dict[str, Any]:
        """Creates a new user and farmer profile in the persistent database."""
        from app.core.security import generate_opaque_farmer_id
        import uuid

        norm_identifier = normalize_identifier(identifier)
        norm_phone = normalize_identifier(phone_number) if phone_number else (
            norm_identifier if not "@" in norm_identifier else None
        )
        norm_email = email.strip().lower() if email else (
            norm_identifier if "@" in norm_identifier else None
        )

        user_id = str(uuid.uuid4())
        farmer_id = generate_opaque_farmer_id()
        pw_hash, salt = hash_password(password)
        now = _now_iso()

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Insert user
            cursor.execute("""
                INSERT INTO users (id, identifier, phone, email, password_hash, salt, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, norm_identifier, norm_phone, norm_email, pw_hash, salt, now, now))

            # Insert profile
            cursor.execute("""
                INSERT INTO user_profiles (
                    id, farmer_id, full_name, phone_number, email, preferred_language,
                    state, district, sub_district, village, pincode, total_acreage, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                farmer_id,
                full_name.strip(),
                norm_phone,
                norm_email,
                preferred_language,
                state,
                district,
                sub_district,
                village,
                pincode,
                float(total_acreage or 0.0),
                now,
                now
            ))

            # Insert default settings
            cursor.execute("""
                INSERT INTO farmer_settings (
                    id, farmer_id, theme_preference, notification_sms, notification_push, notification_whatsapp,
                    preferred_distance_unit, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"sett-{user_id[:8]}",
                user_id,
                "light",
                0,
                1,
                0,
                "km",
                now,
                now
            ))

            conn.commit()

        return {
            "id": user_id,
            "farmer_id": farmer_id,
            "identifier": norm_identifier,
            "email": norm_email,
            "phone": norm_phone,
            "full_name": full_name,
        }

    def authenticate_user(self, raw_identifier: str, password: str) -> Optional[Dict[str, Any]]:
        user = self.get_user_by_identifier(raw_identifier)
        if not user:
            return None
        if not verify_password(password, user["password_hash"], user["salt"]):
            return None
        return user

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        allowed_fields = [
            "full_name", "phone_number", "email", "preferred_language",
            "state", "district", "sub_district", "village", "pincode", "total_acreage"
        ]
        set_clauses = []
        params = []
        for key in allowed_fields:
            if key in updates and updates[key] is not None:
                set_clauses.append(f"{key} = ?")
                params.append(updates[key])

        if not set_clauses:
            return self.get_user_profile(user_id)

        set_clauses.append("updated_at = ?")
        params.append(_now_iso())
        params.append(user_id)

        sql = f"UPDATE user_profiles SET {', '.join(set_clauses)} WHERE id = ?"
        with self._get_connection() as conn:
            conn.execute(sql, params)
            conn.commit()

        return self.get_user_profile(user_id)

    def get_farmer_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM farmer_settings WHERE farmer_id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                res = dict(row)
                res["notification_sms"] = bool(res["notification_sms"])
                res["notification_push"] = bool(res["notification_push"])
                res["notification_whatsapp"] = bool(res["notification_whatsapp"])
                return res
            return None

    def update_farmer_settings(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        allowed_fields = [
            "theme_preference", "notification_sms", "notification_push",
            "notification_whatsapp", "preferred_distance_unit"
        ]
        set_clauses = []
        params = []
        for key in allowed_fields:
            if key in updates and updates[key] is not None:
                val = updates[key]
                if isinstance(val, bool):
                    val = 1 if val else 0
                set_clauses.append(f"{key} = ?")
                params.append(val)

        if not set_clauses:
            return self.get_farmer_settings(user_id)

        set_clauses.append("updated_at = ?")
        params.append(_now_iso())
        params.append(user_id)

        sql = f"UPDATE farmer_settings SET {', '.join(set_clauses)} WHERE farmer_id = ?"
        with self._get_connection() as conn:
            conn.execute(sql, params)
            conn.commit()

        return self.get_farmer_settings(user_id)

    def create_otp(self, raw_identifier: str, purpose: str = "login", validity_minutes: int = 10) -> str:
        """Generates a secure 6-digit numeric OTP and stores it with an expiration timestamp."""
        import uuid
        from datetime import timedelta
        norm = normalize_identifier(raw_identifier)
        otp_code = str(secrets.randbelow(900000) + 100000)  # Cryptographic 6-digit number
        otp_id = str(uuid.uuid4())
        
        now_dt = datetime.now(timezone.utc)
        expires_dt = now_dt + timedelta(minutes=validity_minutes)
        now_str = now_dt.isoformat()
        expires_str = expires_dt.isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Invalidate any existing unused OTPs for the same identifier & purpose
            cursor.execute("""
                UPDATE otp_verifications
                SET is_used = 1
                WHERE identifier = ? AND purpose = ? AND is_used = 0
            """, (norm, purpose))

            cursor.execute("""
                INSERT INTO otp_verifications (id, identifier, otp_code, purpose, expires_at, attempts, is_used, created_at)
                VALUES (?, ?, ?, ?, ?, 0, 0, ?)
            """, (otp_id, norm, otp_code, purpose, expires_str, now_str))

            conn.commit()

        logger.info(f"Generated {purpose} OTP for {norm} (Expires at {expires_str})")
        return otp_code

    def verify_otp(self, raw_identifier: str, otp_code: str, purpose: str = "login") -> Tuple[bool, str]:
        """
        Verifies the provided 6-digit OTP code against the database.
        Returns (is_valid: bool, error_or_success_message: str).
        """
        norm = normalize_identifier(raw_identifier)
        clean_code = otp_code.strip()
        now_str = _now_iso()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM otp_verifications
                WHERE identifier = ? AND purpose = ? AND is_used = 0
                ORDER BY created_at DESC LIMIT 1
            """, (norm, purpose))
            row = cursor.fetchone()

            if not row:
                return False, "No active OTP found. Please request a new OTP code."

            record = dict(row)

            # Check expiration
            if record["expires_at"] < now_str:
                cursor.execute("UPDATE otp_verifications SET is_used = 1 WHERE id = ?", (record["id"],))
                conn.commit()
                return False, "This OTP has expired. Please request a fresh OTP."

            # Check maximum attempts (5 tries)
            if record["attempts"] >= 5:
                cursor.execute("UPDATE otp_verifications SET is_used = 1 WHERE id = ?", (record["id"],))
                conn.commit()
                return False, "Maximum attempts exceeded. Please request a new OTP."

            # Check OTP match
            if record["otp_code"] != clean_code:
                cursor.execute("""
                    UPDATE otp_verifications
                    SET attempts = attempts + 1
                    WHERE id = ?
                """, (record["id"],))
                conn.commit()
                remaining = 4 - record["attempts"]
                return False, f"Incorrect OTP code. {remaining} attempts remaining."

            # Success: Mark OTP as used
            cursor.execute("UPDATE otp_verifications SET is_used = 1 WHERE id = ?", (record["id"],))
            conn.commit()
            return True, "OTP verified successfully."

    def update_password(self, user_id: str, new_password: str) -> bool:
        """Updates the password hash and salt for a user."""
        pw_hash, salt = hash_password(new_password)
        now_str = _now_iso()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET password_hash = ?, salt = ?, updated_at = ?
                WHERE id = ?
            """, (pw_hash, salt, now_str, user_id))
            conn.commit()
            return cursor.rowcount > 0


# Global user database instance
user_db = UserDatabase()
