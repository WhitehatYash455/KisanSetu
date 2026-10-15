"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import {
  Compass,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Calendar,
  Warehouse,
  Volume2,
  MessageSquare,
  X,
  LocateFixed,
  Award
} from 'lucide-react';
import { useGeolocation } from '@/lib/use-geolocation';

interface MandiRankingItem {
  market_id: string;
  market_name: string;
  market_district: string;
  distance_km: number;
  modal_price: number;
  gross_revenue: number;
  transport_cost: number;
  handling_cost: number;
  market_cess: number;
  net_realization: number;
  net_realization_per_quintal: number;
  rank: number;
  source: string;
}

interface RecommendationResponse {
  crop_name: string;
  quantity_quintals: number;
  recommended_action: 'SELL' | 'WAIT' | 'PARTIAL_SELL';
  confidence_pct: number;
  horizon_days: number;
  rationale_summary: string;
  detailed_factors: string[];
  recommended_mandi_id: string;
  recommended_mandi_name: string;
  expected_net_realization: number;
  expected_gross_revenue: number;
  total_logistics_deductions: number;
  net_realization_per_quintal: number;
  mandi_rankings: MandiRankingItem[];
  suggested_action_steps: string[];
  data_freshness_status: string;
}

interface CommodityOption {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
  name_mr: string;
  standard_unit: string;
}

export default function RecommendationsPage() {
  const { language, t } = useLanguage();

  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>('c0010000-0000-0000-0000-000000000001'); // Onion default
  const [quantity, setQuantity] = useState<number>(45);
  const unit = 'QUINTAL';
  const [storageDays, setStorageDays] = useState<number>(7);
  const [lat, setLat] = useState<number>(20.0063); // Nashik farm
  const [lon, setLon] = useState<number>(73.7900);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live GPS Geolocation Hook with Auto-Request & District Presets
  const {
    latitude: liveLat,
    longitude: liveLon,
    accuracy: liveAccuracy,
    locationName: liveLocationName,
    isLive: isLiveLocation,
    loading: geoLoading,
    requestLiveLocation,
    selectDistrict,
    districts,
  } = useGeolocation(20.0063, 73.7900, true);

  const handleUseLiveLocation = () => {
    requestLiveLocation();
  };

  useEffect(() => {
    if (isLiveLocation) {
      queueMicrotask(() => {
        setLat(liveLat);
        setLon(liveLon);
      });
    }
  }, [isLiveLocation, liveLat, liveLon]);

  // Voice Readout state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // SMS Modal State
  const [showSmsModal, setShowSmsModal] = useState<boolean>(false);
  const [smsPhone, setSmsPhone] = useState<string>('+919876543210');
  const [smsSending, setSmsSending] = useState<boolean>(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

  // Web Speech API Voice synthesis
  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert('Audio voice readout is not supported in this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!recommendation) return;

    let speechText = '';
    let speechLang = 'en-IN';

    if (language === 'hi') {
      speechText = `अनुशंसा: ${recommendation.recommended_action === 'SELL' ? 'तुरंत बेचें' : recommendation.recommended_action === 'WAIT' ? 'भाव बढ़ने की प्रतीक्षा करें' : 'आंशिक बिक्री करें'}। सबसे लाभकारी मंडी ${recommendation.recommended_mandi_name} है। शुद्ध लाभ प्रति क्विंटल ₹${recommendation.net_realization_per_quintal.toFixed(0)} रहने का अनुमान है।`;
      speechLang = 'hi-IN';
    } else if (language === 'mr') {
      speechText = `शिफारस: ${recommendation.recommended_action === 'SELL' ? 'त्वरित विक्री करा' : recommendation.recommended_action === 'WAIT' ? 'थांबा, भाव वाढण्याची वाट पहा' : 'हप्त्यांमध्ये विका'}। सर्वोत्तम बाजार समिती ${recommendation.recommended_mandi_name} आहे. निव्वळ नफा प्रति क्विंटल ₹${recommendation.net_realization_per_quintal.toFixed(0)} मिळेल.`;
      speechLang = 'mr-IN';
    } else {
      speechText = `Recommendation: ${recommendation.recommended_action}. Best market is ${recommendation.recommended_mandi_name} with net farm-gate profit of ₹${recommendation.net_realization_per_quintal.toFixed(0)} per quintal.`;
      speechLang = 'en-IN';
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = speechLang;
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Dispatch SMS
  const handleSendSMS = async () => {
    if (!smsPhone || smsPhone.length < 10 || !recommendation) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSmsSending(true);
    setSmsStatus(null);
    try {
      const res = await apiRequest<{ success: boolean; message_id: string; provider: string }>(
        '/notifications/send-sms',
        {
          method: 'POST',
          body: JSON.stringify({
            phone_number: smsPhone,
            message_type: 'RECOMMENDATION',
            language: language || 'en',
            crop_name: recommendation.crop_name,
            market_name: recommendation.recommended_mandi_name,
            price: recommendation.net_realization_per_quintal,
          })
        }
      );
      if (res.success) {
        setSmsStatus(`SMS Dispatched! (Ref: ${res.message_id} via ${res.provider})`);
        setTimeout(() => {
          setShowSmsModal(false);
          setSmsStatus(null);
        }, 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'SMS dispatch failed.';
      setSmsStatus(`Error: ${msg}`);
    } finally {
      setSmsSending(false);
    }
  };

  // Dispatch WhatsApp Cloud API
  const [waSending, setWaSending] = useState(false);
  const handleSendWhatsAppCloud = async () => {
    if (!smsPhone || smsPhone.length < 10 || !recommendation) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setWaSending(true);
    setSmsStatus(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        message_id: string;
        provider: string;
        delivery_status: string;
        direct_whatsapp_url: string;
      }>('/notifications/send-whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: smsPhone,
          language: language || 'en',
          crop_name: recommendation.crop_name,
          market_name: recommendation.recommended_mandi_name,
          price: recommendation.net_realization_per_quintal,
          distance_km: recommendation.mandi_rankings?.[0]?.distance_km,
        })
      });
      if (res.success) {
        setSmsStatus(`WhatsApp Dispatched! Ref: ${res.message_id} (${res.provider})`);
        if (res.direct_whatsapp_url) {
          window.open(res.direct_whatsapp_url, '_blank');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'WhatsApp dispatch failed.';
      setSmsStatus(`Error: ${msg}`);
    } finally {
      setWaSending(false);
    }
  };

  // Load commodities
  useEffect(() => {
    async function loadCommodities() {
      try {
        const res = await apiRequest<CommodityOption[]>('/markets/commodities');
        setCommodities(res);
      } catch (err) {
        console.error('Error fetching commodities:', err);
      }
    }
    loadCommodities();
  }, []);

  // Fetch recommendation
  useEffect(() => {
    let ignore = false;
    const loadRecommendation = async () => {
      try {
        const res = await apiRequest<RecommendationResponse>('/recommendations', {
          method: 'POST',
          body: JSON.stringify({
            commodity_id: selectedCommodityId,
            quantity: quantity,
            unit: unit,
            farmer_latitude: lat,
            farmer_longitude: lon,
            potential_storage_days: storageDays
          })
        });
        if (!ignore) {
          setRecommendation(res);
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Recommendation fetch error:', err);
          setErrorMsg(t('noDataAvailable'));
          setRecommendation(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRecommendation();
    return () => {
      ignore = true;
    };
  }, [selectedCommodityId, quantity, unit, lat, lon, storageDays, t]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<RecommendationResponse>('/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          commodity_id: selectedCommodityId,
          quantity: quantity,
          unit: unit,
          farmer_latitude: lat,
          farmer_longitude: lon,
          potential_storage_days: storageDays
        })
      });
      setRecommendation(res);
      setErrorMsg(null);
    } catch (err: unknown) {
      console.error('Recommendation fetch error:', err);
      setErrorMsg(t('noDataAvailable'));
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  const getCommodityName = (c: CommodityOption) => {
    if (language === 'hi') return c.name_hi;
    if (language === 'mr') return c.name_mr;
    return c.name_en;
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-8 relative overflow-hidden">
      {/* Subtle Luxury Ambient Glow */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#0D824D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-10 w-96 h-96 bg-[#C5A45D]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E3E8DF] dark:border-[#1E382B] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#123B2A]/10 dark:bg-[#C5A45D]/15 text-[#123B2A] dark:text-[#E8D8B0] border border-[#C5A45D]/40 shadow-xs mb-2">
              <Compass className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span className="font-medium tracking-wide">{t('sellingAdvisor')} • Decision Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3] tracking-tight">
              {language === 'hi' ? 'स्मार्ट बिक्री सलाहकार एवं मंडी अनुशंसा' : language === 'mr' ? 'स्मार्ट विक्री सल्लागार व बाजार शिफारस' : 'Smart Selling Advisor & Mandi Decision Engine'}
            </h1>
            <p className="mt-1.5 text-[#6B756E] dark:text-[#96A69D] text-sm max-w-2xl leading-relaxed font-light">
              {language === 'hi'
                ? 'परिवहन खर्च, मंडी शुल्क, भंडारण व्यय और आगामी मूल्य रुझान के आधार पर शुद्ध लाभ की सटीक गणना।'
                : language === 'mr'
                ? 'वाहतूक खर्च, बाजार उपकर, साठवणूक खर्च व भविष्यातील भाव कल तपासून सर्वोत्तम निव्वळ नफा ठरवा.'
                : 'Evaluates upcoming price forecasts against logistics, loading, and holding costs to maximize your Net Pocket Realization.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={handleReadAloud}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border ${
                isSpeaking
                  ? 'bg-[#D97706] text-white border-[#D97706] animate-pulse'
                  : 'bg-white dark:bg-[#14271E] border-[#E3E8DF] dark:border-[#1E382B] text-[#123B2A] dark:text-[#F2F5F3] hover:border-[#0D824D]'
              }`}
            >
              <Volume2 className="w-4 h-4 text-[#C5A45D]" />
              <span>{isSpeaking ? 'Stop Audio' : '🔊 Listen Advice'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSmsModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D281D] hover:bg-[#153e2e] text-white shadow-md shadow-[#0D281D]/20 transition cursor-pointer border border-[#C5A45D]/40 hover:scale-[1.02]"
            >
              <MessageSquare className="w-4 h-4 text-[#C5A45D]" />
              <span>📲 SMS Recommendation</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] hover:border-[#0D824D] text-[#123B2A] dark:text-[#F2F5F3] text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0D824D] ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Evaluating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Input Parameters Controls */}
        <div className="card-luxury rounded-3xl p-6 sm:p-8 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#123B2A] dark:text-[#C5A45D] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C5A45D]" />
            <span>Advisory Parameters</span>
          </h2>
          
          {/* Active Farm Location Calibration Banner */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 text-[#123B2A] dark:text-[#F2F5F3]">
              <LocateFixed className={`w-4 h-4 shrink-0 ${geoLoading ? 'animate-spin text-[#0D824D]' : 'text-[#0D824D] dark:text-[#66A65C]'}`} />
              <div>
                <span className="font-bold">Recommendation Calibrated For: </span>
                <span className="font-semibold text-[#0D824D] dark:text-[#66A65C]">{liveLocationName}</span>
                <span className="text-[#6B756E] dark:text-[#96A69D] ml-1">({lat.toFixed(2)}°N, {lon.toFixed(2)}°E)</span>
                <p className="text-[11px] text-[#6B756E] dark:text-[#96A69D] mt-0.5">
                  Mandi rankings and freight deductions are calculated dynamically from this exact farm location.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) selectDistrict(e.target.value);
                }}
                className="px-3.5 py-2 rounded-xl border border-[#E3E8DF] dark:border-[#1E382B] bg-white dark:bg-[#14271E] text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
              >
                <option value="" disabled>Change Farm District...</option>
                {districts.map(d => (
                  <option key={d.name} value={d.name}>{d.name} ({d.state})</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleUseLiveLocation}
                disabled={geoLoading}
                className="px-3.5 py-2 rounded-xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer border border-[#C5A45D]/40"
                title="Detect live GPS farm location"
              >
                <LocateFixed className={`w-3.5 h-3.5 text-[#C5A45D] ${geoLoading ? 'animate-spin' : ''}`} />
                <span>{geoLoading ? 'Locating...' : 'Auto GPS'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Commodity Selector */}
            <div>
              <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                {language === 'hi' ? 'फसल चुनें' : language === 'mr' ? 'पीक निवडा' : 'Crop / Commodity'}
              </label>
              <select
                value={selectedCommodityId}
                onChange={(e) => setSelectedCommodityId(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D] outline-none cursor-pointer font-medium"
              >
                {commodities.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-[#13241C]">
                    {getCommodityName(c)} ({c.standard_unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                {language === 'hi' ? 'मात्रा (क्विंटल)' : language === 'mr' ? 'प्रमाण (क्विंटल)' : 'Harvest Volume (Quintals)'}
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D] outline-none font-semibold"
              />
            </div>

            {/* Potential Storage Days */}
            <div>
              <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                {language === 'hi' ? 'भंडारण अवधि (दिन)' : language === 'mr' ? 'साठवणूक कालावधी (दिवस)' : 'Potential Holding (Days)'}
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={storageDays}
                onChange={(e) => setStorageDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D] outline-none font-semibold"
              />
            </div>

            {/* Farm Location (Lat, Lon) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3]">
                  {language === 'hi' ? 'खेत का स्थान' : language === 'mr' ? 'शेताचे स्थान' : 'Farm Coordinates'}
                </label>
                <button
                  type="button"
                  onClick={handleUseLiveLocation}
                  disabled={geoLoading}
                  className={`text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    isLiveLocation
                      ? 'text-[#0D824D] dark:text-[#66A65C]'
                      : 'text-[#6B756E] hover:text-[#123B2A]'
                  }`}
                  title="Auto-detect current GPS field coordinates"
                >
                  <LocateFixed className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
                  <span>{geoLoading ? 'GPS...' : isLiveLocation ? `🟢 Live (±${liveAccuracy || 10}m)` : '📍 GPS'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-3.5 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-xs font-mono outline-none focus:ring-2 focus:ring-[#0D824D]"
                  placeholder="Lat"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-3.5 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-xs font-mono outline-none focus:ring-2 focus:ring-[#0D824D]"
                  placeholder="Lon"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Fallback */}
        {errorMsg && (
          <div className="p-6 rounded-3xl card-luxury border border-[#D97706]/40 flex items-start gap-3 text-[#202B24] dark:text-[#F2F5F3]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#D97706]" />
            <div>
              <h3 className="font-bold text-base">{t('noDataAvailable')}</h3>
              <p className="text-sm mt-1 text-[#6B756E] dark:text-[#96A69D]">
                Unable to synthesize verified market pricing for this commodity. Our non-fabrication policy guarantees that market estimates are never artificially generated.
              </p>
            </div>
          </div>
        )}

        {/* Recommendation Results */}
        {recommendation && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Primary Action Card Banner */}
            <div className={`p-6 sm:p-8 rounded-3xl card-luxury shadow-xl transition-all border-l-8 ${
              recommendation.recommended_action === 'SELL'
                ? 'border-l-[#0D824D] border-[#0D824D]/30'
                : recommendation.recommended_action === 'WAIT'
                ? 'border-l-[#D97706] border-[#D97706]/30'
                : 'border-l-[#0D281D] border-[#0D281D]/30'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-sm ${
                      recommendation.recommended_action === 'SELL'
                        ? 'bg-[#0D281D] text-[#C5A45D] border border-[#C5A45D]/40'
                        : recommendation.recommended_action === 'WAIT'
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[#0D824D] text-white'
                    }`}>
                      {recommendation.recommended_action === 'SELL' ? t('sellNow') : recommendation.recommended_action === 'WAIT' ? t('wait') : t('partialSell')}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF9F5] dark:bg-[#13241C] text-[#123B2A] dark:text-[#C5A45D] border border-[#E3E8DF] dark:border-[#1E382B]">
                      {recommendation.confidence_pct}% Confidence Score
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3] mt-3 leading-snug">
                    {recommendation.rationale_summary}
                  </h2>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-[#6B756E] dark:text-[#96A69D] mt-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#C5A45D]" />
                      <span>Best Mandi: <strong className="text-[#123B2A] dark:text-[#F2F5F3]">{recommendation.recommended_mandi_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#C5A45D]" />
                      <span>Horizon: <strong className="text-[#123B2A] dark:text-[#F2F5F3]">{recommendation.horizon_days} Days</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="w-4 h-4 text-[#C5A45D]" />
                      <span>Volume: <strong className="text-[#123B2A] dark:text-[#F2F5F3]">{recommendation.quantity_quintals} Quintals</strong></span>
                    </div>
                  </div>
                </div>

                {/* Big Net Realization Number */}
                <div className="bg-gradient-to-br from-[#0D281D] to-[#123B2A] text-white rounded-3xl p-6 sm:p-7 border border-[#C5A45D]/40 shadow-xl min-w-[280px] text-right">
                  <div className="text-xs uppercase font-bold text-[#E8D8B0] tracking-wider">
                    {t('netRealization')}
                  </div>
                  <div className="text-3xl sm:text-5xl font-black text-white mt-1">
                    ₹{recommendation.expected_net_realization.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs font-bold text-emerald-300 mt-1">
                    ₹{recommendation.net_realization_per_quintal.toFixed(1)} / Quintal (in hand)
                  </div>
                  <div className="text-[11px] text-[#A3B8AD] mt-3 pt-3 border-t border-white/15">
                    Gross: ₹{recommendation.expected_gross_revenue.toLocaleString('en-IN')} • Deductions: ₹{recommendation.total_logistics_deductions.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Contributing Factors */}
              <div className="mt-6 pt-6 border-t border-[#E3E8DF] dark:border-[#1E382B]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#123B2A] dark:text-[#C5A45D] mb-3">
                  Key Economic &amp; Agronomic Drivers:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendation.detailed_factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[#202B24] dark:text-[#D1DCD5] bg-[#FAF9F5] dark:bg-[#13241C] p-4 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] hover:border-[#0D824D]/30 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-[#0D824D] dark:text-[#66A65C] shrink-0 mt-0.5" />
                      <span className="font-medium">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mandi Net Realization Ranking Table */}
            <div className="card-luxury rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#E3E8DF] dark:border-[#1E382B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-[#123B2A] dark:text-[#F2F5F3] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#C5A45D]" />
                    <span>Mandi Profit Comparison Matrix</span>
                  </h3>
                  <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-0.5 font-light">
                    Ranked by final cash realization after geodesic freight, market fee, and labor loading
                  </p>
                </div>
                <div className="text-xs text-[#123B2A] dark:text-[#E8D8B0] font-semibold px-3.5 py-1.5 rounded-full bg-[#C5A45D]/15 border border-[#C5A45D]/30">
                  Freight Model: ₹0.75/km/q • Cess: 1.5% • Loading: ₹15/q
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAF9F5] dark:bg-[#13241C] text-[#6B756E] dark:text-[#96A69D] text-xs uppercase font-bold border-b border-[#E3E8DF] dark:border-[#1E382B]">
                    <tr>
                      <th className="py-3.5 px-4">Rank</th>
                      <th className="py-3.5 px-4">Mandi &amp; District</th>
                      <th className="py-3.5 px-4">Distance</th>
                      <th className="py-3.5 px-4">Modal Price</th>
                      <th className="py-3.5 px-4">Gross Revenue</th>
                      <th className="py-3.5 px-4">Transport</th>
                      <th className="py-3.5 px-4">Fees &amp; Labor</th>
                      <th className="py-3.5 px-4 font-bold text-[#0D824D] dark:text-[#66A65C]">Net Realization</th>
                      <th className="py-3.5 px-4">Net / Quintal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8DF] dark:divide-[#1E382B]">
                    {recommendation.mandi_rankings.map((m) => (
                      <tr
                        key={m.market_id}
                        className={`transition hover:bg-[#FAF9F5]/70 dark:hover:bg-[#13241C]/70 ${
                          m.rank === 1 ? 'bg-[#C5A45D]/10 dark:bg-[#C5A45D]/10 font-medium' : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          {m.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0D281D] text-[#C5A45D] text-xs font-bold shadow-sm border border-[#C5A45D]/40">
                              1
                            </span>
                          ) : (
                            <span className="text-[#6B756E] font-medium ml-2">#{m.rank}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-bold text-[#123B2A] dark:text-[#F2F5F3]">
                          <div className="flex items-center gap-1.5">
                            <span>{m.market_name}</span>
                            {m.rank === 1 && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D824D]/15 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30">
                                Best
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#6B756E] dark:text-[#96A69D] font-normal">{m.market_district}</div>
                        </td>
                        <td className="py-4 px-4 text-[#6B756E] dark:text-[#96A69D] font-mono">
                          {m.distance_km} km
                        </td>
                        <td className="py-4 px-4 text-[#202B24] dark:text-[#F2F5F3] font-semibold">
                          ₹{m.modal_price}
                        </td>
                        <td className="py-4 px-4 text-[#6B756E] dark:text-[#96A69D]">
                          ₹{m.gross_revenue.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-[#DC2626] font-medium">
                          -₹{m.transport_cost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-[#6B756E] dark:text-[#96A69D]">
                          -₹{(m.handling_cost + m.market_cess).toFixed(0)}
                        </td>
                        <td className="py-4 px-4 font-black text-[#0D824D] dark:text-[#66A65C] text-sm">
                          ₹{m.net_realization.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 font-bold text-[#123B2A] dark:text-[#C5A45D]">
                          ₹{m.net_realization_per_quintal.toFixed(1)}/q
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actionable Steps & Dispatch Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Checklist */}
              <div className="card-luxury rounded-3xl p-6 sm:p-8 space-y-4">
                <h3 className="text-base font-bold text-[#123B2A] dark:text-[#F2F5F3] flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0D824D]" />
                  <span>Farmer Dispatch Action Checklist</span>
                </h3>
                <div className="space-y-3">
                  {recommendation.suggested_action_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B]">
                      <div className="w-6 h-6 rounded-full bg-[#0D281D] text-[#C5A45D] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#C5A45D]/40">
                        {idx + 1}
                      </div>
                      <p className="text-xs font-medium text-[#202B24] dark:text-[#D1DCD5] leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Economic Disclosure & Transparency */}
              <div className="card-luxury rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#123B2A] dark:text-[#F2F5F3] flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-[#C5A45D]" />
                    <span>Calculation &amp; Policy Transparency</span>
                  </h3>
                  <div className="space-y-3 text-xs text-[#6B756E] dark:text-[#96A69D]">
                    <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B]">
                      <strong className="text-[#123B2A] dark:text-[#F2F5F3]">Net Realization Formula:</strong>
                      <div className="font-mono text-[#0D824D] dark:text-[#66A65C] mt-1 font-bold">
                        Net Realization = Gross Revenue - (Transport + Market Cess + Handling + Storage/Spoilage Loss)
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B]">
                      <strong className="text-[#123B2A] dark:text-[#F2F5F3]">Strict Non-Fabrication Guarantee:</strong>
                      <p className="mt-1 font-light leading-relaxed">
                        When reliable APMC mandi observations are absent, prices are never synthesized. We present verified arrivals and historical trends only.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E3E8DF] dark:border-[#1E382B] text-[11px] text-[#6B756E] dark:text-[#96A69D] flex items-center gap-1.5 font-light">
                  <Info className="w-4 h-4 shrink-0 text-[#C5A45D]" />
                  <span>{t('disclaimer')}</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SMS Dispatch Modal */}
        {showSmsModal && recommendation && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="card-luxury rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#C5A45D]/40 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#E3E8DF] dark:border-[#1E382B] pb-3">
                <div className="flex items-center space-x-2.5 text-[#123B2A] dark:text-[#F2F5F3] font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-[#0D824D]/10 text-[#0D824D] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span>Send Recommendation SMS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  className="p-1 rounded-lg text-[#6B756E] hover:text-[#123B2A] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#6B756E] dark:text-[#96A69D] leading-relaxed font-light">
                Dispatches actionable mandi advisory decision and net profit calculation directly to the farmer&apos;s handset via SMS gateway.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1">
                    Mobile Number (मोबाइल नंबर)
                  </label>
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm font-mono focus:ring-2 focus:ring-[#0D824D]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] text-xs space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#C5A45D]">Message Preview:</span>
                  <p className="text-[#202B24] dark:text-[#F2F5F3] italic leading-relaxed">
                    {language === 'mr'
                      ? `[कृषीसेतू निर्णय] ${recommendation.crop_name} विक्रीसाठी सर्वोत्तम बाजार: ${recommendation.recommended_mandi_name} (निव्वळ नफा: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/क्विंटल).`
                      : language === 'hi'
                      ? `[कृषिसेतु निर्णय] ${recommendation.crop_name} के लिए सबसे लाभकारी मंडी: ${recommendation.recommended_mandi_name} (शुद्ध लाभ: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/क्विंटल)।`
                      : `[KrishiSetu Decision] Optimal market for ${recommendation.crop_name} is ${recommendation.recommended_mandi_name} (Net Realization: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/Qtl).`}
                  </p>
                </div>

                {smsStatus && (
                  <div className={`p-3 rounded-2xl text-xs font-bold ${
                    smsStatus.startsWith('Error')
                      ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                      : 'bg-[#0D824D]/10 text-[#0D824D] border border-[#0D824D]/20'
                  }`}>
                    {smsStatus}
                  </div>
                )}
              </div>

              {/* Multichannel Direct Messaging Options */}
              <div className="pt-2 border-t border-[#E3E8DF] dark:border-[#1E382B] space-y-2">
                <span className="text-[11px] font-semibold text-[#6B756E] dark:text-[#96A69D]">Direct Handset Delivery Options:</span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${smsPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      language === 'mr'
                        ? `🌾 [कृषीसेतू सल्ला] ${recommendation.crop_name} विक्रीसाठी सर्वोत्तम बाजार: ${recommendation.recommended_mandi_name} (निव्वळ नफा: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/क्विंटल).\nतपशील: http://localhost:3000/recommendations`
                        : language === 'hi'
                        ? `🌾 [कृषिसेतु सलाह] ${recommendation.crop_name} के लिए सबसे लाभकारी मंडी: ${recommendation.recommended_mandi_name} (शुद्ध लाभ: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/क्विंटल)।\nविवरण: http://localhost:3000/recommendations`
                        : `🌾 [KrishiSetu Advisory] Optimal market for ${recommendation.crop_name} is ${recommendation.recommended_mandi_name} (Net Realization: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/Qtl).\nDetails: http://localhost:3000/recommendations`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0D824D]/10 hover:bg-[#0D824D]/20 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 transition"
                  >
                    <span>💬 WhatsApp Direct (1-Tap)</span>
                  </a>
                  <a
                    href={`sms:${smsPhone.replace(/\s+/g, '')}?body=${encodeURIComponent(
                      language === 'mr'
                        ? `[कृषीसेतू निर्णय] ${recommendation.crop_name} विक्रीसाठी सर्वोत्तम बाजार: ${recommendation.recommended_mandi_name} (निव्वळ नफा: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/क्विंटल).`
                        : language === 'hi'
                        ? `[कृषिसेतु निर्णय] ${recommendation.crop_name} के लिए सबसे लाभकारी मंडी: ${recommendation.recommended_mandi_name} (शुद्ध लाभ: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/क्विंटल)।`
                        : `[KrishiSetu Decision] Optimal market for ${recommendation.crop_name} is ${recommendation.recommended_mandi_name} (Net Realization: ₹${recommendation.net_realization_per_quintal.toFixed(0)}/Qtl).`
                    )}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0D281D]/10 hover:bg-[#0D281D]/20 text-[#0D281D] dark:text-[#E8D8B0] border border-[#0D281D]/20 transition"
                  >
                    <span>📱 Phone SMS App</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B756E] hover:bg-[#FAF9F5] dark:hover:bg-[#13241C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppCloud}
                  disabled={waSending}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0D824D] hover:bg-[#0a663c] text-white flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {waSending ? (
                    <span>Sending...</span>
                  ) : (
                    <span>☁️ WhatsApp Cloud API</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSendSMS}
                  disabled={smsSending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D281D] hover:bg-[#153e2e] text-white flex items-center space-x-1.5 shadow-md shadow-[#0D281D]/20 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40 hover:scale-[1.02]"
                >
                  {smsSending ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5 text-[#C5A45D]" />
                      <span>Send Gateway SMS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
