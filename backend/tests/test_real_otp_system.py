import pytest
from httpx import AsyncClient
from app.core.user_db import user_db
from app.services.email_service import email_service
from app.services.sms_service import sms_service


@pytest.mark.asyncio
async def test_otp_generation_and_verification_lifecycle():
    """Tests the cryptographic OTP generation, attempt count, and usage invalidation."""
    test_identifier = "+919999988888"
    
    # 1. Create OTP
    code = user_db.create_otp(test_identifier, purpose="login", validity_minutes=10)
    assert len(code) == 6
    assert code.isdigit()

    # 2. Try wrong code - should fail with attempt warning
    valid, msg = user_db.verify_otp(test_identifier, "000000", purpose="login")
    assert valid is False
    assert "attempts remaining" in msg.lower() or "incorrect" in msg.lower()

    # 3. Verify with correct code
    valid, msg = user_db.verify_otp(test_identifier, code, purpose="login")
    assert valid is True
    assert "successfully" in msg.lower()

    # 4. Attempt re-use of consumed OTP
    valid_reuse, msg_reuse = user_db.verify_otp(test_identifier, code, purpose="login")
    assert valid_reuse is False
    assert "no active otp" in msg_reuse.lower()


@pytest.mark.asyncio
async def test_email_service_html_generation():
    """Tests that the email template contains security warnings and high-contrast OTP."""
    otp = "849201"
    html = email_service._build_otp_html(otp, "Ramesh Patil", "login")
    assert "KrishiSetu" in html
    assert otp in html
    assert "Ramesh Patil" in html
    assert "Valid for 10 Minutes" in html
    assert "Security Notice" in html


@pytest.mark.asyncio
async def test_request_otp_for_registered_farmer(async_client: AsyncClient):
    """Tests requesting an OTP for the default seeded farmer (+919876543210)."""
    resp = await async_client.post(
        "/api/v1/auth/request-otp",
        json={"identifier": "+919876543210", "purpose": "login"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert data["identifier"] == "+919876543210"
    assert data["purpose"] == "login"
    assert data["expires_in_seconds"] == 600
    # In real OTP mode, simulated_otp must not be leaked
    assert data["simulated_otp"] is None


@pytest.mark.asyncio
async def test_request_otp_for_email_identifier(async_client: AsyncClient):
    """Tests requesting an OTP by registered email address."""
    resp = await async_client.post(
        "/api/v1/auth/request-otp",
        json={"identifier": "ramesh.patil@kisan.in", "purpose": "login"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert data["identifier"] == "ramesh.patil@kisan.in"


@pytest.mark.asyncio
async def test_request_otp_nonexistent_farmer(async_client: AsyncClient):
    """Tests that requesting an OTP for an unknown account returns 404."""
    resp = await async_client.post(
        "/api/v1/auth/request-otp",
        json={"identifier": "+919111111111", "purpose": "login"}
    )
    assert resp.status_code == 404
    assert "no account found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_full_otp_login_flow(async_client: AsyncClient):
    """Tests end-to-end OTP generation and login verification."""
    identifier = "+919876543210"
    
    # 1. Request OTP
    req_resp = await async_client.post(
        "/api/v1/auth/request-otp",
        json={"identifier": identifier, "purpose": "login"}
    )
    assert req_resp.status_code == 200

    # 2. Retrieve generated code directly from user_db (simulating reading user inbox)
    with user_db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT otp_code FROM otp_verifications WHERE identifier = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 1",
            (identifier,)
        )
        row = cursor.fetchone()
        assert row is not None
        actual_code = row["otp_code"]

    # 3. Submit code to login-otp endpoint
    login_resp = await async_client.post(
        "/api/v1/auth/login-otp",
        json={"identifier": identifier, "otp_code": actual_code}
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["user"]["phone"] == identifier
