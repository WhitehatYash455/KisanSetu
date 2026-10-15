import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings
from app.core.security import get_current_user, create_access_token
from app.core.user_db import user_db, normalize_identifier
from app.services.sms_service import SMSService
from app.services.email_service import email_service
from app.models.schemas import (
    FarmerRegisterRequest,
    FarmerLoginRequest,
    AuthTokenResponse,
    AuthUserResponse,
    FarmerProfileResponse,
    OTPRequest,
    OTPLoginRequest,
    ResetPasswordRequest,
    OTPResponse,
)

sms_service = SMSService()


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication & Farmer Accounts"])


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new farmer account"
)
async def register_farmer(payload: FarmerRegisterRequest):
    """
    Registers a new farmer with full name, mobile number or email, password, and farm details.
    Secures password with salted PBKDF2 hashing, prevents duplicates, and returns a signed session token.
    """
    clean_identifier = normalize_identifier(payload.identifier)
    
    # Check duplicate identifier
    if user_db.check_identifier_exists(clean_identifier):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this mobile number or email already exists. Please log in instead."
        )

    # Check duplicate phone if explicitly provided
    if payload.phone_number:
        clean_phone = normalize_identifier(payload.phone_number)
        if clean_phone != clean_identifier and user_db.check_identifier_exists(clean_phone):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with mobile number {payload.phone_number} is already registered."
            )

    # Check duplicate email if explicitly provided
    if payload.email:
        clean_email = payload.email.strip().lower()
        if clean_email != clean_identifier and user_db.check_identifier_exists(clean_email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email {payload.email} is already registered."
            )

    # Verify Mobile OTP if provided
    if payload.otp_code:
        target_check = clean_phone if payload.phone_number else clean_identifier
        is_valid, err_msg = user_db.verify_otp(target_check, payload.otp_code, purpose="register")
        if not is_valid and clean_identifier != target_check:
            is_valid, err_msg = user_db.verify_otp(clean_identifier, payload.otp_code, purpose="register")
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mobile OTP verification failed: {err_msg}"
            )

    try:
        user_info = user_db.create_user(
            identifier=clean_identifier,
            password=payload.password,
            full_name=payload.full_name,
            phone_number=payload.phone_number,
            email=payload.email,
            preferred_language=payload.preferred_language.value if hasattr(payload.preferred_language, "value") else str(payload.preferred_language),
            state=payload.state or "Maharashtra",
            district=payload.district or "Nashik",
            sub_district=payload.sub_district,
            village=payload.village or "Lasalgaon",
            pincode=payload.pincode or "422306",
            total_acreage=payload.total_acreage or 0.0,
        )

        user_id = user_info["id"]
        profile_dict = user_db.get_user_profile(user_id)

        token = create_access_token({
            "sub": user_id,
            "email": user_info.get("email"),
            "phone": user_info.get("phone"),
            "farmer_id": user_info.get("farmer_id"),
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "message": "Farmer registered successfully. Welcome to KrishiSetu!",
            "user": {
                "id": user_id,
                "identifier": user_info["identifier"],
                "email": user_info.get("email"),
                "phone": user_info.get("phone"),
                "full_name": user_info["full_name"],
                "role": "authenticated",
            },
            "profile": profile_dict,
        }

    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not complete registration: {str(e)}"
        )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    summary="Sign in existing farmer with mobile/email and password"
)
async def login_farmer(payload: FarmerLoginRequest):
    """
    Authenticates registered farmers using mobile number or email and password.
    Returns access token, user metadata, and persistent farmer profile.
    """
    clean_identifier = normalize_identifier(payload.identifier)
    user_record = user_db.authenticate_user(clean_identifier, payload.password)
    
    if not user_record:
        # Check if the user exists but password didn't match vs user not found
        user_exists = user_db.check_identifier_exists(clean_identifier)
        if user_exists:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please verify your password and try again."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No account found with this mobile number or email. Please register first."
            )

    user_id = user_record["id"]
    profile_dict = user_db.get_user_profile(user_id)

    if not profile_dict:
        # Fallback profile creation if legacy account without profile
        from app.core.security import generate_opaque_farmer_id
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        profile_dict = {
            "id": user_id,
            "farmer_id": generate_opaque_farmer_id(),
            "full_name": user_record.get("email", "Farmer").split("@")[0].capitalize(),
            "phone_number": user_record.get("phone", "+919876543210"),
            "email": user_record.get("email"),
            "preferred_language": "en",
            "state": "Maharashtra",
            "district": "Nashik",
            "village": "Lasalgaon",
            "pincode": "422306",
            "total_acreage": 4.5,
            "created_at": now,
            "updated_at": now,
        }

    token = create_access_token({
        "sub": user_id,
        "email": user_record.get("email"),
        "phone": user_record.get("phone"),
        "farmer_id": profile_dict.get("farmer_id"),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": f"Welcome back, {profile_dict.get('full_name', 'Farmer')}!",
        "user": {
            "id": user_id,
            "identifier": user_record["identifier"],
            "email": user_record.get("email"),
            "phone": user_record.get("phone"),
            "full_name": profile_dict.get("full_name", "Farmer"),
            "role": "authenticated",
        },
        "profile": profile_dict,
    }


@router.get(
    "/me",
    summary="Get authenticated farmer details and verify token session"
)
async def get_current_session(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns current authenticated farmer user record and profile.
    Used for frontend session validation and automatic login restore.
    """
    user_id = current_user["id"]
    user_record = user_db.get_user_by_id(user_id)
    profile_dict = user_db.get_user_profile(user_id)
    settings_dict = user_db.get_farmer_settings(user_id)

    if not profile_dict:
        # Fallback if profile not created yet
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        profile_dict = {
            "id": user_id,
            "farmer_id": current_user.get("farmer_id", "AGRI-8N4K-3M9Q"),
            "full_name": (user_record.get("email") if user_record else current_user.get("email", "Farmer")).split("@")[0].capitalize(),
            "phone_number": user_record.get("phone") if user_record else "+919876543210",
            "email": user_record.get("email") if user_record else current_user.get("email"),
            "preferred_language": "en",
            "state": "Maharashtra",
            "district": "Nashik",
            "sub_district": "Niphad",
            "village": "Lasalgaon",
            "pincode": "422306",
            "total_acreage": 4.5,
            "created_at": now,
            "updated_at": now,
        }

    return {
        "user": {
            "id": user_id,
            "identifier": user_record.get("identifier") if user_record else profile_dict.get("phone_number"),
            "email": user_record.get("email") if user_record else current_user.get("email"),
            "phone": user_record.get("phone") if user_record else profile_dict.get("phone_number"),
            "full_name": profile_dict.get("full_name", "Farmer"),
            "role": current_user.get("role", "authenticated"),
        },
        "profile": profile_dict,
        "settings": settings_dict,
    }


@router.post("/logout", summary="Logout authenticated farmer")
async def logout_farmer():
    """Confirms session logout on the server."""
    return {"message": "Farmer session cleared successfully."}


@router.post(
    "/request-otp",
    response_model=OTPResponse,
    summary="Request 6-digit OTP for Mobile Login, Email Login, or Password Reset"
)
async def request_otp(payload: OTPRequest):
    """
    Dispatches a real 6-digit verification code to the farmer's registered mobile number and/or email.
    Supports real Email OTP (via SMTP) and real SMS OTP (via Twilio/Fast2SMS).
    """
    norm_identifier = normalize_identifier(payload.identifier)
    user_record = user_db.get_user_by_identifier(norm_identifier)

    # For login or forgot_password, account must exist
    if not user_record:
        if payload.purpose == "forgot_password":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered farmer account found with this mobile number or email."
            )
        elif payload.purpose == "login":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this mobile number or email. Please register first."
            )

    # Generate cryptographic 6-digit OTP in database with 10-minute expiry
    otp_code = user_db.create_otp(norm_identifier, purpose=payload.purpose, validity_minutes=10)
    logger.info(f"🔑 [REAL OTP GENERATED] Identifier: {norm_identifier} | Purpose: {payload.purpose} | Code: {otp_code}")

    # Determine recipient destinations
    target_email = None
    target_phone = None
    farmer_name = "Farmer"

    if user_record:
        profile = user_db.get_user_profile(user_record["id"])
        if profile and profile.get("full_name"):
            farmer_name = profile["full_name"]
        target_email = user_record.get("email")
        target_phone = user_record.get("phone")

    # If the user typed an email directly as the identifier
    if "@" in norm_identifier:
        target_email = norm_identifier
    # If the user typed a mobile number directly as the identifier
    elif not target_phone:
        target_phone = norm_identifier

    dispatched_destinations = []
    delivery_notes = []

    # 1. Real Email OTP Dispatch via SMTP
    if target_email:
        email_ok, email_msg = await email_service.send_otp_email(
            recipient_email=target_email,
            otp_code=otp_code,
            farmer_name=farmer_name,
            purpose=payload.purpose
        )
        if email_ok:
            # Mask email e.g. ram***@kisan.in
            user_part, domain = target_email.split("@", 1)
            masked_email = f"{user_part[:2]}***@{domain}" if len(user_part) > 2 else f"{user_part[0]}***@{domain}"
            dispatched_destinations.append(f"email ({masked_email})")
        else:
            delivery_notes.append(f"Email note: {email_msg}")

    # 2. Real SMS OTP Dispatch via Gateway (Twilio / Fast2SMS)
    if target_phone:
        sms_ok, sms_msg = await sms_service.send_otp_sms(
            phone_number=target_phone,
            otp_code=otp_code,
            purpose=payload.purpose
        )
        if sms_ok:
            clean_digits = "".join(filter(str.isdigit, target_phone))
            masked_phone = f"+91 {clean_digits[-10:-4]}****" if len(clean_digits) >= 10 else target_phone
            dispatched_destinations.append(f"mobile SMS ({masked_phone})")
        else:
            delivery_notes.append(f"SMS note: {sms_msg}")

        # Log to recent SMS activity store for audit
        try:
            sms_text = f"Your KrishiSetu verification code is {otp_code}. Valid for 10 minutes."
            await sms_service.send_sms(
                phone_number=target_phone,
                custom_text=sms_text,
                farmer_id=user_record["id"] if user_record else "anonymous"
            )
        except Exception as e:
            logger.debug(f"Audit log warning: {e}")

    # Build human-friendly message for the farmer
    if dispatched_destinations:
        dest_str = " and ".join(dispatched_destinations)
        display_message = f"Real verification code sent to your {dest_str}. Code is valid for 10 minutes."
    else:
        # Fallback when neither SMTP nor SMS gateway is yet configured in .env
        display_message = (
            f"Verification code generated for {norm_identifier}. "
            "Please check your server console or configure SMTP_USER & SMTP_PASSWORD in backend/.env for inbox delivery."
        )

    # Expose simulated_otp only if explicitly enabled in configuration
    simulated = otp_code if settings.ENABLE_OTP_SIMULATION else None

    return {
        "message": display_message,
        "identifier": norm_identifier,
        "purpose": payload.purpose,
        "expires_in_seconds": 600,
        "simulated_otp": simulated,
    }


@router.post(
    "/login-otp",
    response_model=AuthTokenResponse,
    summary="Log in using 6-digit Mobile OTP"
)
async def login_with_otp(payload: OTPLoginRequest):
    """
    Authenticates a farmer using their registered mobile number and 6-digit OTP code.
    Passwordless login designed specifically for ease of access for Indian farmers.
    """
    norm_identifier = normalize_identifier(payload.identifier)
    user_record = user_db.get_user_by_identifier(norm_identifier)

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this mobile number or email. Please register first."
        )

    # Verify OTP
    is_valid, err_msg = user_db.verify_otp(norm_identifier, payload.otp_code, purpose="login")
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    user_id = user_record["id"]
    profile_dict = user_db.get_user_profile(user_id)
    if not profile_dict:
        from app.core.security import generate_opaque_farmer_id
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        profile_dict = {
            "id": user_id,
            "farmer_id": generate_opaque_farmer_id(),
            "full_name": user_record.get("email", "Farmer").split("@")[0].capitalize(),
            "phone_number": user_record.get("phone", "+919876543210"),
            "email": user_record.get("email"),
            "preferred_language": "en",
            "state": "Maharashtra",
            "district": "Nashik",
            "village": "Lasalgaon",
            "pincode": "422306",
            "total_acreage": 4.5,
            "created_at": now,
            "updated_at": now,
        }

    token = create_access_token({
        "sub": user_id,
        "email": user_record.get("email"),
        "phone": user_record.get("phone"),
        "farmer_id": profile_dict.get("farmer_id"),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": f"OTP verified! Welcome back, {profile_dict.get('full_name', 'Farmer')}!",
        "user": {
            "id": user_id,
            "identifier": user_record["identifier"],
            "email": user_record.get("email"),
            "phone": user_record.get("phone"),
            "full_name": profile_dict.get("full_name", "Farmer"),
            "role": "authenticated",
        },
        "profile": profile_dict,
    }


@router.post(
    "/reset-password",
    response_model=AuthTokenResponse,
    summary="Reset forgotten password with verified OTP"
)
async def reset_password_with_otp(payload: ResetPasswordRequest):
    """
    Verifies 6-digit OTP and resets the farmer's account password.
    Returns session access token so the farmer is automatically logged in.
    """
    norm_identifier = normalize_identifier(payload.identifier)
    user_record = user_db.get_user_by_identifier(norm_identifier)

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this mobile number or email."
        )

    # Verify OTP
    is_valid, err_msg = user_db.verify_otp(norm_identifier, payload.otp_code, purpose="forgot_password")
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    # Update password in database
    user_id = user_record["id"]
    updated = user_db.update_password(user_id, payload.new_password)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password. Please try again."
        )

    profile_dict = user_db.get_user_profile(user_id) or {}
    token = create_access_token({
        "sub": user_id,
        "email": user_record.get("email"),
        "phone": user_record.get("phone"),
        "farmer_id": profile_dict.get("farmer_id"),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Password updated successfully! Welcome back to KrishiSetu.",
        "user": {
            "id": user_id,
            "identifier": user_record["identifier"],
            "email": user_record.get("email"),
            "phone": user_record.get("phone"),
            "full_name": profile_dict.get("full_name", "Farmer"),
            "role": "authenticated",
        },
        "profile": profile_dict,
    }

