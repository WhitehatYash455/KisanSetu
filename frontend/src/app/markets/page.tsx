"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import {
  MapPin,
  Search,
  Filter,
  ShieldCheck,
  Compass,
  AlertTriangle,
  Sparkles,
  BarChart2,
  Navigation,
  MessageSquare,
  X,
  Truck,
  Clock,
  Fuel,
  Receipt,
  LocateFixed,
  RefreshCw,
  Upload,
  Award,
  TrendingUp,
  ExternalLink,
  Layers,
  CheckCircle2,
  Info,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { useGeolocation } from '@/lib/use-geolocation';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

// Dynamically import client-only Leaflet Map component
const MandiMap = dynamic(() => import('@/components/MandiMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[440px] rounded-3xl bg-[#12221B]/40 flex flex-col items-center justify-center text-xs text-[#9BA89F] animate-pulse border border-[#C5A45D]/20 space-y-2">
      <div className="w-8 h-8 border-2 border-[#C5A45D] border-t-transparent rounded-full animate-spin"></div>
      <span className="font-serif tracking-wide text-[#FAF9F5]/80">Loading High-Precision Geospatial APMC Radar...</span>
    </div>
  ),
});

interface Commodity {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
  name_mr: string;
  category: string;
  standard_unit: string;
}

interface MarketPrice {
  id: string;
  market_id: string;
  market_name: string;
  market_state: string;
  market_district: string;
  commodity_id: string;
  commodity_name: string;
  variety?: string;
  grade?: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  price_unit: string;
  observation_date: string;
  source_name: string;
  is_live_api: boolean;
  data_freshness_status: 'live' | 'cached' | 'historical' | 'sample';
  distance_km?: number;
}

interface HistoricalPoint {
  date: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  volume_arrivals_quintals: number;
  source: string;
  freshness: string;
}

interface CompareResult {
  commodity_name: string;
  best_market_by_price: string;
  cheapest_market_by_price: string;
  price_differential: number;
  markets_compared: Array<{
    market_id: string;
    market_name: string;
    district: string;
    state: string;
    distance_km?: number;
    modal_price: number;
    min_price: number;
    max_price: number;
    price_spread: number;
    freshness: string;
    observation_date: string;
    source: string;
  }>;
}

interface MarketRouteResponse {
  market_id: string;
  market_name: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  road_distance_km: number;
  straight_line_distance_km: number;
  estimated_duration_minutes: number;
  estimated_diesel_cost: number;
  estimated_toll_cost: number;
  estimated_hamali_cost: number;
  total_transport_cost: number;
  route_geometry?: number[][];
  routing_provider: string;
  road_condition_risk: string;
}

interface NearbyMandiItem {
  market_id: string;
  market_code: string;
  market_name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  straight_line_distance_km: number;
  road_distance_km?: number;
  estimated_travel_minutes?: number;
  directions_url: string;
  latest_modal_price?: number;
  price_unit: string;
  observation_date?: string;
  data_freshness_status: string;
  estimated_transport_cost?: number;
  estimated_net_proceeds?: number;
  net_proceeds_per_quintal?: number;
  supported_commodities: string[];
}

interface NearbyMandisResponse {
  farmer_latitude: number;
  farmer_longitude: number;
  search_radius_km: number;
  commodity_id: string;
  total_mandis_found: number;
  mandis: NearbyMandiItem[];
  best_net_profit_market?: string;
  nearest_market?: string;
  highest_price_market?: string;
  recommendation_explanation?: string;
}

interface DataSourceHealth {
  source_name: string;
  official_url: string;
  status: string;
  update_frequency: string;
  requires_key: boolean;
  last_sync_timestamp?: string;
  records_ingested: number;
}

interface SystemDataStatusResponse {
  system_status: string;
  current_date: string;
  total_active_prices: number;
  official_sources: DataSourceHealth[];
  verified_markets_count: number;
  supported_commodities_count: number;
  auto_sync_interval: string;
}

interface ReverseGeocodeResponse {
  latitude: number;
  longitude: number;
  display_name: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  postcode?: string;
  provider: string;
  status: string;
}

export default function MarketsPage() {
  const { language, t } = useLanguage();

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<string>('c0010000-0000-0000-0000-000000000001'); // Onion default
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [historyData, setHistoryData] = useState<HistoricalPoint[]>([]);
  const [historyDays, setHistoryDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);

  // Search Radius & Quantity Load
  const [searchRadius, setSearchRadius] = useState<number>(100);
  const [loadQuintals, setLoadQuintals] = useState<number>(25.0);

  // Nearby Discovery & Profit Recommendation Engine State
  const [nearbyData, setNearbyData] = useState<NearbyMandisResponse | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(false);
  const [selectedMapMarketId, setSelectedMapMarketId] = useState<string | null>(null);

  // Reverse-Geocoded Address State
  const [reverseGeoDetails, setReverseGeoDetails] = useState<ReverseGeocodeResponse | null>(null);

  // System Data Transparency Health State
  const [dataStatus, setDataStatus] = useState<SystemDataStatusResponse | null>(null);

  // Compare multi-market state
  const [selectedMarketsForCompare, setSelectedMarketsForCompare] = useState<string[]>([
    'm0010000-0000-0000-0000-000000000001',
    'm0010000-0000-0000-0000-000000000002'
  ]);
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Route Logistics Modal State
  const [routeModalMarket, setRouteModalMarket] = useState<MarketPrice | null>(null);
  const [routeData, setRouteData] = useState<MarketRouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);

  // SMS Modal State
  const [smsModalMarket, setSmsModalMarket] = useState<MarketPrice | null>(null);
  const [smsPhone, setSmsPhone] = useState<string>('+919876543210');
  const [smsSending, setSmsSending] = useState<boolean>(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

  // Daily Automated Live Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Live Geolocation Hook with Auto-Request & District Presets
  const {
    latitude: farmerLat,
    longitude: farmerLon,
    accuracy: geoAccuracy,
    locationName: farmerLocationName,
    isLive: isLiveLocation,
    loading: geoLoading,
    error: geoError,
    requestLiveLocation,
    selectDistrict,
    districts,
  } = useGeolocation(18.4975, 73.8647, true);

  // Fetch Commodities
  useEffect(() => {
    let ignore = false;
    const fetchCommodities = async () => {
      try {
        const res = await apiRequest<Commodity[]>('/markets/commodities');
        if (!ignore && res) {
          setCommodities(res);
        }
      } catch (e) {
        console.error('Error fetching commodities:', e);
      }
    };
    fetchCommodities();
    return () => { ignore = true; };
  }, []);

  // Fetch System Data Transparency Status
  useEffect(() => {
    let ignore = false;
    const fetchDataStatus = async () => {
      try {
        const res = await apiRequest<SystemDataStatusResponse>('/data-status');
        if (!ignore && res) {
          setDataStatus(res);
        }
      } catch (e) {
        console.warn('Data status endpoint unreachable:', e);
      }
    };
    fetchDataStatus();
    return () => { ignore = true; };
  }, []);

  // Fetch Reverse-Geocoded Village / Taluka / District when farmer coordinates change
  useEffect(() => {
    let ignore = false;
    const fetchReverseGeo = async () => {
      try {
        const res = await apiRequest<ReverseGeocodeResponse>('/location/reverse-geocode', {
          method: 'POST',
          body: JSON.stringify({ latitude: farmerLat, longitude: farmerLon }),
        });
        if (!ignore && res) {
          setReverseGeoDetails(res);
        }
      } catch (e) {
        console.warn('Reverse geocoding error:', e);
      }
    };
    fetchReverseGeo();
    return () => { ignore = true; };
  }, [farmerLat, farmerLon]);

  // Fetch Nearby Mandis & Profit Recommendations
  useEffect(() => {
    let ignore = false;
    const fetchNearbyMandis = async () => {
      setNearbyLoading(true);
      try {
        const endpoint = `/markets/nearby?farmer_lat=${farmerLat}&farmer_lon=${farmerLon}&radius_km=${searchRadius}&commodity_id=${selectedCommodity}&quantity_quintals=${loadQuintals}`;
        const res = await apiRequest<NearbyMandisResponse>(endpoint);
        if (!ignore && res) {
          setNearbyData(res);
        }
      } catch (e) {
        console.error('Error fetching nearby mandis:', e);
        if (!ignore) setNearbyData(null);
      } finally {
        if (!ignore) setNearbyLoading(false);
      }
    };
    fetchNearbyMandis();
    return () => { ignore = true; };
  }, [farmerLat, farmerLon, searchRadius, selectedCommodity, loadQuintals]);

  // Fetch Standard Market Prices list
  useEffect(() => {
    let ignore = false;
    const fetchPrices = async () => {
      setLoading(true);
      try {
        let endpoint = `/markets/prices?limit=50&farmer_lat=${farmerLat}&farmer_lon=${farmerLon}`;
        if (selectedCommodity) {
          endpoint += `&commodity_id=${selectedCommodity}`;
        }
        if (selectedState !== 'ALL') {
          endpoint += `&state=${encodeURIComponent(selectedState)}`;
        }
        const res = await apiRequest<MarketPrice[]>(endpoint);
        if (!ignore) {
          setPrices(res || []);
        }
      } catch (e) {
        console.error('Error fetching market prices:', e);
        if (!ignore) { setPrices([]); }
      } finally {
        if (!ignore) { setLoading(false); }
      }
    };
    fetchPrices();
    return () => { ignore = true; };
  }, [selectedCommodity, selectedState, farmerLat, farmerLon]);

  // Fetch Historical Series
  useEffect(() => {
    let ignore = false;
    const fetchHistory = async () => {
      if (!selectedCommodity) return;
      try {
        const defaultMarket = 'm0010000-0000-0000-0000-000000000001';
        const res = await apiRequest<HistoricalPoint[]>(
          `/markets/history?commodity_id=${selectedCommodity}&market_id=${defaultMarket}&days=${historyDays}`
        );
        if (!ignore && res && Array.isArray(res)) {
          setHistoryData(res);
        }
      } catch (e) {
        console.warn('Historical price feed currently syncing:', e);
      }
    };
    fetchHistory();
    return () => { ignore = true; };
  }, [selectedCommodity, historyDays]);

  const handleTriggerDailySync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await apiRequest<{ status: string; records_count: number; message: string; date: string }>(
        '/markets/sync-daily',
        { method: 'POST' }
      );
      if (res && res.status === 'success') {
        setSyncFeedback(`✓ Fresh daily Mandi rates synchronized (${res.records_count} records for ${res.date})`);
        // Refresh active market prices
        let endpoint = `/markets/prices?limit=50&farmer_lat=${farmerLat}&farmer_lon=${farmerLon}`;
        if (selectedCommodity) {
          endpoint += `&commodity_id=${selectedCommodity}`;
        }
        if (selectedState !== 'ALL') {
          endpoint += `&state=${encodeURIComponent(selectedState)}`;
        }
        const refreshedPrices = await apiRequest<MarketPrice[]>(endpoint);
        setPrices(refreshedPrices || []);

        // Refresh nearby discovery
        const nearbyRes = await apiRequest<NearbyMandisResponse>(
          `/markets/nearby?farmer_lat=${farmerLat}&farmer_lon=${farmerLon}&radius_km=${searchRadius}&commodity_id=${selectedCommodity}&quantity_quintals=${loadQuintals}`
        );
        if (nearbyRes) setNearbyData(nearbyRes);

        setTimeout(() => setSyncFeedback(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Daily sync request failed.';
      setSyncFeedback(`Sync failed: ${msg}`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    setSyncFeedback(`Uploading & ingesting real feed: ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${baseUrl}/markets/upload-feed`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSyncFeedback(`✓ Imported ${file.name} successfully! (${data.sync_details?.records_count || 0} records)`);
        // Refresh active market prices
        let endpoint = `/markets/prices?limit=50&farmer_lat=${farmerLat}&farmer_lon=${farmerLon}`;
        if (selectedCommodity) {
          endpoint += `&commodity_id=${selectedCommodity}`;
        }
        if (selectedState !== 'ALL') {
          endpoint += `&state=${encodeURIComponent(selectedState)}`;
        }
        const refreshed = await apiRequest<MarketPrice[]>(endpoint);
        setPrices(refreshed || []);
      } else {
        setSyncFeedback(`Upload error: ${data.detail || 'Could not parse market feed file.'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setSyncFeedback(`Upload error: ${msg}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
      e.target.value = '';
    }
  };

  // Fetch Road Route
  const handleOpenRoute = async (m: MarketPrice | NearbyMandiItem) => {
    const syntheticPrice: MarketPrice = {
      id: m.market_id,
      market_id: m.market_id,
      market_name: m.market_name,
      market_state: 'state' in m ? m.state : m.market_state,
      market_district: 'district' in m ? m.district : m.market_district,
      commodity_id: selectedCommodity,
      commodity_name: activeCropName,
      min_price: (m as MarketPrice).min_price || (m as NearbyMandiItem).latest_modal_price || 0,
      max_price: (m as MarketPrice).max_price || (m as NearbyMandiItem).latest_modal_price || 0,
      modal_price: (m as MarketPrice).modal_price || (m as NearbyMandiItem).latest_modal_price || 0,
      price_unit: 'INR/Quintal',
      observation_date: (m as MarketPrice).observation_date || (m as NearbyMandiItem).observation_date || '',
      source_name: 'Agmarknet / Live APMC',
      is_live_api: true,
      data_freshness_status: 'live',
    };
    setRouteModalMarket(syntheticPrice);
    setRouteLoading(true);
    setRouteData(null);
    try {
      const res = await apiRequest<MarketRouteResponse>(
        `/markets/${m.market_id}/route?farmer_lat=${farmerLat}&farmer_lon=${farmerLon}&quantity_quintals=${loadQuintals}`
      );
      setRouteData(res);
    } catch (err: unknown) {
      console.error('Failed to calculate route:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  // Dispatch SMS
  const handleSendSMS = async () => {
    if (!smsPhone || smsPhone.length < 10 || !smsModalMarket) {
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
            crop_name: smsModalMarket.commodity_name,
            market_name: smsModalMarket.market_name,
            price: smsModalMarket.modal_price,
          })
        }
      );
      if (res.success) {
        setSmsStatus(`SMS Dispatched Successfully! (Ref: ${res.message_id} via ${res.provider})`);
        setTimeout(() => {
          setSmsModalMarket(null);
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
    if (!smsPhone || smsPhone.length < 10 || !smsModalMarket) {
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
          crop_name: smsModalMarket.commodity_name,
          market_name: smsModalMarket.market_name,
          price: smsModalMarket.modal_price,
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

  const handleRunComparison = async () => {
    if (selectedMarketsForCompare.length < 2) { return; }
    setIsComparing(true);
    try {
      const idsParam = selectedMarketsForCompare.map(id => `market_ids=${encodeURIComponent(id)}`).join('&');
      const res = await apiRequest<CompareResult>(
        `/markets/compare?commodity_id=${encodeURIComponent(selectedCommodity)}&${idsParam}&farmer_lat=${farmerLat}&farmer_lon=${farmerLon}`
      );
      setCompareData(res);
    } catch (e) {
      console.error('Error running comparison:', e);
    } finally {
      setIsComparing(false);
    }
  };

  const toggleMarketForCompare = (marketId: string) => {
    setSelectedMarketsForCompare(prev => {
      if (prev.includes(marketId)) {
        return prev.filter(id => id !== marketId);
      } else {
        if (prev.length >= 4) { return prev; }
        return [...prev, marketId];
      }
    });
  };

  const filteredPrices = prices.filter(p => {
    if (!searchQuery) { return true; }
    const q = searchQuery.toLowerCase();
    return (
      p.market_name.toLowerCase().includes(q) ||
      p.market_district.toLowerCase().includes(q) ||
      p.market_state.toLowerCase().includes(q)
    );
  });

  const activeCrop = commodities.find(c => c.id === selectedCommodity);
  const activeCropName = activeCrop
    ? (language === 'hi' ? activeCrop.name_hi : language === 'mr' ? activeCrop.name_mr : activeCrop.name_en)
    : 'Produce';

  // Prepare Mandis for Leaflet Map
  const mapMandis = (nearbyData?.mandis || []).map(m => ({
    market_id: m.market_id,
    market_name: m.market_name,
    district: m.district,
    state: m.state,
    latitude: m.latitude,
    longitude: m.longitude,
    straight_line_distance_km: m.straight_line_distance_km,
    road_distance_km: m.road_distance_km,
    latest_modal_price: m.latest_modal_price,
    estimated_net_proceeds: m.estimated_net_proceeds,
    net_proceeds_per_quintal: m.net_proceeds_per_quintal,
    directions_url: m.directions_url,
    isBestProfit: m.market_name === nearbyData?.best_net_profit_market,
  }));

  const bestProfitMandi = nearbyData?.mandis.find(m => m.market_name === nearbyData.best_net_profit_market);
  const nearestMandi = nearbyData?.mandis.find(m => m.market_name === nearbyData.nearest_market);
  const highestPriceMandi = nearbyData?.mandis.find(m => m.market_name === nearbyData.highest_price_market);

  return (
    <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient Luxury Glow Orbs */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-[#0D824D]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-[450px] h-[450px] bg-[#C5A45D]/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8">
      
        {/* 1. Executive Luxury Header with Verified APMC & Sync Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#E3E8DF] dark:border-[#22382D] pb-7">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-[#0D281D] text-[#C5A45D] border border-[#C5A45D]/40 shadow-xs flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A45D]" />
                <span>Verified AGMARKNET Feeds</span>
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#0D824D]/15 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5" />
                <span>OSRM High-Precision Routing</span>
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#C5A45D]/15 text-[#92722A] dark:text-[#C5A45D] border border-[#C5A45D]/30 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daily Ingestion Live</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#1A2621] dark:text-[#FAF9F5]">
              {t('mandiPrices')} & Geospatial Profit Discovery
            </h1>

            <p className="text-xs sm:text-sm text-[#6B756E] dark:text-[#9BA89F] max-w-3xl font-light leading-relaxed">
              Real-time APMC Mandi settlement intelligence from Agmarknet & data.gov.in. Compare spot prices, evaluate road freight deductions, and pinpoint the market delivering the maximum net bank realization.
            </p>

            {syncFeedback && (
              <div className="mt-2 text-xs font-semibold px-4 py-2 rounded-xl bg-[#0D281D] text-white border border-[#C5A45D] animate-fadeIn flex items-center gap-2 shadow-lg">
                <Sparkles className="w-4 h-4 text-[#C5A45D]" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>

          {/* Commodity & Sync Action Hub */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 shrink-0">
            <div className="w-full sm:w-60">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B756E] dark:text-[#9BA89F] mb-1.5">
                Active Commodity
              </label>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-white dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] font-bold text-xs focus:ring-1 focus:ring-[#0D824D] shadow-sm cursor-pointer outline-none transition"
              >
                {commodities.map((c) => {
                  const label = language === 'hi' ? c.name_hi : language === 'mr' ? c.name_mr : c.name_en;
                  return (
                    <option key={c.id} value={c.id}>
                      {label} ({c.code})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerDailySync}
                disabled={isSyncing}
                title="Sync today's APMC mandi records"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D281D] hover:bg-[#123B2A] text-white transition-all shadow-sm border border-[#C5A45D]/40 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C5A45D] ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Today'}</span>
              </button>

              <label
                title="Upload real Agmarknet or eNAM dataset (CSV / JSON)"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] border border-[#E3E8DF] dark:border-[#22382D] hover:border-[#0D824D] transition-all shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#0D824D]" />
                <span>Import Feed</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 2. Official Data Transparency & Source Status Bar */}
        {dataStatus && (
          <div className="card-luxury p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-[#1A2621] dark:text-[#FAF9F5] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#0D824D]" />
                <span>Official Mandi Settlement Feeds:</span>
              </span>
              <a
                href="https://agmarknet.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/70 dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-[#1A2621] dark:text-[#FAF9F5] hover:border-[#0D824D] font-medium transition-colors"
              >
                <span>AGMARKNET (agmarknet.gov.in)</span>
                <ExternalLink className="w-3 h-3 text-[#6B756E]" />
              </a>
              <a
                href="https://data.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/70 dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-[#1A2621] dark:text-[#FAF9F5] hover:border-[#0D824D] font-medium transition-colors"
              >
                <span>Open Govt Data (data.gov.in)</span>
                <ExternalLink className="w-3 h-3 text-[#6B756E]" />
              </a>
              <span className="px-3 py-1 rounded-lg bg-[#0D281D] text-white font-mono text-[11px] border border-[#C5A45D]/40">
                Live Feed: {dataStatus.current_date} ({dataStatus.total_active_prices} APMC records)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#6B756E] dark:text-[#9BA89F] text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0D824D]" />
              <span>Automated Cadence: {dataStatus.auto_sync_interval}</span>
            </div>
          </div>
        )}

        {/* 3. Live Farmer Location, Search Radius & Reverse Geocoding Hub */}
        <div className="card-luxury p-6 sm:p-7 rounded-3xl space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Location State & Reverse-Geocoded Details */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-[#0D824D] dark:text-[#C5A45D] flex items-center gap-1.5">
                  <LocateFixed className="w-4 h-4 text-[#0D824D] dark:text-[#C5A45D]" />
                  <span>Farm Origin Coordinates</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isLiveLocation
                    ? 'bg-[#0D281D] text-white border border-[#C5A45D]'
                    : 'bg-[#FAF9F5] dark:bg-[#12221B] text-[#6B756E] dark:text-[#9BA89F] border border-[#E3E8DF] dark:border-[#22382D]'
                }`}>
                  {isLiveLocation ? `🟢 Live High-Precision GPS Active (±${geoAccuracy || 12}m)` : '⚪ Verified Regional Center'}
                </span>
              </div>

              <div className="flex items-baseline gap-2.5">
                <h2 className="text-xl font-serif font-black text-[#1A2621] dark:text-[#FAF9F5]">
                  {reverseGeoDetails?.display_name
                    ? `${reverseGeoDetails.village || reverseGeoDetails.taluka || reverseGeoDetails.district || 'Location'}, ${reverseGeoDetails.district || ''} (${reverseGeoDetails.state || 'Maharashtra'})`
                    : farmerLocationName}
                </h2>
                <span className="text-xs font-mono text-[#6B756E] dark:text-[#9BA89F]">
                  ({farmerLat.toFixed(4)}° N, {farmerLon.toFixed(4)}° E)
                </span>
              </div>

              {reverseGeoDetails && (
                <p className="text-xs text-[#6B756E] dark:text-[#9BA89F] line-clamp-1 font-light">
                  📍 {reverseGeoDetails.display_name}
                </p>
              )}
            </div>

            {/* Action Buttons: Use GPS & Manual District Picker */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={requestLiveLocation}
                disabled={geoLoading}
                suppressHydrationWarning
                className="px-4 py-2.5 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] active:scale-95 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all border border-[#C5A45D]/40 cursor-pointer disabled:opacity-50"
                title="Detect device GPS coordinates"
              >
                <LocateFixed className={`w-3.5 h-3.5 text-[#C5A45D] ${geoLoading ? 'animate-spin' : ''}`} />
                <span suppressHydrationWarning>
                  {geoLoading ? 'Acquiring GPS...' : '📍 Locate My Farm'}
                </span>
              </button>

              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) selectDistrict(e.target.value);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-xs font-semibold focus:outline-none focus:border-[#0D824D] cursor-pointer shadow-sm transition"
              >
                <option value="" disabled>Manual District Selector...</option>
                {districts.map((d) => (
                  <option key={d.name} value={d.name}>{d.name} ({d.state})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Radius & Produce Load Controls */}
          <div className="pt-4 border-t border-[#E3E8DF] dark:border-[#22382D] flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Radius Selector Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#0D824D]" />
                <span>Search Horizon:</span>
              </span>
              {[25, 50, 100, 200].map((radius) => (
                <button
                  key={radius}
                  type="button"
                  onClick={() => setSearchRadius(radius)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    searchRadius === radius
                      ? 'bg-[#0D281D] text-white shadow-sm border border-[#C5A45D]'
                      : 'bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] border border-[#E3E8DF] dark:border-[#22382D] hover:border-[#0D824D]'
                  }`}
                >
                  {radius} km
                </button>
              ))}
              <span className="text-[11px] text-[#6B756E] dark:text-[#9BA89F] font-mono">
                ({nearbyData?.total_mandis_found || 0} APMC Mandis within {searchRadius} km)
              </span>
            </div>

            {/* Load Volume in Quintals (For Net Realization Calculation) */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                Harvest Volume:
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={loadQuintals}
                  onChange={(e) => setLoadQuintals(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-20 px-3 py-1.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-xs font-black text-right outline-none focus:border-[#0D824D] shadow-sm text-[#1A2621] dark:text-white"
                />
                <span className="text-xs font-bold text-[#6B756E] dark:text-[#9BA89F]">Quintals</span>
              </div>
            </div>

          </div>

          {geoError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{geoError} Defaulting to verified regional coordinates ({farmerLat.toFixed(2)}° N, {farmerLon.toFixed(2)}° E).</span>
            </div>
          )}

        </div>

        {/* 4. Interactive Geospatial Mandi Map */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
              <h2 className="text-xl font-serif font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                Geospatial Mandi Radar & Real-Time Coordinates
              </h2>
            </div>
            <span className="text-xs text-[#6B756E] dark:text-[#9BA89F] font-mono hidden sm:inline">
              Interactive Leaflet satellite grid showing candidate APMC mandis inside {searchRadius} km
            </span>
          </div>

          <div className="card-luxury p-2 rounded-3xl overflow-hidden border border-[#E3E8DF] dark:border-[#22382D] shadow-xl">
            <MandiMap
              farmerLat={farmerLat}
              farmerLon={farmerLon}
              farmerLocationName={reverseGeoDetails?.display_name || farmerLocationName}
              radiusKm={searchRadius}
              mandis={mapMandis}
              selectedMarketId={selectedMapMarketId}
              onSelectMarket={(id) => setSelectedMapMarketId(id)}
            />
          </div>
        </div>

        {/* 5. Profit-Based Market Recommendation Dashboard */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0D281D] via-[#123B2A] to-[#0D1F17] text-white shadow-2xl border border-[#C5A45D]/40 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0D824D]/30 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
            <div>
              <div className="flex items-center space-x-2.5">
                <Award className="w-6 h-6 text-[#C5A45D]" />
                <h2 className="text-2xl font-serif font-black tracking-tight text-white">
                  Smart Selling Decision Matrix ({activeCropName})
                </h2>
              </div>
              <p className="text-xs text-[#E8D8B0] mt-1 font-light">
                Evaluates spot prices against vehicle freight, diesel burn, toll gates, and APMC cess to calculate your real net bank credit.
              </p>
            </div>

            <div className="px-4 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-[#C5A45D]/40 text-xs font-mono font-bold text-[#C5A45D] shadow-sm">
              Consignment: {loadQuintals} Quintals
            </div>
          </div>

          {/* 3 Key Recommendation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
            
            {/* Card 1: Best Net Proceeds */}
            <div className="p-5 rounded-2xl bg-[#0D824D]/30 border-2 border-[#C5A45D] shadow-xl space-y-3 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-2 right-2 text-3xl opacity-20">🏆</div>
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C5A45D] text-[#0D281D]">
                  Optimal Profit Route
                </span>
                <span className="text-xs font-mono text-[#FAF9F5]/90">Max Realization</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {bestProfitMandi?.market_name || 'Evaluating routes...'}
                </h3>
                <p className="text-xs text-[#FAF9F5]/70 font-light">
                  {bestProfitMandi?.district}, {bestProfitMandi?.state}
                </p>
              </div>

              {bestProfitMandi ? (
                <div className="space-y-2 pt-1">
                  <div className="text-2xl font-black text-[#C5A45D]">
                    ₹{bestProfitMandi.estimated_net_proceeds?.toLocaleString()}
                    <span className="text-xs font-normal text-white"> total net</span>
                  </div>
                  <div className="text-xs font-semibold text-white bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                    Est. Realization: <strong className="text-[#C5A45D]">₹{bestProfitMandi.net_proceeds_per_quintal}/Qtl</strong>
                  </div>
                  <div className="text-[11px] text-[#FAF9F5]/80 pt-1">
                    Modal Rate: ₹{bestProfitMandi.latest_modal_price}/Qtl | Road: {bestProfitMandi.road_distance_km} km
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#FAF9F5]/80">No mandis found in horizon.</p>
              )}
            </div>

            {/* Card 2: Nearest Market */}
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 text-white border border-white/20">
                  Nearest APMC
                </span>
                <span className="text-xs font-mono text-[#C5A45D]">Min Transit Risk</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {nearestMandi?.market_name || 'Calculating...'}
                </h3>
                <p className="text-xs text-[#FAF9F5]/70 font-light">
                  {nearestMandi?.district}, {nearestMandi?.state}
                </p>
              </div>

              {nearestMandi ? (
                <div className="space-y-2 pt-1">
                  <div className="text-2xl font-black text-white">
                    {nearestMandi.road_distance_km} km
                    <span className="text-xs font-normal text-[#C5A45D]"> road distance</span>
                  </div>
                  <div className="text-xs text-[#FAF9F5]/80">
                    Transit Duration: ~{nearestMandi.estimated_travel_minutes} mins
                  </div>
                  <div className="text-[11px] text-[#C5A45D] pt-1">
                    Modal Rate: ₹{nearestMandi.latest_modal_price}/Qtl
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#FAF9F5]/80">No mandis found in horizon.</p>
              )}
            </div>

            {/* Card 3: Highest Quoted Price */}
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 text-white border border-white/20">
                  Peak Quoted Rate
                </span>
                <span className="text-xs font-mono text-[#C5A45D]">Top Quoted</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {highestPriceMandi?.market_name || 'Calculating...'}
                </h3>
                <p className="text-xs text-[#FAF9F5]/70 font-light">
                  {highestPriceMandi?.district}, {highestPriceMandi?.state}
                </p>
              </div>

              {highestPriceMandi ? (
                <div className="space-y-2 pt-1">
                  <div className="text-2xl font-black text-[#C5A45D]">
                    ₹{highestPriceMandi.latest_modal_price?.toLocaleString()}
                    <span className="text-xs font-normal text-white"> /Qtl</span>
                  </div>
                  <div className="text-xs text-[#FAF9F5]/80">
                    Road Distance: {highestPriceMandi.road_distance_km} km
                  </div>
                  <div className="text-[11px] text-[#C5A45D] pt-1">
                    Est. Net: ₹{highestPriceMandi.net_proceeds_per_quintal}/Qtl
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#FAF9F5]/80">No mandis found in horizon.</p>
              )}
            </div>

          </div>

          {/* Explainable Recommendation Rationale Banner */}
          {nearbyData?.recommendation_explanation && (
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-[#C5A45D]/40 text-xs text-[#FAF9F5] flex items-start space-x-3 relative z-10">
              <Sparkles className="w-5 h-5 text-[#C5A45D] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-[#C5A45D] text-[11px]">
                  Algorithmic Selling Rationale:
                </span>
                <p className="leading-relaxed font-light">
                  {nearbyData.recommendation_explanation}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* 6. Discovered Nearby Mandis Ranked Discovery Table / Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
              <h2 className="text-xl font-serif font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                Ranked Mandis by Realized Net Profit ({activeCropName})
              </h2>
            </div>
            <span className="text-xs text-[#6B756E] dark:text-[#9BA89F] font-mono">
              Horizon: {searchRadius} km | Consignment: {loadQuintals} Qtl
            </span>
          </div>

          {nearbyLoading ? (
            <div className="p-12 text-center card-luxury rounded-3xl space-y-3">
              <div className="w-8 h-8 border-2 border-[#0D824D] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-[#6B756E] dark:text-[#9BA89F]">Querying nearby mandis and computing OSRM transit deductions...</p>
            </div>
          ) : !nearbyData || nearbyData.mandis.length === 0 ? (
            <div className="p-8 text-center card-luxury rounded-3xl space-y-2">
              <p className="text-xs text-[#6B756E] dark:text-[#9BA89F]">
                No APMC mandis found within {searchRadius} km of your farm origin. Expand the horizon to 100 km or 200 km above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyData.mandis.map((m, idx) => {
                const isBest = m.market_name === nearbyData.best_net_profit_market;
                return (
                  <div
                    key={`${m.market_id}-${idx}`}
                    className={`card-luxury p-6 rounded-3xl flex flex-col justify-between space-y-4 transition-all ${
                      isBest
                        ? 'border-2 border-[#C5A45D] ring-1 ring-[#C5A45D]/40 shadow-xl'
                        : 'hover:border-[#0D824D]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isBest
                            ? 'bg-[#0D281D] text-white border border-[#C5A45D]'
                            : 'bg-[#FAF9F5] dark:bg-[#12221B] text-[#6B756E] dark:text-[#9BA89F] border border-[#E3E8DF] dark:border-[#22382D]'
                        }`}>
                          {isBest ? '🏆 Top Net Realization' : `Rank #${idx + 1}`}
                        </span>
                        <span className="text-xs font-mono text-[#6B756E] dark:text-[#9BA89F]">
                          {m.observation_date || 'Live APMC'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-serif font-bold text-[#1A2621] dark:text-white">
                          {m.market_name}
                        </h3>
                        <div className="flex items-center space-x-1.5 text-xs text-[#6B756E] dark:text-[#9BA89F] mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#0D824D] shrink-0" />
                          <span>{m.district}, {m.state}</span>
                        </div>
                      </div>

                      {/* Price and Deductions Breakdown Box */}
                      <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] space-y-2 text-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold text-[#6B756E] dark:text-[#9BA89F]">Modal Rate:</span>
                          <span className="text-lg font-bold text-[#0D281D] dark:text-[#C5A45D]">
                            ₹{m.latest_modal_price?.toLocaleString() || '—'}
                            <span className="text-[10px] text-[#6B756E] font-normal"> /Qtl</span>
                          </span>
                        </div>

                        <div className="flex justify-between text-[#6B756E] dark:text-[#9BA89F] pt-1.5 border-t border-[#E3E8DF] dark:border-[#22382D]">
                          <span>Road Distance:</span>
                          <span className="font-semibold text-[#1A2621] dark:text-white">{m.road_distance_km} km (~{m.estimated_travel_minutes} mins)</span>
                        </div>

                        <div className="flex justify-between text-[#6B756E] dark:text-[#9BA89F]">
                          <span>Freight & Cess Est:</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">₹{m.estimated_transport_cost?.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between pt-1.5 border-t border-[#E3E8DF] dark:border-[#22382D] font-bold text-[#0D281D] dark:text-[#C5A45D]">
                          <span>Est. Net Realization:</span>
                          <span className="text-sm font-black text-[#0D824D] dark:text-[#C5A45D]">₹{m.net_proceeds_per_quintal?.toLocaleString()} /Qtl</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#E3E8DF] dark:border-[#22382D]">
                      <a
                        href={m.directions_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition border border-[#C5A45D]/30"
                      >
                        <Navigation className="w-3 h-3 text-[#C5A45D]" />
                        <span>Directions</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleOpenRoute(m)}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] dark:bg-[#12221B] text-[#0D281D] dark:text-[#FAF9F5] border border-[#E3E8DF] dark:border-[#22382D] hover:border-[#0D824D] text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                      >
                        <Truck className="w-3 h-3 text-[#0D824D]" />
                        <span>Logistics Cost</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 7. Filter & Search Bar for Full State-wide APMC Records */}
        <div className="card-luxury p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by APMC mandi name, district, or market center..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-white text-xs focus:outline-none focus:border-[#0D824D] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-[#6B756E] shrink-0" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-xs font-semibold focus:outline-none focus:border-[#0D824D] cursor-pointer"
              >
                <option value="ALL">All Agricultural States</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Punjab">Punjab</option>
                <option value="NCT of Delhi">NCT of Delhi</option>
              </select>
            </div>
          </div>
        </div>

        {/* 8. Verified Mandi Cards Grid */}
        {loading ? (
          <div className="p-12 text-center card-luxury rounded-3xl space-y-3">
            <div className="w-8 h-8 border-2 border-[#0D824D] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-[#6B756E] dark:text-[#9BA89F]">Retrieving official Agmarknet mandi settlement records...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="p-12 text-center card-luxury rounded-3xl space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-[#1A2621] dark:text-[#FAF9F5]">
              {t('noDataAvailable')}
            </h3>
            <p className="text-xs text-[#6B756E] dark:text-[#9BA89F] max-w-md mx-auto">
              No live government observations found for {activeCropName} in the selected criteria today. We never fabricate synthetic rates. Please select &quot;All Agricultural States&quot; or check historical records.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrices.map((price, idx) => (
              <div
                key={`${price.id || 'price'}-${price.market_id || ''}-${idx}`}
                className="card-luxury p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[#0D824D] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0D824D]/15 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30">
                      {price.data_freshness_status === 'live' ? t('freshnessLive') : price.data_freshness_status}
                    </span>
                    <span className="text-xs text-[#6B756E] dark:text-[#9BA89F] font-mono">
                      {price.observation_date}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1A2621] dark:text-white">
                      {price.market_name}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-[#6B756E] dark:text-[#9BA89F] mt-0.5">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0D824D] shrink-0" />
                        <span>{price.market_district}, {price.market_state}</span>
                      </div>
                      {price.distance_km !== undefined && price.distance_km !== null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0D824D]/15 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 shrink-0">
                          📍 {price.distance_km} km
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[#6B756E] dark:text-[#9BA89F]">Modal Price:</span>
                      <span className="text-2xl font-black text-[#0D824D] dark:text-[#C5A45D]">
                        ₹{price.modal_price.toLocaleString()}
                        <span className="text-xs text-[#6B756E] font-normal"> /Qtl</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#6B756E] dark:text-[#9BA89F] pt-1.5 border-t border-[#E3E8DF] dark:border-[#22382D]">
                      <span>Min: ₹{price.min_price.toLocaleString()}</span>
                      <span>Max: ₹{price.max_price.toLocaleString()}</span>
                      <span>Spread: ₹{(price.max_price - price.min_price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Route, SMS, and Compare */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E8DF] dark:border-[#22382D]">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenRoute(price)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#0D824D]/10 dark:bg-[#0D824D]/20 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 hover:bg-[#0D824D]/20 text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Logistics</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSmsModalMarket(price)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] hover:border-[#0D824D] border border-[#E3E8DF] dark:border-[#22382D] text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>SMS Alert</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleMarketForCompare(price.market_id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      selectedMarketsForCompare.includes(price.market_id)
                        ? 'bg-[#0D281D] text-white border border-[#C5A45D]'
                        : 'bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] border border-[#E3E8DF] dark:border-[#22382D] hover:border-[#0D824D]'
                    }`}
                  >
                    {selectedMarketsForCompare.includes(price.market_id) ? '✓ In Matrix' : '+ Compare'}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* 9. Historical Price Trends Chart (Recharts) */}
        <div className="card-luxury p-6 sm:p-8 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
                <h2 className="text-xl font-serif font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                  Historical Modal Price Trajectory ({activeCropName})
                </h2>
              </div>
              <p className="text-xs text-[#6B756E] dark:text-[#9BA89F] mt-0.5 font-light">
                Daily recorded modal settlement movements with min/max price band envelopes from Agmarknet
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {[7, 15, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setHistoryDays(d)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    historyDays === d
                      ? 'bg-[#0D281D] text-white shadow-sm border border-[#C5A45D]'
                      : 'bg-[#FAF9F5] dark:bg-[#12221B] text-[#6B756E] dark:text-[#9BA89F] border border-[#E3E8DF] dark:border-[#22382D]'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {historyData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D824D" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0D824D" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D281D',
                      borderColor: '#C5A45D',
                      borderRadius: '16px',
                      color: '#FAF9F5',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    formatter={(value: unknown) => [typeof value === 'number' || typeof value === 'string' ? `₹${value}/Qtl` : '', '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="max_price" stroke="#C5A45D" strokeDasharray="3 3" fill="none" name="Max Quoted" />
                  <Area type="monotone" dataKey="modal_price" stroke="#0D824D" strokeWidth={3} fillOpacity={1} fill="url(#modalGradient)" name="Modal Settlement" />
                  <Area type="monotone" dataKey="min_price" stroke="#DC2626" strokeDasharray="3 3" fill="none" name="Min Quoted" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[#6B756E] dark:text-[#9BA89F]">
              Historical records synchronizing from APMC database...
            </div>
          )}
        </div>

        {/* 10. Side-by-Side Market Comparison Module */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0D281D] via-[#123B2A] to-[#0D1F17] text-white shadow-2xl border border-[#C5A45D]/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-[#C5A45D]" />
                <h2 className="text-xl font-serif font-bold">
                  Side-by-Side APMC Comparison Matrix ({activeCropName})
                </h2>
              </div>
              <p className="text-xs text-[#E8D8B0] mt-1 font-light">
                Compare price realizations, spreads, and road distances across up to 4 candidate APMC mandis
              </p>
            </div>

            <button
              onClick={handleRunComparison}
              disabled={isComparing || selectedMarketsForCompare.length < 2}
              className="px-5 py-2.5 rounded-xl bg-[#C5A45D] text-[#0D281D] hover:bg-[#d6b772] font-bold text-xs shadow-md transition-all flex items-center space-x-2 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#0D281D]" />
              <span>{isComparing ? 'Evaluating Matrix...' : 'Run Side-by-Side Comparison'}</span>
            </button>
          </div>

          {compareData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#E8D8B0]">
                <div>
                  Highest Settlement: <strong className="text-white">{compareData.best_market_by_price}</strong>
                </div>
                <div>
                  Price Spread Differential: <strong className="text-[#C5A45D]">₹{compareData.price_differential}/Qtl</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {compareData.markets_compared.map((m, idx) => (
                  <div
                    key={m.market_id}
                    className={`p-5 rounded-2xl border ${
                      idx === 0
                        ? 'bg-[#0D824D]/30 border-[#C5A45D] shadow-lg'
                        : 'bg-white/5 border-white/10'
                    } space-y-3 backdrop-blur-md`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#C5A45D]">
                        Rank #{idx + 1}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-black/40 text-[#E8D8B0]">
                        {m.freshness}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white">{m.market_name}</h4>
                      <span className="text-xs text-[#FAF9F5]/70">{m.district}, {m.state}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-2xl font-black text-white">
                        ₹{m.modal_price.toLocaleString()}
                        <span className="text-xs font-normal text-[#C5A45D]"> /Qtl</span>
                      </div>
                      <div className="text-[11px] text-[#FAF9F5]/80">
                        Spread: ₹{m.min_price} - ₹{m.max_price}
                      </div>
                    </div>

                    {m.distance_km && (
                      <div className="flex items-center space-x-1 text-xs text-[#C5A45D] pt-2 border-t border-white/10">
                        <MapPin className="w-3.5 h-3.5 text-[#C5A45D]" />
                        <span>{m.distance_km} km from Farm Gate</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#E8D8B0]">
              Click &apos;Run Side-by-Side Comparison&apos; to evaluate prices, spreads, and distances between selected mandis.
            </div>
          )}
        </div>

        {/* 11. Road Route & Logistics Radar Modal */}
        {routeModalMarket && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="card-luxury rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#C5A45D]/40 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-[#E3E8DF] dark:border-[#22382D] pb-4">
                <div className="flex items-center space-x-2 text-[#1A2621] dark:text-[#FAF9F5] font-serif font-bold text-lg">
                  <Navigation className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
                  <span>Freight & Route Logistics: {routeModalMarket.market_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRouteModalMarket(null)}
                  className="text-[#6B756E] hover:text-[#1A2621] dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {routeLoading ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#0D824D] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-[#6B756E] dark:text-[#9BA89F]">Querying OSRM road geometry and calculating freight logistics...</p>
                </div>
              ) : routeData && (
                <div className="space-y-6">
                  
                  {/* Vehicle Load Volume Selector */}
                  <div className="flex items-center justify-between text-xs bg-[#FAF9F5] dark:bg-[#0D1F17] p-3.5 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D]">
                    <span className="font-semibold text-[#1A2621] dark:text-[#FAF9F5]">Consignment Volume (Quintals for Hamali & Freight):</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={loadQuintals}
                        onChange={(e) => {
                          const val = Math.max(1, parseFloat(e.target.value) || 1);
                          setLoadQuintals(val);
                        }}
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-white dark:bg-[#12221B] text-xs font-bold text-right outline-none text-[#1A2621] dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => routeModalMarket && handleOpenRoute(routeModalMarket)}
                        className="px-3 py-1.5 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] text-white font-bold text-xs shadow-sm cursor-pointer border border-[#C5A45D]/40"
                      >
                        Recalculate
                      </button>
                    </div>
                  </div>

                  {/* Distance & Time Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#0D824D]/10 border border-[#0D824D]/30 text-center space-y-1">
                      <Truck className="w-4 h-4 text-[#0D824D] mx-auto" />
                      <span className="text-[10px] uppercase font-bold text-[#6B756E] dark:text-[#9BA89F]">Road Distance</span>
                      <div className="text-lg font-black text-[#0D824D] dark:text-[#66A65C]">
                        {routeData.road_distance_km} km
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF9F5] dark:bg-[#12221B] border border-[#E3E8DF] dark:border-[#22382D] text-center space-y-1">
                      <Clock className="w-4 h-4 text-[#6B756E] mx-auto" />
                      <span className="text-[10px] uppercase font-bold text-[#6B756E] dark:text-[#9BA89F]">Transit Time</span>
                      <div className="text-lg font-black text-[#1A2621] dark:text-[#FAF9F5]">
                        {Math.floor(routeData.estimated_duration_minutes / 60)}h {Math.round(routeData.estimated_duration_minutes % 60)}m
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF9F5] dark:bg-[#12221B] border border-[#E3E8DF] dark:border-[#22382D] text-center space-y-1">
                      <Fuel className="w-4 h-4 text-amber-600 mx-auto" />
                      <span className="text-[10px] uppercase font-bold text-[#6B756E] dark:text-[#9BA89F]">Fuel & Toll</span>
                      <div className="text-lg font-black text-[#1A2621] dark:text-[#FAF9F5]">
                        ₹{(routeData.estimated_diesel_cost + routeData.estimated_toll_cost).toFixed(0)}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#C5A45D]/15 border border-[#C5A45D]/30 text-center space-y-1">
                      <Receipt className="w-4 h-4 text-[#C5A45D] mx-auto" />
                      <span className="text-[10px] uppercase font-bold text-[#6B756E] dark:text-[#9BA89F]">Total Cost</span>
                      <div className="text-lg font-black text-[#C5A45D]">
                        ₹{routeData.total_transport_cost.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Route Topology */}
                  <div className="p-4 rounded-2xl bg-[#0D281D] text-white space-y-2 border border-[#C5A45D]/30">
                    <div className="flex items-center justify-between text-xs text-[#FAF9F5]/70">
                      <span>Route Topology ({routeData.routing_provider})</span>
                      <span className="text-[#C5A45D] font-bold">{routeData.road_condition_risk} Risk Profile</span>
                    </div>
                    
                    <div className="relative h-24 bg-[#081710] rounded-xl p-3 flex items-center justify-between border border-white/10 overflow-hidden">
                      <div className="flex items-center space-x-2 z-10">
                        <div className="w-4 h-4 rounded-full bg-[#0D824D] border-2 border-white animate-pulse"></div>
                        <div className="text-xs">
                          <div className="font-bold text-[#0D824D]">Farm Origin</div>
                          <div className="text-[10px] text-[#FAF9F5]/60">{farmerLocationName}</div>
                        </div>
                      </div>

                      <div className="flex-1 mx-4 border-t-2 border-dashed border-[#C5A45D]/60 relative">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#081710] px-2 py-0.5 rounded text-[10px] font-mono text-[#C5A45D]">
                          {routeData.road_distance_km} km via Highway
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 z-10 text-right">
                        <div className="text-xs">
                          <div className="font-bold text-[#C5A45D]">{routeModalMarket.market_name}</div>
                          <div className="text-[10px] text-[#FAF9F5]/60">{routeModalMarket.market_district}</div>
                        </div>
                        <div className="w-4 h-4 rounded-full bg-[#C5A45D] border-2 border-white"></div>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Cost Breakdown Sheet */}
                  <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-xs space-y-2">
                    <span className="font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                      Itemized Farm-to-Mandi Cost Deductions:
                    </span>
                    <div className="flex justify-between py-1 border-b border-[#E3E8DF] dark:border-[#22382D] text-[#6B756E] dark:text-[#9BA89F]">
                      <span>Diesel Fuel Consumption (loaded return):</span>
                      <span className="font-mono font-bold text-[#1A2621] dark:text-[#FAF9F5]">₹{routeData.estimated_diesel_cost}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E3E8DF] dark:border-[#22382D] text-[#6B756E] dark:text-[#9BA89F]">
                      <span>Highway Toll Gate Passes:</span>
                      <span className="font-mono font-bold text-[#1A2621] dark:text-[#FAF9F5]">₹{routeData.estimated_toll_cost}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E3E8DF] dark:border-[#22382D] text-[#6B756E] dark:text-[#9BA89F]">
                      <span>Hamali (Loading/Unloading {loadQuintals} Qtl @ ₹18/qtl):</span>
                      <span className="font-mono font-bold text-[#1A2621] dark:text-[#FAF9F5]">₹{routeData.estimated_hamali_cost}</span>
                    </div>
                    <div className="flex justify-between py-1 pt-2 font-bold text-[#0D824D] dark:text-[#C5A45D] text-sm">
                      <span>Total Transit Deduction:</span>
                      <span className="font-mono">₹{routeData.total_transport_cost}</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setRouteModalMarket(null)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0D281D] text-white hover:bg-[#123B2A] transition cursor-pointer border border-[#C5A45D]/40"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12. SMS & WhatsApp Dispatch Modal */}
        {smsModalMarket && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="card-luxury rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#C5A45D]/40 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#E3E8DF] dark:border-[#22382D] pb-3">
                <div className="flex items-center space-x-2 text-[#1A2621] dark:text-[#FAF9F5] font-serif font-bold text-base">
                  <MessageSquare className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
                  <span>Dispatch Mandi Rate Alert</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsModalMarket(null)}
                  className="text-[#6B756E] hover:text-[#1A2621] dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#6B756E] dark:text-[#9BA89F] leading-relaxed">
                Sends live APMC mandi spot price alert for <strong>{smsModalMarket.market_name}</strong> to your registered handset.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                    Mobile Phone Number (मोबाइल नंबर)
                  </label>
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-white text-sm font-mono focus:outline-none focus:border-[#0D824D]"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#6B756E] dark:text-[#9BA89F]">Message Preview:</span>
                  <p className="text-[#1A2621] dark:text-white italic">
                    {language === 'mr'
                      ? `[कृषीसेतू सूचना] ${smsModalMarket.market_name} येथे ${smsModalMarket.commodity_name} चा दर ₹${smsModalMarket.modal_price}/क्विंटल झाला आहे.`
                      : language === 'hi'
                      ? `[कृषिसेतु अलर्ट] ${smsModalMarket.market_name} में ${smsModalMarket.commodity_name} का भाव ₹${smsModalMarket.modal_price}/क्विंटल पहुंचा।`
                      : `[KrishiSetu Alert] ${smsModalMarket.commodity_name} reached ₹${smsModalMarket.modal_price}/Qtl at ${smsModalMarket.market_name}.`}
                  </p>
                </div>

                {smsStatus && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    smsStatus.startsWith('Error')
                      ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                      : 'bg-[#0D824D]/15 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30'
                  }`}>
                    {smsStatus}
                  </div>
                )}
              </div>

              {/* Direct Handset Delivery Options */}
              <div className="pt-2 border-t border-[#E3E8DF] dark:border-[#22382D] space-y-2">
                <span className="text-[11px] font-semibold text-[#6B756E] dark:text-[#9BA89F]">Instant 1-Tap Delivery:</span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${smsPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      language === 'mr'
                        ? `🌾 [कृषीसेतू सूचना] ${smsModalMarket.market_name} येथे ${smsModalMarket.commodity_name} चा दर ₹${smsModalMarket.modal_price}/क्विंटल झाला आहे.\nतपशील: http://localhost:3000/markets`
                        : language === 'hi'
                        ? `🌾 [कृषिसेतु अलर्ट] ${smsModalMarket.market_name} में ${smsModalMarket.commodity_name} का भाव ₹${smsModalMarket.modal_price}/क्विंटल पहुंचा।\nविवरण: http://localhost:3000/markets`
                        : `🌾 [KrishiSetu Alert] ${smsModalMarket.commodity_name} reached ₹${smsModalMarket.modal_price}/Qtl at ${smsModalMarket.market_name}.\nDetails: http://localhost:3000/markets`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0D824D]/15 hover:bg-[#0D824D]/25 text-[#0D824D] dark:text-[#66A65C] border border-[#0D824D]/30 transition"
                  >
                    <span>💬 WhatsApp 1-Tap</span>
                  </a>
                  <a
                    href={`sms:${smsPhone.replace(/\s+/g, '')}?body=${encodeURIComponent(
                      language === 'mr'
                        ? `[कृषीसेतू सूचना] ${smsModalMarket.market_name} येथे ${smsModalMarket.commodity_name} चा दर ₹${smsModalMarket.modal_price}/क्विंटल झाला आहे.`
                        : language === 'hi'
                        ? `[कृषिसेतु अलर्ट] ${smsModalMarket.market_name} में ${smsModalMarket.commodity_name} का भाव ₹${smsModalMarket.modal_price}/क्विंटल पहुंचा।`
                        : `[KrishiSetu Alert] ${smsModalMarket.commodity_name} reached ₹${smsModalMarket.modal_price}/Qtl at ${smsModalMarket.market_name}.`
                    )}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#FAF9F5] dark:bg-[#12221B] hover:border-[#0D824D] text-[#1A2621] dark:text-[#FAF9F5] border border-[#E3E8DF] dark:border-[#22382D] transition"
                  >
                    <span>📱 Native SMS</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSmsModalMarket(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B756E] dark:text-[#9BA89F] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppCloud}
                  disabled={waSending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D824D] hover:bg-[#126b42] text-white flex items-center space-x-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  {waSending ? <span>Dispatching...</span> : <span>☁️ WhatsApp Cloud</span>}
                </button>
                <button
                  type="button"
                  onClick={handleSendSMS}
                  disabled={smsSending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D281D] hover:bg-[#123B2A] text-white flex items-center space-x-1.5 shadow cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
                >
                  {smsSending ? (
                    <span>Sending...</span>
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
