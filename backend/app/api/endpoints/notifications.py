from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user, get_optional_user
from app.models.schemas import (
    NotificationResponse,
    PriceAlertCreate,
    PriceAlertResponse,
    NotificationTypeEnum,
    PriceConditionEnum,
    SMSRequest,
    SMSResponse,
    SMSLogItem,
    WhatsAppRequest,
    WhatsAppResponse,
)
from app.services.mandi_service import VERIFIED_HISTORICAL_DATA, STANDARD_COMMODITIES, STANDARD_MARKETS
from app.services.sms_service import sms_service
from app.services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/notifications", tags=["Notifications & Price Alerts"])

# In-memory storage for development / testing
_NOTIFICATIONS_STORE: List[Dict[str, Any]] = [
    {
        "id": "notif-001",
        "farmer_id": "test-farmer-01",
        "title_en": "Onion Price Spike in Pimpalgaon Mandi",
        "title_hi": "पिंपलगांव मंडी में प्याज के भाव में तेजी",
        "title_mr": "पिंपळगाव बाजार समितीत कांद्याच्या दरात वाढ",
        "message_en": "Modal price reached ₹2,480/Quintal (+4.2% change today).",
        "message_hi": "मॉडल भाव आज ₹2,480/क्विंटल (+4.2%) पर पहुंच गया।",
        "message_mr": "आज सरासरी दर ₹2,480/क्विंटल (+4.2%) वर पोहोचला आहे.",
        "notification_type": NotificationTypeEnum.PRICE_ALERT,
        "is_read": False,
        "metadata": {"market_id": "m0010000-0000-0000-0000-000000000002", "commodity_code": "ONION"},
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "notif-002",
        "farmer_id": "test-farmer-01",
        "title_en": "Optimal Selling Window: Soybean",
        "title_hi": "सोयाबीन बेचने का अनुकूल समय",
        "title_mr": "सोयाबीन विक्रीसाठी योग्य वेळ",
        "message_en": "Net realization is highest at Indore Mandi after transport deductions.",
        "message_hi": "परिवहन खर्च घटाने के बाद इंदौर मंडी में शुद्ध लाभ सबसे अधिक है।",
        "message_mr": "वाहतूक खर्च वजा जाता इंदूर बाजारात सर्वाधिक निव्वळ परतावा मिळत आहे.",
        "notification_type": NotificationTypeEnum.RECOMMENDATION,
        "is_read": True,
        "metadata": {"commodity_code": "SOYBEAN"},
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "notif-003",
        "farmer_id": "test-farmer-01",
        "title_en": "Transit Weather Notice: Light Rain Expected",
        "title_hi": "परिवहन मौसम सूचना: हल्की बारिश की संभावना",
        "title_mr": "वाहतूक हवामान सूचना: हलक्या पावसाची शक्यता",
        "message_en": "Tarpaulin cover advised for produce in transit across Nashik route.",
        "message_hi": "नाशिक मार्ग पर उपज परिवहन के लिए तिरपाल ढकने की सलाह दी जाती है।",
        "message_mr": "नाशिक मार्गावरून शेतमाल वाहतुकीसाठी ताडपत्री वापरण्याचा सल्ला.",
        "notification_type": NotificationTypeEnum.WEATHER_ALERT,
        "is_read": False,
        "metadata": {"risk_level": "Moderate"},
        "created_at": datetime.now(timezone.utc),
    }
]

_ALERTS_STORE: List[Dict[str, Any]] = [
    {
        "id": "alert-init-01",
        "farmer_id": "test-farmer-01",
        "commodity_id": "c0010000-0000-0000-0000-000000000001", # Onion
        "market_id": "m0010000-0000-0000-0000-000000000001", # Lasalgaon
        "target_price": 2400.0,
        "condition": PriceConditionEnum.ABOVE,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
]


@router.get("", response_model=List[NotificationResponse], summary="Get farmer notification history")
async def list_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    f_id = current_user.get("id", "test-farmer-01")
    notifs = [
        n for n in _NOTIFICATIONS_STORE
        if n["farmer_id"] == f_id or n["farmer_id"] == "test-farmer-01"
    ]
    if unread_only:
        notifs = [n for n in notifs if not n["is_read"]]
    # Sort newest first
    return sorted(notifs, key=lambda x: x["created_at"], reverse=True)


@router.get("/unread-count", summary="Get count of unread notifications")
async def get_unread_count(current_user: Dict[str, Any] = Depends(get_current_user)):
    f_id = current_user.get("id", "test-farmer-01")
    unread = sum(
        1 for n in _NOTIFICATIONS_STORE
        if (n["farmer_id"] == f_id or n["farmer_id"] == "test-farmer-01") and not n["is_read"]
    )
    return {"unread_count": unread}


@router.patch("/{notification_id}/read", summary="Mark notification as read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    for n in _NOTIFICATIONS_STORE:
        if n["id"] == notification_id:
            n["is_read"] = True
            return {"message": "Notification marked as read", "id": notification_id}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@router.post("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(get_current_user)):
    f_id = current_user.get("id", "test-farmer-01")
    count = 0
    for n in _NOTIFICATIONS_STORE:
        if (n["farmer_id"] == f_id or n["farmer_id"] == "test-farmer-01") and not n["is_read"]:
            n["is_read"] = True
            count += 1
    return {"message": "All notifications marked as read", "marked_count": count}


@router.post("/alerts", response_model=PriceAlertResponse, status_code=status.HTTP_201_CREATED, summary="Create a price alert")
async def create_price_alert(
    alert_in: PriceAlertCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    alert_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    new_alert = {
        "id": alert_id,
        "farmer_id": current_user.get("id", "test-farmer-01"),
        "commodity_id": alert_in.commodity_id,
        "market_id": alert_in.market_id,
        "target_price": alert_in.target_price,
        "condition": alert_in.condition,
        "is_active": True,
        "created_at": now,
    }
    _ALERTS_STORE.append(new_alert)
    return new_alert


@router.get("/alerts", response_model=List[PriceAlertResponse], summary="List farmer's active price alerts")
async def list_price_alerts(current_user: Dict[str, Any] = Depends(get_current_user)):
    f_id = current_user.get("id", "test-farmer-01")
    return [a for a in _ALERTS_STORE if a["farmer_id"] == f_id or a["farmer_id"] == "test-farmer-01"]


@router.delete("/alerts/{alert_id}", summary="Delete / deactivate price alert")
async def delete_price_alert(
    alert_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    global _ALERTS_STORE
    f_id = current_user.get("id", "test-farmer-01")
    initial_len = len(_ALERTS_STORE)
    _ALERTS_STORE = [
        a for a in _ALERTS_STORE
        if not (a["id"] == alert_id and (a["farmer_id"] == f_id or a["farmer_id"] == "test-farmer-01"))
    ]
    if len(_ALERTS_STORE) == initial_len:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"message": "Price alert deleted successfully", "id": alert_id}


@router.post("/alerts/check", summary="Evaluate active alerts against current mandi modal prices")
async def check_and_evaluate_alerts(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Evaluates farmer price alerts against live mandi modal prices and dispatches notifications
    if triggers are satisfied.
    """
    f_id = current_user.get("id", "test-farmer-01")
    user_alerts = [a for a in _ALERTS_STORE if (a["farmer_id"] == f_id or a["farmer_id"] == "test-farmer-01") and a["is_active"]]
    triggered = []

    for alert in user_alerts:
        # Find price in verified data
        matching_obs = [
            o for o in VERIFIED_HISTORICAL_DATA
            if o["commodity_id"] == alert["commodity_id"]
            and (alert["market_id"] is None or o["market_id"] == alert["market_id"])
        ]
        if not matching_obs:
            continue

        latest_obs = matching_obs[0]
        modal = latest_obs["modal_price"]
        condition = alert["condition"]
        target = alert["target_price"]

        is_triggered = False
        if condition == PriceConditionEnum.ABOVE and modal >= target:
            is_triggered = True
        elif condition == PriceConditionEnum.BELOW and modal <= target:
            is_triggered = True

        if is_triggered:
            notif_id = f"notif-trigger-{uuid.uuid4().hex[:8]}"
            comm_name = latest_obs.get("commodity_name", "Produce")
            mandi_name = latest_obs.get("market_name", "Mandi")
            cond_text = "exceeded" if condition == PriceConditionEnum.ABOVE else "fallen below"

            new_notif = {
                "id": notif_id,
                "farmer_id": f_id,
                "title_en": f"Price Alert: {comm_name} at {mandi_name}",
                "title_hi": f"मूल्य अलर्ट: {mandi_name} में {comm_name} का भाव",
                "title_mr": f"किंमत अलर्ट: {mandi_name} येथे {comm_name} दर",
                "message_en": f"Mandi modal price of ₹{modal}/q has {cond_text} your alert target of ₹{target}/q.",
                "message_hi": f"मंडी मॉडल भाव ₹{modal}/क्विंटल आपके लक्ष्य ₹{target}/क्विंटल से मेल खा गया है।",
                "message_mr": f"बाजार समितीतील सरासरी दर ₹{modal}/क्विंटल आपल्या ₹{target}/क्विंटल लक्ष्यावर पोहोचला आहे.",
                "notification_type": NotificationTypeEnum.PRICE_ALERT,
                "is_read": False,
                "metadata": {
                    "alert_id": alert["id"],
                    "market_id": latest_obs["market_id"],
                    "commodity_id": alert["commodity_id"],
                    "modal_price": modal,
                    "target_price": target,
                },
                "created_at": datetime.now(timezone.utc),
            }
            _NOTIFICATIONS_STORE.insert(0, new_notif)
            triggered.append(new_notif)

    return {
        "status": "success",
        "evaluated_alerts_count": len(user_alerts),
        "triggered_count": len(triggered),
        "triggered_notifications": triggered,
    }


@router.post("/send-sms", response_model=SMSResponse, summary="Dispatch live SMS notification to farmer phone")
async def send_sms_notification(
    payload: SMSRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Sends authentic localized SMS notification in English, Hindi, or Marathi to the farmer's mobile phone.
    Works with Twilio, Fast2SMS, or KrishiSetu Live SMS Dispatcher.
    Allows guest farmers to receive SMS advisories directly.
    """
    farmer_id = current_user.get("id", "guest-farmer-01") if current_user else "guest-farmer-01"
    res = await sms_service.send_sms(
        phone_number=payload.phone_number,
        message_type=payload.message_type,
        language=payload.language,
        crop_name=payload.crop_name,
        market_name=payload.market_name,
        price=payload.price,
        custom_text=payload.custom_text,
        farmer_id=farmer_id,
    )
    return SMSResponse(
        success=True,
        message_id=res["id"],
        recipient_phone=res["phone_number"],
        message_body=res["message_body"],
        provider=res["provider"],
        delivery_status=res["delivery_status"],
        character_count=res["character_count"],
        dispatched_at=res["dispatched_at"],
    )


@router.get("/sms-history", response_model=List[SMSLogItem], summary="Get farmer dispatched SMS history")
async def get_sms_history(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """Retrieves all dispatched SMS messages sent to this farmer."""
    farmer_id = current_user.get("id", "guest-farmer-01") if current_user else "guest-farmer-01"
    return sms_service.list_recent_sms(farmer_id=farmer_id)


@router.post("/send-whatsapp", response_model=WhatsAppResponse, summary="Dispatch WhatsApp advisory message or generate 1-tap direct link")
async def send_whatsapp_advisory(
    payload: WhatsAppRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Dispatches rich WhatsApp advisory directly to farmer's handset.
    - Cloud API Mode: Sends via Meta WhatsApp Business Cloud API v20.0 when configured.
    - Direct Mode: Generates universal 1-tap WhatsApp deep link for instant delivery to +919529429605.
    """
    res = await whatsapp_service.send_whatsapp(
        phone_number=payload.phone_number,
        crop_name=payload.crop_name or "Onion",
        market_name=payload.market_name or "Pune APMC",
        price=payload.price or 3594.90,
        language=payload.language or "en",
        distance_km=payload.distance_km,
        custom_text=payload.custom_text,
    )
    return WhatsAppResponse(**res)

