"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import {
  CloudSun,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Truck,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Bell,
  LocateFixed
} from 'lucide-react';
import Link from 'next/link';
import { useGeolocation } from '@/lib/use-geolocation';

interface DailyForecast {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_probability: number;
  condition: string;
  harvest_risk_level: 'Low' | 'Moderate' | 'High';
  transport_risk_level: 'Low' | 'Moderate' | 'High';
}

interface WeatherResponse {
  location_name: string;
  latitude: number;
  longitude: number;
  current_temperature_c: number;
  current_humidity_pct: number;
  current_precipitation_mm: number;
  wind_speed_kmh: number;
  condition: string;
  active_alerts: string[];
  forecast_days: DailyForecast[];
  source_provider: string;
  updated_at: string;
}

const LOCATION_PRESETS = [
  { name: 'Nashik, Maharashtra', lat: 20.0063, lon: 74.0022 },
  { name: 'Lasalgaon Mandi, Nashik', lat: 20.1477, lon: 74.2284 },
  { name: 'Pimpalgaon Baswant, Nashik', lat: 20.1687, lon: 73.9856 },
  { name: 'Indore, Madhya Pradesh', lat: 22.6845, lon: 75.8362 },
  { name: 'Solapur, Maharashtra', lat: 17.6599, lon: 75.9064 },
  { name: 'Akola, Maharashtra', lat: 20.7002, lon: 77.0082 },
  { name: 'Azadpur, New Delhi', lat: 28.7041, lon: 77.1725 },
];

export default function WeatherPage() {
  const { language, t } = useLanguage();

  const [selectedPreset, setSelectedPreset] = useState<string>(LOCATION_PRESETS[0].name);
  const [lat, setLat] = useState<number>(LOCATION_PRESETS[0].lat);
  const [lon, setLon] = useState<number>(LOCATION_PRESETS[0].lon);

  const [loading, setLoading] = useState<boolean>(true);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live GPS Geolocation Hook
  const {
    latitude: liveLat,
    longitude: liveLon,
    accuracy: liveAccuracy,
    isLive: isLiveLocation,
    loading: geoLoading,
    requestLiveLocation,
  } = useGeolocation(LOCATION_PRESETS[0].lat, LOCATION_PRESETS[0].lon);

  const handleUseLiveLocation = () => {
    requestLiveLocation();
  };

  useEffect(() => {
    if (isLiveLocation) {
      queueMicrotask(() => {
        setLoading(true);
        setLat(liveLat);
        setLon(liveLon);
        setSelectedPreset(`Live Farm GPS (${liveLat.toFixed(2)}°N, ${liveLon.toFixed(2)}°E)`);
      });
    }
  }, [isLiveLocation, liveLat, liveLon]);

  useEffect(() => {
    let ignore = false;
    const fetchWeather = async () => {
      try {
        const isLive = selectedPreset.startsWith('Live Farm GPS') || isLiveLocation;
        const endpoint = isLive
          ? `/weather?latitude=${lat}&longitude=${lon}`
          : `/weather?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(selectedPreset)}`;
        const res = await apiRequest<WeatherResponse>(endpoint);
        if (!ignore) {
          setWeatherData(res);
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Weather fetch error:', err);
          setErrorMsg(t('noDataAvailable'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchWeather();
    return () => {
      ignore = true;
    };
  }, [lat, lon, selectedPreset, isLiveLocation, t]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const isLive = selectedPreset.startsWith('Live Farm GPS') || isLiveLocation;
      const endpoint = isLive
        ? `/weather?latitude=${lat}&longitude=${lon}`
        : `/weather?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(selectedPreset)}`;
      const res = await apiRequest<WeatherResponse>(endpoint);
      setWeatherData(res);
      setErrorMsg(null);
    } catch (err: unknown) {
      console.error('Weather fetch error:', err);
      setErrorMsg(t('noDataAvailable'));
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (name: string) => {
    setSelectedPreset(name);
    const found = LOCATION_PRESETS.find((p) => p.name === name);
    if (found) {
      setLoading(true);
      setLat(found.lat);
      setLon(found.lon);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
      case 'Moderate':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
      default:
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
    }
  };

  const currentTransitRisk = weatherData?.forecast_days?.[0]?.transport_risk_level || 'Low';

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Luxury Ambient Glow */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-[#0D824D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-10 w-96 h-96 bg-[#C5A45D]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#E3E8DF] dark:border-[#22382D] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#123B2A]/10 dark:bg-[#C5A45D]/15 text-[#123B2A] dark:text-[#E8D8B0] border border-[#C5A45D]/40 shadow-xs mb-2">
              <CloudSun className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span className="font-medium tracking-wide">{t('weather')} • Agro-Meteorological Intel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#202B24] dark:text-[#F7F6EF] tracking-tight">
              {language === 'hi' ? 'कृषि मौसम एवं सड़क परिवहन जोखिम' : language === 'mr' ? 'शेती हवामान व वाहतूक जोखीम' : 'Agro Weather & Produce Transit Risk'}
            </h1>
            <p className="mt-1.5 text-[#6B756E] dark:text-[#9BA89F] text-sm max-w-2xl font-light leading-relaxed">
              {language === 'hi'
                ? 'सरकारी एवं मौसम विज्ञान डेटा के आधार पर वर्षा, आर्द्रता व मंडी परिवहन की सुरक्षा संबंधी दिशा-निर्देश।'
                : language === 'mr'
                ? 'पाऊस, आर्द्रता व वाऱ्याच्या वेगावरून शेतमाल वाहतूक आणि काढणीच्या सुरक्षित वेळेचे नियोजन करा.'
                : 'Real-time meteorological monitoring and transit advisories tailored for perishables heading to APMC mandis.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-xs shadow-md shadow-[#0D281D]/20 transition-all border border-[#C5A45D]/30 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C5A45D] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Forecast</span>
            </button>
          </div>
        </div>

        {/* Location Selector Bar */}
        <div className="card-luxury rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D824D]/10 dark:bg-[#123B2A] flex items-center justify-center text-[#0D824D] dark:text-[#C5A45D] border border-[#0D824D]/20 shrink-0">
                <MapPin className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B756E] dark:text-[#9BA89F]">
                  Observatory Location
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="mt-1 font-semibold text-[#202B24] dark:text-white bg-transparent border-b border-[#0D824D] focus:outline-none cursor-pointer text-sm"
                >
                  {isLiveLocation && (
                    <option value={selectedPreset} className="bg-white dark:bg-[#162720]">
                      📍 {weatherData ? weatherData.location_name : selectedPreset} (Live GPS: {lat.toFixed(2)}°N, {lon.toFixed(2)}°E)
                    </option>
                  )}
                  {LOCATION_PRESETS.map((p) => (
                    <option key={p.name} value={p.name} className="bg-white dark:bg-[#162720]">
                      {p.name} ({p.lat.toFixed(2)}°N, {p.lon.toFixed(2)}°E)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live GPS Button */}
            <button
              type="button"
              onClick={handleUseLiveLocation}
              disabled={geoLoading}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 hover:scale-[1.02] ${
                isLiveLocation
                  ? 'bg-[#0D281D] text-white border border-[#C5A45D]'
                  : 'bg-[#FAF9F5] dark:bg-[#12221B] text-[#123B2A] dark:text-[#F7F6EF] border border-[#E3E8DF] dark:border-[#22382D] hover:bg-[#E3E8DF]/60'
              }`}
              title="Detect live device GPS coordinates for farm weather"
            >
              <LocateFixed className={`w-3.5 h-3.5 text-[#C5A45D] ${geoLoading ? 'animate-spin' : ''}`} />
              <span>
                {geoLoading
                  ? 'Locating GPS...'
                  : isLiveLocation
                  ? `🟢 Live Farm GPS (±${liveAccuracy || 10}m)`
                  : '📍 Use Live GPS'}
              </span>
            </button>
          </div>

          {weatherData && (
            <div className="text-xs text-[#6B756E] dark:text-[#9BA89F] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D824D] animate-pulse" />
              <span className="font-medium">{weatherData.source_provider}</span>
            </div>
          )}
        </div>

        {/* Error Fallback */}
        {errorMsg && (
          <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-base">{t('noDataAvailable')}</h3>
              <p className="text-sm mt-1">
                Unable to reach real-time weather feed. Please verify network connectivity.
              </p>
            </div>
          </div>
        )}

        {/* Weather Content */}
        {weatherData && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Grid: Hero Weather Card (7 cols) + Transit Risk Advisory (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Current Weather Card */}
              <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-[#C5A45D]/40 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0D281D] via-[#123B2A] to-[#0A1F16]">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#0D824D]/25 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A45D] to-transparent opacity-80" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#C5A45D] text-[11px] font-bold uppercase tracking-wider">
                        Current Agro-Climate Observation
                      </span>
                      {isLiveLocation && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-[#0D824D]/50 text-white border border-[#66A65C]/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#66A65C] animate-ping" />
                          Live Farm GPS
                        </span>
                      )}
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F7F6EF] font-medium border border-white/15">
                      {weatherData.condition}
                    </span>
                  </div>

                  {/* Pinpointed Location Display */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-[#C5A45D]" />
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-bold text-white block">
                        {weatherData.location_name}
                      </span>
                      <span className="text-xs text-[#C5A45D]/90 font-mono">
                        Coordinates: {weatherData.latitude.toFixed(4)}°N, {weatherData.longitude.toFixed(4)}°E
                        {isLiveLocation && liveAccuracy ? ` (Accuracy ±${liveAccuracy}m)` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-baseline gap-4">
                    <span className="text-5xl sm:text-7xl font-black tracking-tight text-white">
                      {weatherData.current_temperature_c.toFixed(1)}°C
                    </span>
                    <span className="text-[#C5A45D] text-lg font-semibold">
                      {weatherData.condition}
                    </span>
                  </div>
                </div>

                {/* 4 Sensor Metrics */}
                <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-3 sm:grid-cols-4 gap-3 relative z-10">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center border border-white/10 hover:border-[#C5A45D]/40 transition-colors">
                    <Droplets className="w-4 h-4 mx-auto text-[#C5A45D] mb-1" />
                    <div className="text-[11px] text-[#F7F6EF]/80 font-medium">Humidity</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">{weatherData.current_humidity_pct}%</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center border border-white/10 hover:border-[#C5A45D]/40 transition-colors">
                    <CloudRain className="w-4 h-4 mx-auto text-[#C5A45D] mb-1" />
                    <div className="text-[11px] text-[#F7F6EF]/80 font-medium">Rainfall</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">{weatherData.current_precipitation_mm} mm</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center border border-white/10 hover:border-[#C5A45D]/40 transition-colors">
                    <Wind className="w-4 h-4 mx-auto text-[#C5A45D] mb-1" />
                    <div className="text-[11px] text-[#F7F6EF]/80 font-medium">Wind Speed</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">{weatherData.wind_speed_kmh} km/h</div>
                  </div>

                  <div className="hidden sm:block bg-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center border border-white/10 hover:border-[#C5A45D]/40 transition-colors">
                    <Sun className="w-4 h-4 mx-auto text-[#C5A45D] mb-1" />
                    <div className="text-[11px] text-[#F7F6EF]/80 font-medium">Precip Prob.</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                      {weatherData.forecast_days[0]?.precipitation_probability || 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit Risk & Advisory Card */}
              <div className="lg:col-span-5 card-luxury rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-[#202B24] dark:text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#0D824D]" />
                      <span>Produce Transit Advisory</span>
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border shadow-xs ${getRiskColor(currentTransitRisk)}`}>
                      {currentTransitRisk} Transit Risk
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs text-[#6B756E] dark:text-[#9BA89F]">
                    {currentTransitRisk === 'High' ? (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                        <strong className="block font-bold">Severe Moisture / Transit Hazard</strong>
                        <p>Rain or high winds exceed safe open transport thresholds. Perishables like onions and tomatoes face severe spoilage risks without heavy double-layer tarpaulins.</p>
                      </div>
                    ) : currentTransitRisk === 'Moderate' ? (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 space-y-1">
                        <strong className="block font-bold">Precautionary Tarpaulin Cover Advised</strong>
                        <p>Scattered rainfall expected along transit corridors. Ensure all bags/crates on transport trucks are secured with waterproof sheeting before leaving the farm gate.</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#12221B] border border-emerald-200 dark:border-[#22382D] text-[#123B2A] dark:text-emerald-300 space-y-1">
                        <strong className="block font-bold">Ideal Mandi Dispatch Road Conditions</strong>
                        <p>Dry highways, low precipitation probability, and mild winds. Produce will reach APMC yards in prime condition without moisture degradation.</p>
                      </div>
                    )}

                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0D824D] shrink-0" />
                        <span>Recommended departure: <strong className="text-[#202B24] dark:text-[#F7F6EF]">Early Morning (4:00 AM – 7:00 AM)</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0D824D] shrink-0" />
                        <span>Max recommended haul distance: <strong className="text-[#202B24] dark:text-[#F7F6EF]">120 km</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E3E8DF] dark:border-[#22382D] flex items-center justify-between">
                  <Link
                    href="/recommendations"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D824D] hover:text-[#0D281D] dark:hover:text-[#66A65C] transition-colors"
                  >
                    <span>Check Selling Decision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B756E] hover:text-[#202B24] dark:hover:text-white transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#C5A45D]" />
                    <span>View Alerts</span>
                  </Link>
                </div>
              </div>

            </div>

            {/* 7-Day Forecast Matrix */}
            <div className="card-luxury rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E8DF] dark:border-[#22382D] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#202B24] dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0D824D]" />
                    <span>7-Day Agricultural Harvest & Transit Outlook</span>
                  </h3>
                  <p className="text-xs text-[#6B756E] dark:text-[#9BA89F] mt-0.5">
                    Plan harvesting dates and market transport based on anticipated precipitation
                  </p>
                </div>
                <div className="text-xs font-medium text-[#6B756E] dark:text-[#9BA89F] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D824D] animate-pulse" />
                  <span>Updated every 6 hours from satellite & surface stations</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {weatherData.forecast_days.map((day, idx) => {
                  const dObj = new Date(day.date);
                  const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  return (
                    <div
                      key={day.date}
                      className={`p-4 rounded-2xl border transition-all hover:scale-[1.03] duration-300 flex flex-col justify-between ${
                        idx === 0
                          ? 'bg-[#0D824D]/10 dark:bg-[#12221B] border-[#0D824D] dark:border-[#C5A45D] shadow-sm'
                          : 'bg-[#FAF9F5]/70 dark:bg-[#121E19] border-[#E3E8DF] dark:border-[#22382D]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#202B24] dark:text-white">
                            {idx === 0 ? 'Today' : dayName}
                          </span>
                          <span className="text-[10px] text-[#6B756E] dark:text-[#9BA89F] font-mono">{dateStr}</span>
                        </div>

                        <div className="mt-3 text-center">
                          {day.precipitation_probability > 30 ? (
                            <CloudRain className="w-8 h-8 mx-auto text-[#0D824D]" />
                          ) : (
                            <Sun className="w-8 h-8 mx-auto text-[#C5A45D]" />
                          )}
                          <div className="text-xs font-semibold text-[#202B24] dark:text-white mt-2 truncate" title={day.condition}>
                            {day.condition}
                          </div>
                          <div className="text-sm font-bold mt-1 text-[#202B24] dark:text-white">
                            {day.temp_max_c.toFixed(0)}° / <span className="text-[#6B756E] dark:text-[#9BA89F] font-normal">{day.temp_min_c.toFixed(0)}°C</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E3E8DF] dark:border-[#22382D] space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B756E] dark:text-[#9BA89F]">Rain Prob:</span>
                          <span className="font-bold text-[#202B24] dark:text-white">{day.precipitation_probability}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B756E] dark:text-[#9BA89F]">Transit:</span>
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            day.transport_risk_level === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : day.transport_risk_level === 'Moderate' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-[#123B2A] dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {day.transport_risk_level}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
