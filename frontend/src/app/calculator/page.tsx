"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import {
  Calculator,
  Truck,
  Layers,
  RefreshCw,
  Sliders,
  PieChart,
  Percent,
  Warehouse,
  MapPin,
  LocateFixed,
  Sparkles
} from 'lucide-react';
import { useGeolocation } from '@/lib/use-geolocation';

interface CommodityOption {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
  name_mr: string;
  standard_unit: string;
}

interface ProfitComparisonItem {
  market_id: string;
  market_name: string;
  distance_km: number;
  modal_price: number;
  gross_revenue: number;
  transport_cost: number;
  net_realization: number;
  net_realization_per_quintal: number;
  is_current_selection: boolean;
}

interface ProfitCalculationResult {
  quantity_entered: number;
  quantity_unit: string;
  quantity_quintals: number;
  market_name: string;
  distance_km: number;
  mandi_price_per_quintal: number;
  gross_revenue: number;
  transport_cost: number;
  handling_cost: number;
  market_cess: number;
  storage_cost: number;
  spoilage_loss: number;
  total_expenses: number;
  net_realization: number;
  net_realization_per_quintal: number;
  profit_margin_pct: number;
  mandi_comparisons: ProfitComparisonItem[];
}

export default function CalculatorPage() {
  const { language, t } = useLanguage();

  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>('c0010000-0000-0000-0000-000000000001'); // Onion
  const [quantity, setQuantity] = useState<number>(50);
  const [unit, setUnit] = useState<'QUINTAL' | 'KG' | 'TONNE'>('QUINTAL');

  // Logistics parameters
  const [distanceKm, setDistanceKm] = useState<number>(35.0);
  const [transportRate, setTransportRate] = useState<number>(0.75); // ₹/km/q
  const [handlingRate, setHandlingRate] = useState<number>(15.0); // ₹/q
  const [marketFeePct, setMarketFeePct] = useState<number>(1.5); // 1.5%

  // Storage parameters
  const [storageDays, setStorageDays] = useState<number>(0);
  const storageRatePerDay = 1.20;
  const spoilageRatePct = 0.15;

  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<ProfitCalculationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    latitude: farmerLat,
    longitude: farmerLon,
    locationName: farmerLocationName,
    isLive: isLiveLocation,
    loading: geoLoading,
    requestLiveLocation,
    selectDistrict,
    districts,
  } = useGeolocation(18.4975, 73.8647, true);

  // Load commodities
  useEffect(() => {
    async function loadCommodities() {
      try {
        const res = await apiRequest<CommodityOption[]>('/markets/commodities');
        setCommodities(res);
      } catch (err) {
        console.error('Failed to load commodities:', err);
      }
    }
    loadCommodities();
  }, []);

  // Compute profit
  useEffect(() => {
    let ignore = false;
    const calculate = async () => {
      try {
        const res = await apiRequest<ProfitCalculationResult>('/calculator/profit', {
          method: 'POST',
          body: JSON.stringify({
            commodity_id: selectedCommodityId,
            quantity: quantity,
            unit: unit,
            distance_km: distanceKm,
            transport_rate_per_km_quintal: transportRate,
            handling_cost_per_quintal: handlingRate,
            market_fee_pct: marketFeePct / 100.0,
            storage_days: storageDays,
            daily_storage_cost_per_quintal: storageRatePerDay,
            daily_spoilage_rate_pct: spoilageRatePct / 100.0,
            farmer_lat: farmerLat,
            farmer_lng: farmerLon,
          }),
        });
        if (!ignore) {
          setResult(res);
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Calculation error:', err);
          setErrorMsg(t('noDataAvailable'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    calculate();
    return () => {
      ignore = true;
    };
  }, [
    selectedCommodityId,
    quantity,
    unit,
    distanceKm,
    transportRate,
    handlingRate,
    marketFeePct,
    storageDays,
    storageRatePerDay,
    spoilageRatePct,
    farmerLat,
    farmerLon,
    t,
  ]);

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ProfitCalculationResult>('/calculator/profit', {
        method: 'POST',
        body: JSON.stringify({
          commodity_id: selectedCommodityId,
          quantity: quantity,
          unit: unit,
          distance_km: distanceKm,
          transport_rate_per_km_quintal: transportRate,
          handling_cost_per_quintal: handlingRate,
          market_fee_pct: marketFeePct / 100.0,
          storage_days: storageDays,
          daily_storage_cost_per_quintal: storageRatePerDay,
          daily_spoilage_rate_pct: spoilageRatePct / 100.0,
          farmer_lat: farmerLat,
          farmer_lng: farmerLon,
        }),
      });
      setResult(res);
      setErrorMsg(null);
    } catch (err: unknown) {
      console.error('Calculation error:', err);
      setErrorMsg(t('noDataAvailable'));
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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Luxury Ambient Glow */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-[#0D824D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-10 w-96 h-96 bg-[#C5A45D]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#E3E8DF] dark:border-[#1E382B] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#123B2A]/10 dark:bg-[#C5A45D]/15 text-[#123B2A] dark:text-[#E8D8B0] border border-[#C5A45D]/30 mb-2 shadow-xs">
              <Calculator className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span className="tracking-wide">{t('calculator')} • Net Realization Model</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3] tracking-tight">
              {language === 'hi' ? 'मंडी शुद्ध लाभ एवं खर्च कैलकुलेटर' : language === 'mr' ? 'मंडी निव्वळ नफा व खर्च कॅल्क्युलेटर' : 'Mandi Net Selling Realization Calculator'}
            </h1>
            <p className="mt-1.5 text-[#6B756E] dark:text-[#96A69D] text-sm max-w-2xl leading-relaxed font-light">
              {language === 'hi'
                ? 'परिवहन दूरी, श्रमिक मजदूरी, मंडी सेस व भंडारण लागत घटाकर वास्तविक हाथ में आने वाली राशि जानिए।'
                : language === 'mr'
                ? 'वाहतूक भाडे, हमाली, बाजार उपकर व साठवणूक नुकसान वजा करून शेतकऱ्याच्या हातात पडणारा खरा नफा.'
                : 'Calculate your actual take-home revenue after accounting for freight distance, APMC fees, loading charges, and holding losses.'}
            </p>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-xs shadow-md shadow-[#0D281D]/20 transition-all disabled:opacity-50 cursor-pointer self-start md:self-auto border border-[#C5A45D]/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C5A45D] ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Profit</span>
          </button>
        </div>

        {/* Live GPS & Location District Bar */}
        <div className="card-luxury p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isLiveLocation 
                ? 'bg-[#1F7A4D]/15 text-[#1F7A4D] dark:text-[#66A65C] border border-[#1F7A4D]/30 shadow-xs' 
                : 'bg-[#FAF9F5] text-[#6B756E] dark:bg-[#13241C] dark:text-[#96A69D] border border-[#E3E8DF] dark:border-[#1E382B]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLiveLocation ? 'bg-[#1F7A4D] animate-pulse' : 'bg-[#6B756E]'}`} />
              {isLiveLocation ? 'Live GPS Location' : 'Farmer Location'}
            </span>
            <span className="text-sm font-semibold text-[#123B2A] dark:text-[#F2F5F3] flex items-center gap-1">
              <MapPin className="w-4 h-4 text-[#C5A45D]" />
              <span>{farmerLocationName || 'Pune, Maharashtra'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => requestLiveLocation()}
              disabled={geoLoading}
              className="px-3.5 py-1.5 text-xs rounded-xl font-bold bg-[#123B2A] text-white hover:bg-[#1A523A] border border-[#C5A45D]/40 flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:scale-[1.02]"
            >
              <LocateFixed className={`w-3.5 h-3.5 text-[#C5A45D] ${geoLoading ? 'animate-spin' : ''}`} />
              <span>Use GPS</span>
            </button>
            {districts.map((d) => (
              <button
                key={d.name}
                onClick={() => selectDistrict(d.name)}
                className="px-3 py-1 text-xs rounded-xl font-medium bg-[#FAF9F5] hover:bg-white dark:bg-[#13241C] dark:hover:bg-[#1E382B] text-[#202B24] dark:text-[#D1DCD5] border border-[#E3E8DF] dark:border-[#1E382B] transition cursor-pointer hover:border-[#0D824D]/40"
              >
                {d.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-sm text-[#DC2626] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Interactive Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Harvest Volume Card */}
            <div className="card-luxury rounded-3xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E8DF] dark:border-[#1E382B]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#123B2A] dark:text-[#C5A45D] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C5A45D]" />
                  <span>Crop &amp; Harvest Volume</span>
                </h2>
                <span className="text-[11px] text-[#6B756E] dark:text-[#96A69D] font-mono">Step 1 of 3</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                  {language === 'hi' ? 'फसल' : language === 'mr' ? 'पीक' : 'Select Crop'}
                </label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-sm font-medium outline-none focus:ring-2 focus:ring-[#0D824D] focus:border-transparent transition-all cursor-pointer"
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-[#13241C]">
                      {getCommodityName(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                    {language === 'hi' ? 'मात्रा' : language === 'mr' ? 'प्रमाण' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-4 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0D824D] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                    {language === 'hi' ? 'इकाई' : language === 'mr' ? 'एकक' : 'Unit'}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as 'QUINTAL' | 'KG' | 'TONNE')}
                    className="w-full px-4 py-3 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-2xl text-[#202B24] dark:text-[#F2F5F3] text-sm font-medium outline-none focus:ring-2 focus:ring-[#0D824D] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="QUINTAL" className="bg-white dark:bg-[#13241C]">Quintal (100 Kg)</option>
                    <option value="KG" className="bg-white dark:bg-[#13241C]">Kilogram (Kg)</option>
                    <option value="TONNE" className="bg-white dark:bg-[#13241C]">Metric Tonne (1,000 Kg)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logistics & Transit Expenses Card */}
            <div className="card-luxury rounded-3xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E8DF] dark:border-[#1E382B]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#123B2A] dark:text-[#C5A45D] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#C5A45D]" />
                  <span>Logistics &amp; Mandi Expenses</span>
                </h2>
                <span className="text-[11px] text-[#6B756E] dark:text-[#96A69D] font-mono">Step 2 of 3</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-2">
                  <span>Mandi Transit Distance</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        requestLiveLocation();
                        if (result?.mandi_comparisons?.[0]?.distance_km) {
                          setDistanceKm(result.mandi_comparisons[0].distance_km);
                        } else {
                          setDistanceKm(7.1);
                        }
                      }}
                      disabled={geoLoading}
                      className="text-[11px] font-bold text-[#0D824D] dark:text-[#66A65C] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Detect distance to your closest APMC mandi"
                    >
                      <LocateFixed className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
                      <span>{isLiveLocation ? `Closest APMC (${result?.mandi_comparisons?.[0]?.distance_km || 7.1} km)` : 'Detect GPS Distance'}</span>
                    </button>
                    <span className="font-extrabold text-sm text-[#0D281D] dark:text-[#C5A45D] bg-[#0D824D]/10 px-2 py-0.5 rounded-md">
                      {distanceKm} km
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="5"
                  max="250"
                  step="5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                  className="w-full accent-[#0D824D] h-2 bg-[#E3E8DF] dark:bg-[#1E382B] rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                    Transport Freight (₹/km/q)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={transportRate}
                    onChange={(e) => setTransportRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-xl text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0D824D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                    Handling / Labor (₹/q)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={handlingRate}
                    onChange={(e) => setHandlingRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-xl text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0D824D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                  APMC Market Cess / Mandi Tax (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={marketFeePct}
                  onChange={(e) => setMarketFeePct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] rounded-xl text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0D824D]"
                />
              </div>
            </div>

            {/* Storage & Holding Cost Card */}
            <div className="card-luxury rounded-3xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E8DF] dark:border-[#1E382B]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#123B2A] dark:text-[#C5A45D] flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#C5A45D]" />
                  <span>Holding / Storage Duration</span>
                </h2>
                <span className="text-[11px] text-[#6B756E] dark:text-[#96A69D] font-mono">Step 3 of 3</span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-2">
                  <span>Holding Time</span>
                  <span className="font-extrabold text-sm text-[#0D281D] dark:text-[#C5A45D] bg-[#0D824D]/10 px-2 py-0.5 rounded-md">
                    {storageDays} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="1"
                  value={storageDays}
                  onChange={(e) => setStorageDays(parseInt(e.target.value) || 0)}
                  className="w-full accent-[#0D824D] h-2 bg-[#E3E8DF] dark:bg-[#1E382B] rounded-lg cursor-pointer"
                />
              </div>

              {storageDays > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B]">
                    <span className="text-[#6B756E] dark:text-[#96A69D] block text-[11px]">Storage Fee</span>
                    <div className="font-bold text-[#202B24] dark:text-[#F2F5F3] text-sm mt-0.5">₹{storageRatePerDay}/q/day</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B]">
                    <span className="text-[#6B756E] dark:text-[#96A69D] block text-[11px]">Est. Daily Spoilage</span>
                    <div className="font-bold text-[#D97706] text-sm mt-0.5">{spoilageRatePct}% / day</div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Results Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {result ? (
              <>
                {/* Big Net Realization Result Box */}
                <div className="rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-[#C5A45D]/40 relative overflow-hidden bg-gradient-to-br from-[#0D281D] via-[#123B2A] to-[#0A1F16]">
                  {/* Fine Gold Hairline Highlight */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A45D] to-transparent opacity-80" />
                  
                  {/* Subtle Background Glow */}
                  <div className="absolute top-0 right-0 w-72 h-72 bg-[#0D824D]/20 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-[#C8D6CE] text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C5A45D]" />
                        {t('netRealization')}
                      </span>
                      <span className="text-[#E8D8B0] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                        📍 {result.market_name}
                      </span>
                    </div>

                    <div className="text-4xl sm:text-6xl font-black tracking-tight text-white my-3">
                      ₹{result.net_realization.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>

                    <div className="text-[#E8D8B0] text-sm font-semibold flex flex-wrap items-center gap-3">
                      <span className="bg-[#0D824D]/30 border border-[#C5A45D]/30 px-3 py-1 rounded-xl">
                        <strong>₹{result.net_realization_per_quintal.toFixed(1)}</strong> / Quintal in-pocket
                      </span>
                      <span className="text-[#C5A45D]">•</span>
                      <span>Realized Margin: <strong className="text-emerald-300">{result.profit_margin_pct.toFixed(1)}%</strong></span>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                        <div className="text-[11px] text-[#A3B8AD] uppercase font-bold">{t('grossRevenue')}</div>
                        <div className="text-base sm:text-xl font-black mt-0.5 text-white">₹{result.gross_revenue.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                        <div className="text-[11px] text-[#A3B8AD] uppercase font-bold">Total Expenses</div>
                        <div className="text-base sm:text-xl font-black mt-0.5 text-rose-300">-₹{result.total_expenses.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                        <div className="text-[11px] text-[#A3B8AD] uppercase font-bold">Mandi Price</div>
                        <div className="text-base sm:text-xl font-black mt-0.5 text-[#E8D8B0]">₹{result.mandi_price_per_quintal}/q</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itemized Expense Breakdown */}
                <div className="card-luxury rounded-3xl p-6 sm:p-7 space-y-4">
                  <h3 className="text-sm font-extrabold text-[#123B2A] dark:text-[#F2F5F3] flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#C5A45D]" />
                    <span>Itemized Deductions Breakdown</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] flex justify-between items-center hover:border-[#0D824D]/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold">
                        <div className="w-7 h-7 rounded-lg bg-[#0D824D]/10 flex items-center justify-center text-[#0D824D]">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span>Transport Freight ({result.distance_km} km)</span>
                      </div>
                      <span className="font-bold text-[#DC2626]">
                        ₹{result.transport_cost.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] flex justify-between items-center hover:border-[#0D824D]/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold">
                        <div className="w-7 h-7 rounded-lg bg-[#0D824D]/10 flex items-center justify-center text-[#0D824D]">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span>Handling &amp; Labor</span>
                      </div>
                      <span className="font-bold text-[#DC2626]">
                        ₹{result.handling_cost.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] flex justify-between items-center hover:border-[#0D824D]/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold">
                        <div className="w-7 h-7 rounded-lg bg-[#0D824D]/10 flex items-center justify-center text-[#0D824D]">
                          <Percent className="w-3.5 h-3.5" />
                        </div>
                        <span>APMC Market Cess</span>
                      </div>
                      <span className="font-bold text-[#DC2626]">
                        ₹{result.market_cess.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] flex justify-between items-center hover:border-[#0D824D]/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-[#202B24] dark:text-[#F2F5F3] text-xs font-semibold">
                        <div className="w-7 h-7 rounded-lg bg-[#0D824D]/10 flex items-center justify-center text-[#0D824D]">
                          <Warehouse className="w-3.5 h-3.5" />
                        </div>
                        <span>Holding &amp; Spoilage Loss</span>
                      </div>
                      <span className="font-bold text-[#DC2626]">
                        ₹{(result.storage_cost + result.spoilage_loss).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multi-Mandi Comparison Table */}
                {result.mandi_comparisons && result.mandi_comparisons.length > 0 && (
                  <div className="card-luxury rounded-3xl p-6 sm:p-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#123B2A] dark:text-[#F2F5F3] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#C5A45D]" />
                        <span>Alternative Mandis Net Realization</span>
                      </h3>
                      <span className="text-[11px] text-[#C5A45D] font-bold">
                        {result.mandi_comparisons.length} Mandis Evaluated
                      </span>
                    </div>
                    <p className="text-xs text-[#6B756E] dark:text-[#96A69D]">
                      Compare your net realization at other reachable mandis after adjusting for their specific distances
                    </p>

                    <div className="overflow-x-auto rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF9F5] dark:bg-[#13241C] text-[#6B756E] dark:text-[#96A69D] uppercase font-bold border-b border-[#E3E8DF] dark:border-[#1E382B]">
                          <tr>
                            <th className="py-3 px-4">Mandi</th>
                            <th className="py-3 px-3">Distance</th>
                            <th className="py-3 px-3">Modal Rate</th>
                            <th className="py-3 px-3">Freight</th>
                            <th className="py-3 px-4 font-bold text-[#0D824D] dark:text-[#66A65C]">Net Take-Home</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3E8DF] dark:divide-[#1E382B]">
                          {result.mandi_comparisons.map((c, idx) => (
                            <tr
                              key={c.market_id}
                              className={`hover:bg-[#FAF9F5]/80 dark:hover:bg-[#13241C]/80 transition-colors ${
                                idx === 0 ? 'bg-[#C5A45D]/10 font-medium' : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-bold text-[#123B2A] dark:text-[#F2F5F3]">
                                <div className="flex items-center gap-2">
                                  <span>{c.market_name}</span>
                                  {idx === 0 && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#0D281D] text-[#C5A45D] rounded-full border border-[#C5A45D]/40">
                                      🏆 Best Profit
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-[#6B756E] dark:text-[#96A69D] font-mono">
                                {c.distance_km} km
                              </td>
                              <td className="py-3 px-3 font-semibold text-[#202B24] dark:text-[#F2F5F3]">
                                ₹{c.modal_price}
                              </td>
                              <td className="py-3 px-3 text-[#DC2626] font-medium">
                                -₹{c.transport_cost.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-black text-[#0D824D] dark:text-[#66A65C] text-sm">
                                ₹{c.net_realization.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center card-luxury rounded-3xl text-[#6B756E] dark:text-[#96A69D]">
                <Calculator className="w-10 h-10 mb-2 opacity-40 text-[#123B2A] dark:text-[#C5A45D]" />
                <p className="text-sm font-medium">Enter harvest parameters to calculate net profit</p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
