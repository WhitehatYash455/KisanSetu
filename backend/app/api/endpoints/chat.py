from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field

from app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["24-Hour AI Agri-Advisor Chat"])


class ChatSendRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Farmer inquiry or question")
    crop_name: Optional[str] = Field(None, description="Optional crop/commodity context (e.g. Onion, Soybean)")
    mandi_name: Optional[str] = Field(None, description="Optional APMC Mandi context (e.g. Lasalgaon APMC)")
    quantity: Optional[float] = Field(50.0, description="Produce quantity in quintals")


class QuickPromptItem(BaseModel):
    id: str
    category: str
    prompt: str
    crop: Optional[str] = None


@router.get("/history", summary="Fetch Agri-Advisor chat history from the last 24 hours")
async def get_chat_history():
    """
    Returns all agricultural advisory messages exchanged in the last 24 hours.
    Automatically filters out older records to ensure fresh real-time market relevance.
    """
    return chat_service.get_last_24h_history()


@router.post("/send", summary="Send question to 24-Hour Agri-Advisor AI")
async def send_chat_message(request: ChatSendRequest):
    """
    Sends a question to the KrishiSetu AI advisor.
    The advisor synthesizes live APMC modal prices, Hybrid ARIMA+LSTM price predictions,
    and road transit net-profit realizations to deliver immediate actionable guidance.
    """
    clean_msg = request.message.strip()
    if not clean_msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    advisor_response = chat_service.post_user_message(
        message=clean_msg,
        crop_name=request.crop_name,
        mandi_name=request.mandi_name,
        quantity=request.quantity or 50.0
    )

    # Return advisor response along with updated last 24h history snapshot
    history_snapshot = chat_service.get_last_24h_history()

    return {
        "status": "success",
        "response": advisor_response,
        "history": history_snapshot
    }


@router.delete("/history", summary="Reset/Clear chat history and load fresh 24h briefing")
async def clear_chat_history():
    """
    Clears current chat messages and reloads the official 24-hour advisory briefing.
    """
    return chat_service.clear_history()


@router.get("/quick-prompts", summary="Get curated quick prompts for farmers")
async def get_quick_prompts():
    """
    Returns popular one-tap prompts farmers use to get instant market intelligence.
    """
    prompts = [
        {
            "id": "p1",
            "category": "Price Forecast",
            "prompt": "What is the 7-day price forecast for Onion at Lasalgaon?",
            "crop": "Onion"
        },
        {
            "id": "p2",
            "category": "Market Recommendation",
            "prompt": "Where should I sell 50 quintals of Onion today for maximum profit?",
            "crop": "Onion"
        },
        {
            "id": "p3",
            "category": "Mandi Comparison",
            "prompt": "Compare net realization between Lasalgaon APMC and Pimpalgaon Baswant.",
            "crop": "Onion"
        },
        {
            "id": "p4",
            "category": "Price Forecast",
            "prompt": "Will Soybean prices rise in Indore this week?",
            "crop": "Soybean"
        },
        {
            "id": "p5",
            "category": "Logistics & Deductions",
            "prompt": "How much transport and APMC cess will be deducted for 80 km transit?",
            "crop": "Onion"
        },
        {
            "id": "p6",
            "category": "Storage Decision",
            "prompt": "Should I store my harvest for 10 days or sell immediately?",
            "crop": "Onion"
        }
    ]
    return {"quick_prompts": prompts}
