"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import {
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Volume2,
  X,
  Cpu,
  Layers,
  TrendingUp,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Line,
  Legend
} from 'recharts';

interface ForecastPoint {
  horizon_days: number;
  target_date: string;
  predicted_modal_price: number;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
  uncertainty_notes: string;
  arima_price?: number;
  lstm_price?: number;
  hybrid_price?: number;
}

interface ForecastResponse {
  commodity_id: string;
  commodity_name: string;
  market_id: string;
  market_name: string;
  current_modal_price: number;
  forecasts: ForecastPoint[];
  model_version: string;
  model_algorithm: string;
  training_period: string;
  metrics: {
    mae: number;
    rmse: number;
    mape?: number;
  };
  model_decomposition?: {
    arima_metrics: { mae: number; rmse: number; mape: number };
    lstm_metrics: { mae: number; rmse: number; mape: number };
    hybrid_metrics: { mae: number; rmse: number; mape: number };
    weights: { arima_weight: number; lstm_weight: number };
    improvement_pct: number;
    engine: string;
  };
  hybrid_weights?: { arima_weight: number; lstm_weight: number };
  generated_at: string;
  data_sufficiency_status: string;
  disclaimer: string;
}

export default function ForecastsPage() {
  const { t, language } = useLanguage();

  const [commodity, setCommodity] = useState<string>('c0010000-0000-0000-0000-000000000001'); // Onion
  const [market, setMarket] = useState<string>('m0010000-0000-0000-0000-000000000001'); // Lasalgaon
  const [horizon, setHorizon] = useState<number>(7);
  const [simulateInsufficient, setSimulateInsufficient] = useState<boolean>(false);
  const [activeModelView, setActiveModelView] = useState<'hybrid' | 'arima' | 'lstm'>('hybrid');

  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SMS Modal State
  const [showSmsModal, setShowSmsModal] = useState<boolean>(false);
  const [smsPhone, setSmsPhone] = useState<string>('+919876543210');
  const [smsSending, setSmsSending] = useState<boolean>(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

  // Voice Readout state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await apiRequest<ForecastResponse>(
          `/forecasts?commodity_id=${commodity}&market_id=${market}&horizon_days=${horizon}&simulate_insufficient_data=${simulateInsufficient}`
        );
        if (!ignore) {
          setForecastData(res);
          setErrorMessage(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Forecast generation failed.';
          setErrorMessage(msg);
          setForecastData(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchForecast();
    return () => {
      ignore = true;
    };
  }, [commodity, market, horizon, simulateInsufficient]);

  const targetPoint = forecastData?.forecasts.find(p => p.horizon_days === horizon) || forecastData?.forecasts[forecastData.forecasts.length - 1];

  const currentPrice = forecastData?.current_modal_price || 3405.0;
  
  // Price according to selected model view
  const predictedPrice = activeModelView === 'arima' 
    ? (targetPoint?.arima_price || targetPoint?.predicted_modal_price || currentPrice)
    : activeModelView === 'lstm'
    ? (targetPoint?.lstm_price || targetPoint?.predicted_modal_price || currentPrice)
    : (targetPoint?.predicted_modal_price || currentPrice);

  const changePct = (((predictedPrice - currentPrice) / currentPrice) * 100).toFixed(1);
  const isPositive = predictedPrice >= currentPrice;

  // Recharts Chart dataset with multi-model comparison
  const chartPoints = [
    {
      label: 'Today (Live)',
      hybrid: currentPrice,
      arima: currentPrice,
      lstm: currentPrice,
      lower: currentPrice,
      upper: currentPrice,
      horizon: 0
    },
    ...(forecastData?.forecasts.map(f => ({
      label: `+${f.horizon_days}d (${f.target_date.slice(5)})`,
      hybrid: f.hybrid_price || f.predicted_modal_price,
      arima: f.arima_price || f.predicted_modal_price,
      lstm: f.lstm_price || f.predicted_modal_price,
      lower: f.lower_bound,
      upper: f.upper_bound,
      horizon: f.horizon_days
    })) || [])
  ];

  // Dispatch SMS
  const handleSendSMS = async () => {
    if (!smsPhone || smsPhone.length < 10) {
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
            message_type: 'PRICE_ALERT',
            language: language || 'en',
            crop_name: forecastData?.commodity_name || 'Crop',
            market_name: forecastData?.market_name || 'Mandi',
            price: predictedPrice,
          })
        }
      );
      if (res.success) {
        setSmsStatus(`SMS Dispatched Successfully! (Ref: ${res.message_id} via ${res.provider})`);
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

  // Web Speech API Voice synthesis
  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech audio is not supported in this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const crop = forecastData?.commodity_name || 'Crop';
    const mandi = forecastData?.market_name || 'Mandi';

    let speechText = '';
    let speechLang = 'en-IN';

    if (language === 'hi') {
      speechText = `${mandi} में ${crop} का आज का भाव ${currentPrice} रुपये प्रति क्विंटल है। हाइब्रिड एआई मॉडल के अनुसार ${horizon} दिनों में भाव लगभग ${predictedPrice} रुपये होने का अनुमान है।`;
      speechLang = 'hi-IN';
    } else if (language === 'mr') {
      speechText = `${mandi} येथे ${crop} चा आजचा सरासरी दर ${currentPrice} रुपये प्रति क्विंटल आहे. हायब्रिड मॉडेलनुसार पुढील ${horizon} दिवसात भाव अंदाजे ${predictedPrice} रुपये राहण्याची शक्यता आहे.`;
      speechLang = 'mr-IN';
    } else {
      speechText = `At ${mandi}, current spot price for ${crop} is ₹${currentPrice} per quintal. Hybrid ARIMA and LSTM forecast projects price at ₹${predictedPrice} in ${horizon} days.`;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title Header with Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3]">
              {t('priceForecast')} Studio
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#123B2A]/10 dark:bg-[#C5A45D]/15 text-[#123B2A] dark:text-[#E8D8B0] border border-[#C5A45D]/30 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span>Hybrid ARIMA + Deep LSTM</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#1F7A4D]/10 text-[#1F7A4D] dark:text-[#66A65C] border border-[#1F7A4D]/25 flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Statsmodels &amp; TensorFlow</span>
            </span>
          </div>
          <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-1.5">
            Dual-engine time-series prediction decomposing linear autoregression and nonlinear sequential deep memory
          </p>
        </div>

        {/* Action buttons: Speech & SMS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleReadAloud}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm border ${
              isSpeaking
                ? 'bg-[#D97706] text-white border-[#D97706] animate-pulse'
                : 'bg-white dark:bg-[#14271E] border-[#E3E8DF] dark:border-[#1E382B] hover:border-[#C5A45D] text-[#123B2A] dark:text-[#F2F5F3]'
            }`}
          >
            <Volume2 className="w-4 h-4 text-[#C5A45D]" />
            <span>{isSpeaking ? 'Stop Audio' : '🔊 Listen Voice'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSmsModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#123B2A] hover:bg-[#1A523A] text-white flex items-center space-x-1.5 transition-all shadow-sm border border-[#C5A45D]/40"
          >
            <MessageSquare className="w-4 h-4 text-[#C5A45D]" />
            <span>📲 Send SMS to Phone</span>
          </button>

          <label className="inline-flex items-center space-x-2 p-2 px-3 rounded-xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] cursor-pointer text-xs font-semibold text-[#6B756E] dark:text-[#96A69D]">
            <input
              type="checkbox"
              checked={simulateInsufficient}
              onChange={(e) => setSimulateInsufficient(e.target.checked)}
              className="w-3.5 h-3.5 text-[#1F7A4D] rounded"
            />
            <span>Insufficient Data Check</span>
          </label>
        </div>
      </div>

      {/* Control Strip: Commodity, Mandi, and Horizon Selection */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
              Select Commodity (शेतमाल निवडा / फसल चयन)
            </label>
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#F7F6EF] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-xs font-bold focus:ring-2 focus:ring-[#1F7A4D]"
            >
              <option value="c0010000-0000-0000-0000-000000000001">Onion (कांदा / प्याज) - Spot Benchmark</option>
              <option value="c0010000-0000-0000-0000-000000000002">Soybean (सोयाबीन) - Oilseed</option>
              <option value="c0010000-0000-0000-0000-000000000003">Cotton (कापूस / कपास) - Cash Crop</option>
              <option value="c0010000-0000-0000-0000-000000000004">Wheat (गहू / गेहूं) - Cereal</option>
              <option value="c0010000-0000-0000-0000-000000000006">Bengal Gram / Chana (हरभरा / चना)</option>
              <option value="c0010000-0000-0000-0000-000000000007">Red Gram / Tur (तूर / अरहर)</option>
              <option value="c0010000-0000-0000-0000-000000000009">Potato (बटाटा / आलू)</option>
              <option value="c0010000-0000-0000-0000-000000000010">Tomato (टोमॅटो / टमाटर)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
              Target APMC Mandi (बाजार समिती / कृषि उपज मंडी)
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#F7F6EF] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-xs font-bold focus:ring-2 focus:ring-[#1F7A4D]"
            >
              <option value="m0010000-0000-0000-0000-000000000001">Lasalgaon APMC (Nashik, Maharashtra)</option>
              <option value="m0010000-0000-0000-0000-000000000002">Pimpalgaon Baswant APMC (Nashik, Maharashtra)</option>
              <option value="m0010000-0000-0000-0000-000000000009">Pune APMC (Gultekdi Market Yard, Maharashtra)</option>
              <option value="m0010000-0000-0000-0000-000000000003">Indore Mandi (Choithram, Madhya Pradesh)</option>
              <option value="m0010000-0000-0000-0000-000000000005">Akola Krishi Upaj Mandi (Maharashtra)</option>
              <option value="m0010000-0000-0000-0000-000000000010">Nagpur Kalamna APMC (Maharashtra)</option>
              <option value="m0010000-0000-0000-0000-000000000006">Solapur APMC (Maharashtra)</option>
              <option value="m0010000-0000-0000-0000-000000000008">Khanna Grain Market (Punjab)</option>
              <option value="m0010000-0000-0000-0000-000000000007">Azadpur Mandi (New Delhi)</option>
            </select>
          </div>
        </div>

        {/* Horizon selector buttons */}
        <div>
          <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-2">
            Select Horizon (कालावधी):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { days: 1, label: '1 Day (उद्या)', desc: 'Daily arrivals pulse' },
              { days: 3, label: '3 Days', desc: 'Dispatch planning' },
              { days: 7, label: '7 Days (1 Week)', desc: 'Weekly cycle trend' },
              { days: 15, label: '15 Days (2 Wks)', desc: 'Storage window' },
              { days: 30, label: '30 Days (1 Mo)', desc: 'Seasonal trajectory' },
            ].map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => setHorizon(item.days)}
                className={`p-3 rounded-2xl text-left transition-all border ${
                  horizon === item.days
                    ? 'bg-[#123B2A] text-white border-[#C5A45D]/60 shadow-md ring-1 ring-[#C5A45D]/40'
                    : 'bg-[#F7F6EF] dark:bg-[#13241C] border-[#E3E8DF] dark:border-[#1E382B] hover:border-[#C5A45D] text-[#202B24] dark:text-[#F2F5F3]'
                }`}
              >
                <div className="font-extrabold text-sm">{item.label}</div>
                <div className={`text-[10px] mt-0.5 ${horizon === item.days ? 'text-[#C5A45D]' : 'text-[#6B756E] dark:text-[#96A69D]'}`}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Forecast Display or Insufficient Data State */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] space-y-3">
          <div className="w-8 h-8 border-4 border-[#1F7A4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B756E] dark:text-[#96A69D]">Executing Hybrid Statsmodels ARIMA &amp; TensorFlow LSTM pipeline...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#14271E] border border-[#D97706]/40 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D97706]/15 text-[#D97706] mx-auto flex items-center justify-center border border-[#D97706]/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-[#202B24] dark:text-[#F2F5F3]">
              Cannot Generate Unverified Forecast
            </h3>
            <p className="text-xs text-[#6B756E] dark:text-[#96A69D] leading-relaxed">
              {errorMessage}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F7F6EF] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] max-w-md mx-auto text-[11px] text-[#6B756E] dark:text-[#96A69D] text-left space-y-1">
            <strong className="text-[#123B2A] dark:text-[#F2F5F3]">System Non-Fabrication Policy:</strong>
            <p>Our machine learning engine refuses to synthesize ungrounded figures when historical records fall below the statistical threshold. Try switching to a major benchmark mandi like Lasalgaon or Indore.</p>
          </div>
        </div>
      ) : forecastData && (
        <div className="space-y-8">
          
          {/* Key Metric Highlights Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-[#6B756E] dark:text-[#96A69D] uppercase tracking-wider">Today&apos;s Modal Rate</span>
              <div className="text-2xl font-black text-[#123B2A] dark:text-[#F2F5F3]">
                ₹{currentPrice.toLocaleString()}
                <span className="text-xs font-normal text-[#6B756E] dark:text-[#96A69D]"> /Qtl</span>
              </div>
              <span className="text-[11px] text-[#1F7A4D] dark:text-[#66A65C] font-semibold">Verified Agmarknet Spot</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6B756E] dark:text-[#96A69D] uppercase tracking-wider">
                  {horizon}-Day Projected ({activeModelView.toUpperCase()})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C5A45D]/15 text-[#8C6F2D] dark:text-[#D4B66F] border border-[#C5A45D]/30 uppercase">
                  {activeModelView}
                </span>
              </div>
              <div className="text-2xl font-black text-[#123B2A] dark:text-[#C5A45D]">
                ₹{predictedPrice.toLocaleString()}
                <span className="text-xs font-normal text-[#6B756E] dark:text-[#96A69D]"> /Qtl</span>
              </div>
              <span className={`text-[11px] font-bold ${isPositive ? 'text-[#1F7A4D] dark:text-[#66A65C]' : 'text-[#DC2626]'}`}>
                {isPositive ? `+${changePct}%` : `${changePct}%`} Expected Drift
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-[#6B756E] dark:text-[#96A69D] uppercase tracking-wider">
                90% Prediction Interval
              </span>
              <div className="text-base font-black text-[#202B24] dark:text-[#F2F5F3] mt-1">
                ₹{targetPoint?.lower_bound} — ₹{targetPoint?.upper_bound}
              </div>
              <span className="text-[11px] text-[#6B756E] dark:text-[#96A69D]">Confidence envelope ±90%</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-[#6B756E] dark:text-[#96A69D] uppercase tracking-wider">Target Horizon Date</span>
              <div className="text-base font-black text-[#202B24] dark:text-[#F2F5F3] mt-1">
                {targetPoint?.target_date}
              </div>
              <span className="text-[11px] text-[#6B756E] dark:text-[#96A69D] font-mono">
                {targetPoint?.horizon_days} calendar days out
              </span>
            </div>

          </div>

          {/* Model Decomposition Switcher & Visual Comparison Chart */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] shadow-sm space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E3E8DF] dark:border-[#1E382B] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#123B2A] dark:text-[#F2F5F3] flex items-center space-x-2">
                  <span>Hybrid ML Price Trajectory &amp; Model Decomposition</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C5A45D]/15 text-[#8C6F2D] dark:text-[#D4B66F] border border-[#C5A45D]/30">
                    Active Ensemble
                  </span>
                </h3>
                <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-1">
                  Compare how Statsmodels ARIMA (Linear Trend) and TensorFlow LSTM (Sequential Memory) synthesize into the optimal Hybrid prediction
                </p>
              </div>

              {/* View toggle pills */}
              <div className="flex items-center p-1 rounded-xl bg-[#F7F6EF] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveModelView('hybrid')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeModelView === 'hybrid'
                      ? 'bg-[#123B2A] text-white shadow-sm ring-1 ring-[#C5A45D]/30'
                      : 'text-[#6B756E] dark:text-[#96A69D] hover:text-[#123B2A]'
                  }`}
                >
                  ✨ Hybrid Ensemble
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModelView('arima')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeModelView === 'arima'
                      ? 'bg-[#1F7A4D] text-white shadow-sm'
                      : 'text-[#6B756E] dark:text-[#96A69D] hover:text-[#1F7A4D]'
                  }`}
                >
                  📈 ARIMA Only
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModelView('lstm')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeModelView === 'lstm'
                      ? 'bg-[#C5A45D] text-white shadow-sm'
                      : 'text-[#6B756E] dark:text-[#96A69D] hover:text-[#C5A45D]'
                  }`}
                >
                  🧠 LSTM Only
                </button>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hybridGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F7A4D" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#1F7A4D" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E8DF" className="dark:opacity-20" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B756E' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B756E' }} domain={['dataMin - 80', 'dataMax + 80']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#123B2A',
                      borderColor: '#C5A45D',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => [typeof val === 'number' || typeof val === 'string' ? `₹${val}/Qtl` : '', '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {/* 90% Bounds Envelope */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="transparent"
                    fill="#1F7A4D"
                    fillOpacity={0.08}
                    name="90% Upper Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="transparent"
                    fill="transparent"
                    name="90% Lower Bound"
                  />

                  {/* Hybrid Model Curve */}
                  <Area
                    type="monotone"
                    dataKey="hybrid"
                    stroke="#123B2A"
                    strokeWidth={activeModelView === 'hybrid' ? 3.5 : 2}
                    fillOpacity={1}
                    fill="url(#hybridGrad)"
                    name="Hybrid Combined Forecast (₹/Qtl)"
                  />

                  {/* ARIMA Line */}
                  <Line
                    type="monotone"
                    dataKey="arima"
                    stroke="#1F7A4D"
                    strokeWidth={activeModelView === 'arima' ? 3 : 1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                    name="ARIMA Linear Model (₹/Qtl)"
                  />

                  {/* LSTM Line */}
                  <Line
                    type="monotone"
                    dataKey="lstm"
                    stroke="#C5A45D"
                    strokeWidth={activeModelView === 'lstm' ? 3 : 1.5}
                    strokeDasharray="2 2"
                    dot={{ r: 3 }}
                    name="Deep LSTM Neural Net (₹/Qtl)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Hybrid Model Performance Breakdown Matrix */}
            {forecastData.model_decomposition && (
              <div className="p-5 rounded-2xl bg-[#F7F6EF] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E8DF] dark:border-[#1E382B] pb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#1F7A4D]" />
                    <span className="text-xs font-bold text-[#123B2A] dark:text-[#F2F5F3]">
                      Ensemble Performance &amp; Weight Allocation Matrix
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-[#123B2A] dark:text-[#E8D8B0] bg-[#C5A45D]/20 px-2.5 py-0.5 rounded-full border border-[#C5A45D]/40">
                      +{forecastData.model_decomposition.improvement_pct}% Variance Reduction
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* ARIMA Card */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#1F7A4D] dark:text-[#66A65C]">
                      <span>ARIMA (1, 1, 1)</span>
                      <span className="font-mono text-[11px]">Weight: {(forecastData.model_decomposition.weights.arima_weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[11px] text-[#6B756E] dark:text-[#96A69D] space-y-0.5">
                      <div>MAE: ₹{forecastData.model_decomposition.arima_metrics.mae}</div>
                      <div>RMSE: ₹{forecastData.model_decomposition.arima_metrics.rmse}</div>
                      <div>MAPE: {forecastData.model_decomposition.arima_metrics.mape}%</div>
                    </div>
                  </div>

                  {/* LSTM Card */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#14271E] border border-[#E3E8DF] dark:border-[#1E382B] space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#8C6F2D] dark:text-[#D4B66F]">
                      <span>Sequential LSTM</span>
                      <span className="font-mono text-[11px]">Weight: {(forecastData.model_decomposition.weights.lstm_weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[11px] text-[#6B756E] dark:text-[#96A69D] space-y-0.5">
                      <div>MAE: ₹{forecastData.model_decomposition.lstm_metrics.mae}</div>
                      <div>RMSE: ₹{forecastData.model_decomposition.lstm_metrics.rmse}</div>
                      <div>MAPE: {forecastData.model_decomposition.lstm_metrics.mape}%</div>
                    </div>
                  </div>

                  {/* Hybrid Ensemble Card */}
                  <div className="p-4 rounded-xl bg-[#123B2A] text-white border border-[#C5A45D]/40 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between font-bold text-[#E8D8B0]">
                      <span>Hybrid Optimal</span>
                      <span className="font-bold text-[11px] text-[#C5A45D]">Best Generalization</span>
                    </div>
                    <div className="text-[11px] text-[#C8D6CE] space-y-0.5">
                      <div>MAE: ₹{forecastData.model_decomposition.hybrid_metrics.mae}</div>
                      <div>RMSE: ₹{forecastData.model_decomposition.hybrid_metrics.rmse}</div>
                      <div>MAPE: {forecastData.model_decomposition.hybrid_metrics.mape}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* SMS Dispatch Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14271E] rounded-3xl max-w-md w-full p-6 border border-[#E3E8DF] dark:border-[#1E382B] shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E3E8DF] dark:border-[#1E382B] pb-3">
              <div className="flex items-center space-x-2 text-[#123B2A] dark:text-[#F2F5F3] font-bold text-base">
                <MessageSquare className="w-5 h-5 text-[#1F7A4D]" />
                <span>Send Real-Time SMS Alert</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                className="text-[#6B756E] hover:text-[#123B2A] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6B756E] dark:text-[#96A69D] leading-relaxed">
              Dispatches instant SMS notification in your preferred regional language (English, हिन्दी, मराठी) directly to the farmer&apos;s handset via Twilio / Fast2SMS gateway.
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#F7F6EF] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm font-mono focus:ring-2 focus:ring-[#1F7A4D]"
                />
              </div>

              {/* Preview SMS Message Box */}
              <div className="p-3.5 rounded-xl bg-[#F7F6EF] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#C5A45D]">SMS Preview:</span>
                <p className="text-[#202B24] dark:text-[#F2F5F3] italic">
                  {language === 'mr'
                    ? `[किसानसेतू सूचना] ${forecastData?.market_name} येथे ${forecastData?.commodity_name} चा ${horizon} दिवसांचा अंदाज ₹${predictedPrice}/क्विंटल आहे.`
                    : language === 'hi'
                    ? `[किसानसेतु अलर्ट] ${forecastData?.market_name} में ${forecastData?.commodity_name} का ${horizon} दिनों का भाव अनुमान ₹${predictedPrice}/क्विंटल है।`
                    : `[KisanSetu Alert] ${forecastData?.commodity_name} at ${forecastData?.market_name}: ${horizon}-day projected rate is ₹${predictedPrice}/Qtl.`}
                </p>
              </div>

              {smsStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  smsStatus.startsWith('Error')
                    ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                    : 'bg-[#1F7A4D]/10 text-[#1F7A4D] border border-[#1F7A4D]/20'
                }`}>
                  {smsStatus}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B756E] hover:bg-[#F7F6EF] dark:hover:bg-[#13241C]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendSMS}
                disabled={smsSending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#123B2A] hover:bg-[#1A523A] text-white flex items-center space-x-1.5 shadow border border-[#C5A45D]/40"
              >
                {smsSending ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-[#C5A45D]" />
                    <span>Send SMS Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
