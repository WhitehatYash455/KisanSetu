"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MandiMapItem {
  market_id: string;
  market_name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  straight_line_distance_km: number;
  road_distance_km?: number;
  latest_modal_price?: number;
  estimated_net_proceeds?: number;
  net_proceeds_per_quintal?: number;
  directions_url: string;
  isBestProfit?: boolean;
}

interface MandiMapProps {
  farmerLat: number;
  farmerLon: number;
  farmerLocationName: string;
  radiusKm: number;
  mandis: MandiMapItem[];
  selectedMarketId?: string | null;
  onSelectMarket?: (marketId: string) => void;
}

export default function MandiMap({
  farmerLat,
  farmerLon,
  farmerLocationName,
  radiusKm,
  mandis,
  selectedMarketId,
  onSelectMarket,
}: MandiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [farmerLat, farmerLon],
        zoom: radiusKm <= 50 ? 9 : radiusKm <= 100 ? 8 : 7,
        zoomControl: true,
        attributionControl: false,
      });

      // Standard OpenStreetMap tiles (100% public, verified, and free)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Attribution
      L.control.attribution({
        prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Markers, Farmer Marker, and Radius Circle when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Farmer Marker with Pulsing Ring
    const farmerIcon = L.divIcon({
      className: 'farmer-marker-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #059669; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
            🌾
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });

    const farmerMarker = L.marker([farmerLat, farmerLon], { icon: farmerIcon });
    farmerMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 180px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #065f46; margin-bottom: 4px;">
          <span>📍</span> <span>Your Current Location</span>
        </div>
        <div style="font-weight: 600; color: #1f2937;">${farmerLocationName}</div>
        <div style="font-size: 11px; color: #6b7280; font-family: monospace; margin-top: 2px;">
          ${farmerLat.toFixed(4)}°N, ${farmerLon.toFixed(4)}°E
        </div>
      </div>
    `);
    markersGroup.addLayer(farmerMarker);

    // 2. Search Radius Circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }
    const circle = L.circle([farmerLat, farmerLon], {
      radius: radiusKm * 1000,
      color: '#10b981',
      weight: 1.5,
      opacity: 0.6,
      fillColor: '#10b981',
      fillOpacity: 0.05,
      dashArray: '4, 6',
    }).addTo(map);
    radiusCircleRef.current = circle;

    // 3. APMC Mandi Markers
    const bounds = L.latLngBounds([L.latLng(farmerLat, farmerLon)]);

    mandis.forEach((m) => {
      bounds.extend([m.latitude, m.longitude]);

      const isSelected = selectedMarketId === m.market_id;
      const isTopProfit = m.isBestProfit;

      const bgColor = isTopProfit ? '#047857' : isSelected ? '#0284c7' : '#d97706';
      const labelBadge = isTopProfit ? '🏆 Best Profit' : `₹${m.latest_modal_price || '—'}`;

      const mandiIcon = L.divIcon({
        className: 'mandi-marker-pin',
        html: `
          <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
            <div style="background: ${bgColor}; color: #ffffff; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.25); border: 1.5px solid #ffffff;">
              ${labelBadge}
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${bgColor}; margin-top: -1px;"></div>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 30],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([m.latitude, m.longitude], { icon: mandiIcon });

      const priceHtml = m.latest_modal_price
        ? `<div style="font-size: 15px; font-weight: 800; color: #047857; margin: 4px 0;">₹${m.latest_modal_price.toLocaleString()} <span style="font-size: 10px; color: #6b7280; font-weight: 500;">/Qtl</span></div>`
        : '<div style="font-size: 11px; color: #9ca3af;">Price not reported</div>';

      const netProfitHtml = m.net_proceeds_per_quintal
        ? `<div style="font-size: 11px; color: #065f46; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; margin: 4px 0; border: 1px solid #a7f3d0;">
             <strong>Est. Net Realization:</strong> ₹${m.net_proceeds_per_quintal.toLocaleString()} /Qtl
           </div>`
        : '';

      const distHtml = m.road_distance_km
        ? `🛣️ <strong>${m.road_distance_km} km road</strong> (${m.straight_line_distance_km} km aerial)`
        : `📍 <strong>${m.straight_line_distance_km} km</strong> aerial`;

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 220px; padding: 2px;">
          <div style="font-weight: 800; font-size: 13px; color: #111827; margin-bottom: 2px;">${m.market_name}</div>
          <div style="font-size: 11px; color: #4b5563; margin-bottom: 4px;">${m.district}, ${m.state}</div>
          ${priceHtml}
          ${netProfitHtml}
          <div style="font-size: 11px; color: #374151; margin-bottom: 8px;">
            ${distHtml}
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="${m.directions_url}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #059669; color: white; padding: 5px 8px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 11px; display: inline-block;">
              🗺️ Google Directions
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectMarket) onSelectMarket(m.market_id);
      });

      markersGroup.addLayer(marker);
    });

    // Fit map bounds comfortably if there are mandis
    if (mandis.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    } else {
      map.setView([farmerLat, farmerLon], radiusKm <= 50 ? 9 : radiusKm <= 100 ? 8 : 7);
    }
  }, [farmerLat, farmerLon, farmerLocationName, radiusKm, mandis, selectedMarketId, onSelectMarket]);

  return (
    <div className="relative w-full h-[420px] rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-md flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block border-2 border-white shadow-xs"></span>
          <span>Your GPS</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
          <span className="w-3 h-3 rounded-full bg-emerald-700 inline-block border-2 border-white shadow-xs"></span>
          <span>🏆 Top Profit Mandi</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border-2 border-white shadow-xs"></span>
          <span>Verified Mandi</span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
          <span>Radius: {radiusKm} km</span>
        </div>
      </div>
    </div>
  );
}
