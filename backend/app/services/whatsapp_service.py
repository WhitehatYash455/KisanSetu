import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    Official WhatsApp Cloud API & Direct Dispatch Service for Indian Farmers.
    - Cloud API: Sends background automated WhatsApp messages via Meta Graph API v20.0.
    - Direct Deep Linking: Generates instant 1-tap wa.me URLs for mobile handsets & WhatsApp Web.
    """

    def __init__(self):
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.graph_api_url = f"https://graph.facebook.com/v20.0/{self.phone_number_id}/messages" if self.phone_number_id else ""

    def clean_phone_number(self, phone: str) -> str:
        """Sanitizes phone number into international format without + or spaces (e.g. 919529429605)."""
        clean = "".join(ch for ch in phone if ch.isdigit())
        if len(clean) == 10:
            clean = "91" + clean
        return clean

    def generate_advisory_message(
        self,
        crop_name: str,
        market_name: str,
        price: float,
        language: str = "en",
        distance_km: Optional[float] = None,
        custom_text: Optional[str] = None
    ) -> str:
        """Builds structured WhatsApp message with bold formatting and emoji markers."""
        if custom_text:
            return f"🌾 *कृषीसेतू / KrishiSetu Advisory*\n\n{custom_text}"

        lang = language.lower()
        p = f"₹{price:,.2f}" if price else "₹---"
        dist_str = f" ({distance_km:.1f} km)" if distance_km else ""

        if lang == "mr":
            return (
                f"🌾 *कृषीसेतू बाजार सल्ला (KrishiSetu)*\n\n"
                f"📢 *सर्वोत्तम बाजार समिती शिफारस:*\n"
                f"• पीक: *{crop_name}*\n"
                f"• सर्वाधिक नफा देणारी मंडी: *{market_name}*{dist_str}\n"
                f"• अंदाजित निव्वळ परतावा: *{p} /क्विंटल*\n\n"
                f"✅ वाहतूक खर्च, हमाली व बाजार शुल्क वजा करून हा निव्वळ नफा काढण्यात आला आहे.\n\n"
                f"🔗 संपूर्ण अहवाल पहा: http://localhost:3000/recommendations"
            )
        elif lang == "hi":
            return (
                f"🌾 *कृषिसेतु मंडी सलाह (KrishiSetu)*\n\n"
                f"📢 *सर्वाधिक लाभकारी मंडी अनुशंसा:*\n"
                f"• फसल: *{crop_name}*\n"
                f"• श्रेष्ठ मंडी: *{market_name}*{dist_str}\n"
                f"• अनुमानित शुद्ध लाभ: *{p} /क्विंटल*\n\n"
                f"✅ परिवहन, मजदूरी व मंडी टैक्स घटाने के बाद यह शुद्ध लाभ निकाला गया है।\n\n"
                f"🔗 विवरण देखें: http://localhost:3000/recommendations"
            )
        else:
            return (
                f"🌾 *KrishiSetu Mandi Advisory*\n\n"
                f"📢 *Optimal Market Recommendation:*\n"
                f"• Commodity: *{crop_name}*\n"
                f"• Recommended APMC: *{market_name}*{dist_str}\n"
                f"• Net Take-Home Realization: *{p} /Quintal*\n\n"
                f"✅ Ranked after full deduction of freight transit, labor handling, and mandi cess.\n\n"
                f"🔗 Live Portal: http://localhost:3000/recommendations"
            )

    async def send_whatsapp(
        self,
        phone_number: str,
        crop_name: str = "Onion",
        market_name: str = "Pune APMC",
        price: float = 3594.90,
        language: str = "en",
        distance_km: Optional[float] = None,
        custom_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches WhatsApp message via Meta Cloud API if configured,
        and generates universal 1-tap WhatsApp deep link for immediate handset delivery.
        """
        clean_phone = self.clean_phone_number(phone_number)
        message_body = self.generate_advisory_message(
            crop_name=crop_name,
            market_name=market_name,
            price=price,
            language=language,
            distance_km=distance_km,
            custom_text=custom_text
        )

        message_id = f"WA-{uuid.uuid4().hex[:8].upper()}"
        provider_used = "WhatsApp Direct Protocol (1-Tap Delivery)"
        delivery_status = "READY_FOR_DELIVERY"
        direct_url = f"https://api.whatsapp.com/send/?phone={clean_phone}&text={httpx.URL('', params={'q': message_body}).query.decode('utf-8').replace('q=', '')}"

        # If Meta WhatsApp Cloud API credentials are provided, dispatch directly via HTTP
        if self.phone_number_id and self.access_token:
            try:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": clean_phone,
                    "type": "text",
                    "text": {
                        "preview_url": True,
                        "body": message_body
                    }
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(self.graph_api_url, json=payload, headers=headers)
                    if resp.status_code in [200, 201]:
                        data = resp.json()
                        message_id = data.get("messages", [{}])[0].get("id", message_id)
                        provider_used = "Meta WhatsApp Cloud API (v20.0)"
                        delivery_status = "SENT"
                        logger.info(f"Meta WhatsApp Cloud API delivered message {message_id} to {clean_phone}")
                    else:
                        logger.warning(f"Meta Cloud API response {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"WhatsApp Cloud API dispatch error: {e}")

        return {
            "success": True,
            "message_id": message_id,
            "recipient_phone": f"+{clean_phone}",
            "message_body": message_body,
            "provider": provider_used,
            "delivery_status": delivery_status,
            "direct_whatsapp_url": direct_url,
            "dispatched_at": datetime.now(timezone.utc),
        }


whatsapp_service = WhatsAppService()
