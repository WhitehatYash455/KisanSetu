"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import {
  TrendingUp,
  Award,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Calculator,
  CloudSun,
  MapPin,
  ChevronRight,
  Wheat,
  RotateCcw,
  LayoutDashboard,
  Sprout,
  Store
} from 'lucide-react';

export default function HomePage() {
  const { t, language } = useLanguage();

  const spotPrices = [
    { crop: "Onion (कांदा / प्याज)", mandi: "Lasalgaon APMC", price: "₹3,405", unit: "Qtl", trend: "+4.2%", positive: true },
    { crop: "Soybean (सोयाबीन)", mandi: "Indore Mandi", price: "₹6,450", unit: "Qtl", trend: "+1.8%", positive: true },
    { crop: "Cotton (कापूस / कपास)", mandi: "Akola Mandi", price: "₹8,150", unit: "Qtl", trend: "+2.5%", positive: true },
    { crop: "Wheat (गेहू)", mandi: "Khanna Market", price: "₹2,925", unit: "Qtl", trend: "+0.9%", positive: true },
    { crop: "Chana / Gram (चना)", mandi: "Ujjain APMC", price: "₹5,820", unit: "Qtl", trend: "+1.5%", positive: true },
    { crop: "Tomato (टमाटर)", mandi: "Azadpur APMC", price: "₹2,150", unit: "Qtl", trend: "-2.4%", positive: false },
    { crop: "Potato (आलू)", mandi: "Neemuch Mandi", price: "₹1,850", unit: "Qtl", trend: "+1.1%", positive: true },
  ];

  const tickerItems = [...spotPrices, ...spotPrices, ...spotPrices];
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Smooth continuous requestAnimationFrame ticker
  useEffect(() => {
    let animId: number;
    const ticker = tickerRef.current;
    if (!ticker) return;

    if (ticker.scrollLeft === 0) {
      ticker.scrollLeft = 2;
    }

    const step = () => {
      if (!isPaused && ticker) {
        ticker.scrollLeft += 0.75;
        const oneSetWidth = ticker.scrollWidth / 3;
        if (ticker.scrollLeft >= oneSetWidth * 2) {
          ticker.scrollLeft -= oneSetWidth;
        } else if (ticker.scrollLeft <= 0) {
          ticker.scrollLeft += oneSetWidth;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  return (
    <div className="space-y-12 pb-20">
      
      {/* =========================================================================
          HERO SECTION: ELEGANT FRAMED SHOWCASE WITH TRUST PILLS
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl border border-[#E2E8DF] dark:border-[#193828] bg-gradient-to-b from-white via-[#FAFBF8] to-[#F3F7F2] dark:from-[#0C1E16] dark:via-[#091711] dark:to-[#0C1E16] p-8 sm:p-14 shadow-sm">
          
          {/* Subtle Decorative Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 blur-3xl pointer-events-none animate-float-gentle" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-teal-500/10 dark:bg-teal-400/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
            {/* Tag Badge Frame */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/95 dark:bg-[#122A1E]/90 text-[#0D824D] dark:text-[#34D399] border border-emerald-200/80 dark:border-emerald-700/50 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0D824D] dark:text-[#34D399]" />
              <span>Full-Stack AI Agriculture Intelligence Suite</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              Smarter Price Forecasts.{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0D824D] via-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-300">
                Maximum Pocket Profit.
              </span>
            </h1>

            {/* Description Subtitle */}
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Empowering farmers with <strong className="text-gray-900 dark:text-white font-semibold">Hybrid ARIMA+LSTM Price Predictions</strong>,{' '}
              <strong className="text-gray-900 dark:text-white font-semibold">GPS Road Distance Net Realization Rankings</strong>, and{' '}
              an <strong className="text-gray-900 dark:text-white font-semibold">Interactive 24-Hour AI Advisory Chat</strong> for instant market decisions.
            </p>

            {/* 3 Core Action Buttons Framed */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/forecasts"
                className="px-6 py-3 rounded-full bg-[#0D824D] hover:bg-[#096D40] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg shadow-emerald-700/20 transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Price Prediction (1-30 Days)</span>
              </Link>

              <Link
                href="/recommendations"
                className="px-6 py-3 rounded-full bg-[#0D281D] hover:bg-[#143E2C] text-white font-bold text-xs sm:text-sm border border-[#C5A45D]/30 shadow-md transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Award className="w-4 h-4 text-[#D8BC74]" />
                <span>Market Recommendations</span>
              </Link>

              <Link
                href="/chat"
                className="px-6 py-3 rounded-full bg-white dark:bg-[#122A1E] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-[#1E382B] font-bold text-xs sm:text-sm shadow-xs hover:bg-gray-50 dark:hover:bg-[#1A3828] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <MessageSquare className="w-4 h-4 text-[#0D824D] dark:text-[#34D399]" />
                <span>24h Advisory Chat</span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              </Link>
            </div>

            {/* Framed Feature Micro-Strip */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-[#12241A]/80 border border-gray-200/80 dark:border-gray-800/80 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D824D] dark:text-[#34D399]" />
                <span>Agmarknet Verified Mandis</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-[#12241A]/80 border border-gray-200/80 dark:border-gray-800/80 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D824D] dark:text-[#34D399]" />
                <span>Real-Time Net Profit Realization</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-[#12241A]/80 border border-gray-200/80 dark:border-gray-800/80 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#0D824D] dark:text-[#34D399]" />
                <span>24-Hour Sliding Chat History</span>
              </div>
            </div>

            {/* Quick Farm Register / Sign In Link */}
            <div className="pt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Ready to track your own crops &amp; acreage? </span>
              <Link
                href="/auth/register"
                className="font-bold text-[#0D824D] dark:text-[#34D399] hover:underline"
              >
                Register Farm Account &rarr;
              </Link>
              <span className="mx-2 text-gray-300 dark:text-gray-700">&bull;</span>
              <Link
                href="/auth/login"
                className="font-medium text-gray-700 dark:text-gray-300 hover:text-[#0D824D] underline"
              >
                Sign In
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          LIVE APMC SPOT PRICE TICKER WITH FADE MASKS
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-white dark:bg-[#0E2218] rounded-2xl p-4 border border-[#E2E8DF] dark:border-[#193828] shadow-xs overflow-hidden">
          
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Live Verified APMC Mandi Observations (Agmarknet)
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
              Hover to pause &bull; Continuous 24h synchronization
            </span>
          </div>

          {/* Fade masks */}
          <div className="pointer-events-none absolute left-0 top-12 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-white dark:from-[#0E2218] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-12 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white dark:from-[#0E2218] to-transparent z-10" />

          <div
            ref={tickerRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex items-center gap-3 overflow-x-hidden whitespace-nowrap py-1 cursor-grab"
          >
            {tickerItems.map((item, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#FAF9F5] dark:bg-[#132A1E] border border-[#E2E8DF] dark:border-[#193828] shrink-0 hover:border-[#0D824D] transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {item.crop}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {item.mandi}
                  </div>
                </div>

                <div className="text-right pl-2 border-l border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-extrabold text-[#0D824D] dark:text-[#34D399]">
                    {item.price} <span className="text-[10px] text-gray-500">/{item.unit}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      item.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                    }`}
                  >
                    {item.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ESSENTIAL WORKFLOWS: QUICK ACCESS GRID
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#0D824D] rounded-full" />
              <span>Essential Workflows</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Complete farmer toolkit: crop management, live mandi prices, ML predictions, and selling recommendations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Dashboard */}
          <Link
            href="/dashboard"
            className="p-4 rounded-2xl bg-white dark:bg-[#0E2218] border border-[#E2E8DF] dark:border-[#193828] hover:border-[#0D824D] shadow-xs hover:shadow-md transition-all duration-200 group text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0D824D] dark:text-[#34D399] flex items-center justify-center group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Dashboard
            </div>
            <span className="text-[10px] text-gray-500">Farm Overview</span>
          </Link>

          {/* 2. My Crops */}
          <Link
            href="/crops"
            className="p-4 rounded-2xl bg-white dark:bg-[#0E2218] border border-[#E2E8DF] dark:border-[#193828] hover:border-[#0D824D] shadow-xs hover:shadow-md transition-all duration-200 group text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              My Crops
            </div>
            <span className="text-[10px] text-gray-500">Lifecycle &amp; Harvest</span>
          </Link>

          {/* 3. Mandi Prices */}
          <Link
            href="/markets"
            className="p-4 rounded-2xl bg-white dark:bg-[#0E2218] border border-[#E2E8DF] dark:border-[#193828] hover:border-[#0D824D] shadow-xs hover:shadow-md transition-all duration-200 group text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-[#C5A45D] dark:text-[#D8BC74] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Mandi Prices
            </div>
            <span className="text-[10px] text-gray-500">Agmarknet Rates</span>
          </Link>

          {/* 4. Price Prediction */}
          <Link
            href="/forecasts"
            className="p-4 rounded-2xl bg-white dark:bg-[#0E2218] border border-[#E2E8DF] dark:border-[#193828] hover:border-[#0D824D] shadow-xs hover:shadow-md transition-all duration-200 group text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Price Prediction
            </div>
            <span className="text-[10px] text-gray-500">ARIMA + LSTM (1-30D)</span>
          </Link>

          {/* 5. Market Recommendation */}
          <Link
            href="/recommendations"
            className="p-4 rounded-2xl bg-white dark:bg-[#0E2218] border border-[#E2E8DF] dark:border-[#193828] hover:border-[#0D824D] shadow-xs hover:shadow-md transition-all duration-200 group text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0D824D] dark:text-[#34D399] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Market Advice
            </div>
            <span className="text-[10px] text-gray-500">GPS Net Margin</span>
          </Link>

          {/* 6. Profit Calculator */}
          <Link
            href="/calculator"
            className="p-4 rounded-2xl bg-white dark:bg-[#0E2218] border border-[#E2E8DF] dark:border-[#193828] hover:border-[#0D824D] shadow-xs hover:shadow-md transition-all duration-200 group text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-[#C5A45D] dark:text-[#D8BC74] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Profit Calculator
            </div>
            <span className="text-[10px] text-gray-500">Freight &amp; Hamali</span>
          </Link>
        </div>
      </section>

      {/* =========================================================================
          THE THREE CORE ENGINES: INTERACTIVE SHOWCASE
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            Built Directly For Agricultural Profit
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Combining verified APMC auction records, machine learning models, and logistics optimization.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Pillar 1: Farmer Price Prediction */}
          <div className="bg-white dark:bg-[#0E2218] rounded-2xl p-6 sm:p-7 border border-[#E2E8DF] dark:border-[#193828] shadow-sm flex flex-col justify-between hover:border-[#0D824D] transition-all duration-300 group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0D824D] dark:text-[#34D399] flex items-center justify-center font-bold ring-1 ring-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D824D] dark:text-[#34D399]">
                  Hybrid ARIMA + LSTM
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  Farmer Price Prediction
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                  Dual-engine statistical model combining linear autoregressive trends with Deep Sequential LSTM memory across 1, 3, 7, 15, and 30 day horizons.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D824D] dark:text-[#34D399] shrink-0" />
                  <span>90% Confidence Interval envelope bands</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D824D] dark:text-[#34D399] shrink-0" />
                  <span>Dynamic Inverse-RMSE weighting (ARIMA + LSTM)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D824D] dark:text-[#34D399] shrink-0" />
                  <span>Instant Multilingual SMS alert dispatcher</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800/80 mt-6">
              <Link
                href="/forecasts"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0D824D] hover:bg-[#096D40] text-white font-bold text-xs shadow-sm transition-all duration-200"
              >
                <span>Launch Price Prediction</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Market Recommendation */}
          <div className="bg-white dark:bg-[#0E2218] rounded-2xl p-6 sm:p-7 border border-[#E2E8DF] dark:border-[#193828] shadow-sm flex flex-col justify-between hover:border-[#C5A45D] transition-all duration-300 group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-[#C5A45D] dark:text-[#D8BC74] flex items-center justify-center font-bold ring-1 ring-amber-500/20">
                <Award className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A45D] dark:text-[#D8BC74]">
                  GPS &amp; Net Margin Matrix
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  Market Recommendation
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                  Real road distance routing calculating exact take-home revenue after deducting freight (₹0.75/km/qtl), hamali labor, and APMC market cess.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C5A45D] shrink-0" />
                  <span>Definitive SELL NOW, WAIT, or PARTIAL SELL decision</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C5A45D] shrink-0" />
                  <span>Hardware GPS field auto-detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C5A45D] shrink-0" />
                  <span>Ranked Mandi Leaderboard by net pocket money</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800/80 mt-6">
              <Link
                href="/recommendations"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0D281D] hover:bg-[#143E2C] text-[#FAF9F5] border border-[#C5A45D]/40 font-bold text-xs shadow-sm transition-all duration-200"
              >
                <span>Explore Market Recommendations</span>
                <ArrowRight className="w-4 h-4 text-[#D8BC74] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Last 24 Hours Agri-Chat */}
          <div className="bg-white dark:bg-[#0E2218] rounded-2xl p-6 sm:p-7 border border-[#E2E8DF] dark:border-[#193828] shadow-sm flex flex-col justify-between hover:border-[#0D824D] transition-all duration-300 group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold ring-1 ring-teal-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  24-Hour AI Advisory Window
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  Last 24 Hours Chat
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                  24/7 agricultural assistant providing instant answers, 24-hour message history, regional voice speech readouts, and crop context filters.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>24-Hour persistent conversation history filter</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>One-tap quick prompt cards &amp; follow-up chips</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Voice audio readout (SpeechSynthesis) in native accent</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800/80 mt-6">
              <Link
                href="/chat"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0D824D] to-teal-700 hover:from-[#096D40] hover:to-teal-800 text-white font-bold text-xs shadow-sm transition-all duration-200"
              >
                <span>Open 24h Advisory Chat</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          SUPPORTING ESSENTIALS: PROFIT CALCULATOR & TRANSIT WEATHER
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <Link
            href="/calculator"
            className="p-5 rounded-2xl bg-[#F6FAF6] dark:bg-[#12241A] border border-[#E3E8DF] dark:border-[#1E382B] hover:border-emerald-500 shadow-xs transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#183324] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-emerald-600">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Selling Profit Calculator
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Simulate deductions for Quintals, Kg &amp; Tonnes with real fuel index.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/weather"
            className="p-5 rounded-2xl bg-[#F6FAF6] dark:bg-[#12241A] border border-[#E3E8DF] dark:border-[#1E382B] hover:border-emerald-500 shadow-xs transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#183324] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-blue-600">
                <CloudSun className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Agro-Weather &amp; Transit Risk
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  7-Day Open-Meteo farm forecast &amp; road moisture hazard warnings.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>

        </div>
      </section>

    </div>
  );
}
