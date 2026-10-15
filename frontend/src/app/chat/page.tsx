"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import {
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  TrendingUp,
  Award,
  Volume2,
  VolumeX,
  Copy,
  Check,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Cpu,
  HelpCircle,
  Wheat,
  RotateCcw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'farmer' | 'advisor';
  message: string;
  timestamp: string;
  crop_name?: string;
  mandi_name?: string;
  metadata?: {
    action?: string;
    current_modal_price?: number;
    target_forecast?: number;
    net_realization?: number;
    confidence_pct?: number;
    insight?: string;
    [key: string]: unknown;
  };
  suggested_followups?: string[];
}

interface ChatHistoryPayload {
  messages: ChatMessage[];
  total_count: number;
  window_hours: number;
  server_time: string;
  oldest_timestamp?: string;
  newest_timestamp?: string;
}

const POPULAR_CROPS = [
  { id: "onion", name: "Onion (कांदा / प्याज)" },
  { id: "soybean", name: "Soybean (सोयाबीन)" },
  { id: "cotton", name: "Cotton (कापूस / कपास)" },
  { id: "wheat", name: "Wheat (गेहू)" },
  { id: "chana", name: "Chana / Gram (चना)" },
  { id: "tomato", name: "Tomato (टमाटर)" },
  { id: "potato", name: "Potato (आलू)" },
];

const POPULAR_MANDIS = [
  "Lasalgaon APMC",
  "Pimpalgaon Baswant APMC",
  "Indore Mandi (Choithram)",
  "Ujjain APMC",
  "Pune APMC (Gultekdi)",
  "Azadpur Mandi",
  "Akola Krishi Upaj Mandi"
];

export default function ChatPage() {
  const { t, language } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<string>('Onion');
  const [selectedMandi, setSelectedMandi] = useState<string>('Lasalgaon APMC');
  const [quantity, setQuantity] = useState<number>(50);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([
    "What is the 7-day price forecast for Onion at Lasalgaon?",
    "Where should I sell 50 quintals of Onion today for highest net profit?",
    "Compare net realization between Lasalgaon APMC and Pimpalgaon Baswant",
    "Will Soybean prices rise in Indore this week?",
    "How much transport and APMC cess will be deducted for 80 km transit?",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Fetch 24-Hour History on Mount
  useEffect(() => {
    let ignore = false;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await apiRequest<ChatHistoryPayload>('/chat/history');
        if (!ignore && res && Array.isArray(res.messages)) {
          setMessages(res.messages);
        }
      } catch {
        // Fallback default message if API unavailable
        if (!ignore && messages.length === 0) {
          setMessages([
            {
              id: 'init-1',
              sender: 'advisor',
              message: (
                "**🌾 KrishiSetu 24-Hour Market Advisory Active**\n\n" +
                "I am your AI Mandi Advisor with live APMC rates, hybrid ARIMA+LSTM price prediction, and net transit math.\n\n" +
                "Ask me any question about your crop prices, where to sell, or 7-day forecasts!"
              ),
              timestamp: new Date().toISOString(),
              crop_name: "Onion",
              mandi_name: "Lasalgaon APMC",
              suggested_followups: [
                "Where should I sell 50 quintals of Onion today?",
                "What is the 7-day price forecast for Onion?",
              ]
            }
          ]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchHistory();
    return () => { ignore = true; };
  }, []);

  // Send inquiry to backend AI
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    setInputMessage('');
    setSending(true);

    // Optimistic user bubble
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'farmer',
      message: text,
      timestamp: new Date().toISOString(),
      crop_name: selectedCrop,
      mandi_name: selectedMandi,
      suggested_followups: []
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await apiRequest<{
        status: string;
        response: ChatMessage;
        history: ChatHistoryPayload;
      }>('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          crop_name: selectedCrop,
          mandi_name: selectedMandi,
          quantity: quantity
        })
      });

      if (res && res.response) {
        setMessages((prev) => {
          // Replace temp with verified or append
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          if (res.history && Array.isArray(res.history.messages)) {
            return res.history.messages;
          }
          return [...filtered, tempUserMsg, res.response];
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reach Agri-Advisor service.';
      const errorMsgObj: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'advisor',
        message: `⚠️ **Notice**: ${errMsg}. Please ensure the backend is running on port 8000.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsgObj]);
    } finally {
      setSending(false);
    }
  };

  // Reset 24-hr Chat
  const handleResetChat = async () => {
    if (!window.confirm("Reset chat history to fresh 24-hour advisory briefing?")) return;
    try {
      setLoading(true);
      await apiRequest('/chat/history', { method: 'DELETE' });
      const refreshed = await apiRequest<ChatHistoryPayload>('/chat/history');
      if (refreshed && refreshed.messages) {
        setMessages(refreshed.messages);
      }
    } catch {
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text-to-Speech Voice synthesis
  const handleSpeak = (text: string, id: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown asterisks and hash symbols for audio
    const cleanAudioText = text.replace(/[*#`_]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanAudioText);
    utterance.rate = 0.95;
    utterance.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Format timestamp nicely
  const formatTimeAgo = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative overflow-hidden">
      {/* Subtle Luxury Ambient Glow */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#0D824D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-10 w-96 h-96 bg-[#C5A45D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      
      {/* =========================================================================
          TOP BANNER: 24-HOUR CHAT TITLE & CONTEXT SELECTORS
          ========================================================================= */}
      <div className="card-luxury rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D281D] text-[#C5A45D] border border-[#C5A45D]/40 flex items-center justify-center shadow-md shadow-[#0D281D]/20 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#123B2A] dark:text-[#F2F5F3] tracking-tight">
                  Last 24 Hours Agri-Advisory Chat
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#0D824D]/15 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#0D824D] animate-pulse" />
                  24h Live Window
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B756E] dark:text-[#96A69D] mt-1 font-light leading-relaxed">
                AI Mandi Intelligence synthesizing verified APMC rates, Hybrid ARIMA+LSTM predictions &amp; net transport margins.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Reset */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleResetChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] hover:bg-white dark:hover:bg-[#1E382B] text-[#202B24] dark:text-[#D1DCD5] transition cursor-pointer shadow-xs hover:border-[#0D824D]/40"
            title="Reset history to fresh 24h briefing"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#C5A45D]" />
            <span>Reset 24h Chat</span>
          </button>
          
          <Link
            href="/forecasts"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#0D824D]/10 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/25 hover:bg-[#0D824D]/20 transition"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Price Predictions</span>
          </Link>

          <Link
            href="/recommendations"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#0D281D] hover:bg-[#153e2e] text-white shadow-md shadow-[#0D281D]/20 transition border border-[#C5A45D]/40 hover:scale-[1.02]"
          >
            <Award className="w-3.5 h-3.5 text-[#C5A45D]" />
            <span>Market Decisions</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          ACTIVE CONTEXT SELECTOR BAR (Crop, Mandi, Quantity)
          ========================================================================= */}
      <div className="card-luxury p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-[#123B2A] dark:text-[#E8D8B0] flex items-center gap-1.5">
            <Wheat className="w-4 h-4 text-[#0D824D]" />
            Crop Context:
          </span>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-xl px-3 py-1.5 font-semibold text-[#202B24] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
          >
            {POPULAR_CROPS.map((c) => (
              <option key={c.id} value={c.name.split(' ')[0]} className="bg-white dark:bg-[#13241C]">
                {c.name}
              </option>
            ))}
          </select>

          <span className="font-bold text-[#123B2A] dark:text-[#E8D8B0] flex items-center gap-1.5 sm:ml-2">
            <MapPin className="w-4 h-4 text-[#0D824D]" />
            Mandi:
          </span>
          <select
            value={selectedMandi}
            onChange={(e) => setSelectedMandi(e.target.value)}
            className="bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-xl px-3 py-1.5 font-semibold text-[#202B24] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
          >
            {POPULAR_MANDIS.map((m) => (
              <option key={m} value={m} className="bg-white dark:bg-[#13241C]">
                {m}
              </option>
            ))}
          </select>

          <span className="font-bold text-[#123B2A] dark:text-[#E8D8B0] sm:ml-2">Quantity:</span>
          <input
            type="number"
            min="1"
            max="1000"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 50)}
            className="w-20 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-xl px-2.5 py-1.5 text-center font-bold text-[#202B24] dark:text-[#F2F5F3] focus:outline-none focus:ring-2 focus:ring-[#0D824D]"
          />
          <span className="text-[#6B756E] dark:text-[#96A69D] font-semibold">Quintals</span>
        </div>

        <div className="text-[11px] text-[#6B756E] dark:text-[#96A69D] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#0D824D]" />
          <span>Messages synced strictly from the last 24 hours</span>
        </div>
      </div>

      {/* =========================================================================
          MAIN CHAT CONTAINER
          ========================================================================= */}
      <div className="card-luxury rounded-3xl flex flex-col h-[650px] overflow-hidden shadow-xl">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-transparent to-[#FAF9F5]/40 dark:to-[#0D1B15]/40">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#0D824D] animate-spin" />
              <p className="text-sm font-semibold text-[#6B756E] dark:text-[#96A69D]">
                Syncing 24-hour agricultural advisory briefings...
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isFarmer = msg.sender === 'farmer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFarmer ? 'items-end' : 'items-start'} max-w-full`}
                >
                  <div className="flex items-end gap-2.5 max-w-[92%] sm:max-w-[80%]">
                    {!isFarmer && (
                      <div className="w-9 h-9 rounded-2xl bg-[#0D281D] text-[#C5A45D] border border-[#C5A45D]/40 flex items-center justify-center shrink-0 mb-1 shadow-md">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-4 sm:p-5 shadow-sm text-sm leading-relaxed transition-all rounded-3xl ${
                        isFarmer
                          ? 'bg-gradient-to-br from-[#0D281D] to-[#123B2A] text-white rounded-br-xs border border-[#C5A45D]/30 shadow-md'
                          : 'bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] border border-[#E3E8DF] dark:border-[#1E382B] rounded-bl-xs'
                      }`}
                    >
                      {/* Message Header (for Advisor) */}
                      {!isFarmer && (
                        <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-[#E3E8DF] dark:border-[#1E382B] text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-[#0D824D] dark:text-[#66A65C]">
                            <ShieldCheck className="w-4 h-4 text-[#0D824D]" />
                            <span>KrishiSetu Mandi Intelligence</span>
                          </div>

                          <div className="flex items-center gap-1 text-[#6B756E] dark:text-[#96A69D] text-[11px]">
                            <button
                              onClick={() => handleSpeak(msg.message, msg.id)}
                              className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
                              title="Voice speech readout"
                            >
                              {speakingId === msg.id ? (
                                <VolumeX className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5 text-[#0D824D]" />
                              )}
                            </button>

                            <button
                              onClick={() => handleCopy(msg.message, msg.id)}
                              className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
                              title="Copy advisory"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-[#0D824D]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#6B756E]" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Message Content (Formatted Markdown) */}
                      <div className="whitespace-pre-line space-y-2">
                        {msg.message}
                      </div>

                      {/* Timestamp Footer */}
                      <div
                        className={`text-[10px] mt-2 text-right ${
                          isFarmer ? 'text-[#C5A45D]' : 'text-[#6B756E] dark:text-[#96A69D]'
                        }`}
                      >
                        {formatTimeAgo(msg.timestamp)} • 24h Verified
                      </div>
                    </div>
                  </div>

                  {/* Suggested Follow-up Chips for Advisor Responses */}
                  {!isFarmer && msg.suggested_followups && msg.suggested_followups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-11 max-w-[85%]">
                      {msg.suggested_followups.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(chip)}
                          className="px-3 py-1 text-xs font-semibold rounded-full bg-[#FAF9F5] dark:bg-[#13241C] text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 hover:border-[#0D824D] hover:bg-[#0D824D]/10 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span>{chip}</span>
                          <ArrowRight className="w-3 h-3 opacity-70" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Sending Typing Indicator */}
          {sending && (
            <div className="flex items-end gap-2.5 max-w-[80%]">
              <div className="w-9 h-9 rounded-2xl bg-[#0D281D] text-[#C5A45D] border border-[#C5A45D]/40 flex items-center justify-center shrink-0 mb-1">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl p-4 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] text-xs text-[#6B756E] dark:text-[#96A69D] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0D824D] animate-ping" />
                <span>Consulting ML models &amp; mandi spot arrivals...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* =========================================================================
            QUICK PROMPTS CAROUSEL
            ========================================================================= */}
        <div className="px-4 py-2.5 bg-[#FAF9F5] dark:bg-[#102016] border-t border-b border-[#E3E8DF] dark:border-[#1E382B] overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[11px] font-bold text-[#6B756E] dark:text-[#96A69D] uppercase tracking-wider shrink-0">Quick Prompts:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="shrink-0 px-3.5 py-1 text-xs rounded-full bg-white dark:bg-[#152B1F] border border-[#E3E8DF] dark:border-[#1E382B] text-[#202B24] dark:text-[#F2F5F3] hover:border-[#0D824D] hover:text-[#0D824D] dark:hover:text-[#66A65C] transition cursor-pointer shadow-xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* =========================================================================
            INPUT COMPOSER
            ========================================================================= */}
        <div className="p-3 sm:p-4 bg-white dark:bg-[#0D1B15]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask anything about ${selectedCrop} prices, Lasalgaon vs Pimpalgaon profit, or 7-day forecast...`}
              disabled={sending}
              className="flex-1 bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] placeholder-[#6B756E] dark:placeholder-[#96A69D] px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] focus:outline-none focus:ring-2 focus:ring-[#0D824D] text-sm transition"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="px-6 py-3 rounded-2xl bg-[#0D281D] hover:bg-[#153e2e] disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-[#0D281D]/20 transition flex items-center gap-1.5 shrink-0 cursor-pointer border border-[#C5A45D]/40 hover:scale-[1.02]"
            >
              <span>Send</span>
              <Send className="w-4 h-4 text-[#C5A45D]" />
            </button>
          </form>
        </div>

      </div>

      {/* =========================================================================
          BOTTOM 3-PILLAR QUICK NAVIGATION CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/forecasts"
          className="group card-luxury p-5 rounded-2xl hover:border-[#0D824D]/50 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-[#0D824D] dark:text-[#66A65C] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span>Hybrid ARIMA + LSTM</span>
            </div>
            <div className="text-sm font-bold text-[#123B2A] dark:text-[#F2F5F3] mt-1">
              Farmer Price Prediction
            </div>
            <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-0.5 font-light">
              Multi-horizon 1, 3, 7, 15, 30 days forecasts with 90% confidence bands.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6B756E] group-hover:text-[#0D824D] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/recommendations"
          className="group card-luxury p-5 rounded-2xl hover:border-[#0D824D]/50 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-[#0D824D] dark:text-[#66A65C] flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span>GPS Net Profit Engine</span>
            </div>
            <div className="text-sm font-bold text-[#123B2A] dark:text-[#F2F5F3] mt-1">
              Market Recommendation
            </div>
            <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-0.5 font-light">
              Deducts transport, hamali, APMC cess to rank best mandis.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6B756E] group-hover:text-[#0D824D] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/calculator"
          className="group card-luxury p-5 rounded-2xl hover:border-[#0D824D]/50 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-[#0D824D] dark:text-[#66A65C] flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span>Selling Simulator</span>
            </div>
            <div className="text-sm font-bold text-[#123B2A] dark:text-[#F2F5F3] mt-1">
              Selling Profit Calculator
            </div>
            <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-0.5 font-light">
              Simulate ₹0.75/km/qtl freight, labor, and net pocket returns.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6B756E] group-hover:text-[#0D824D] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

    </div>
  );
}
