"use client";

import { useState, useEffect, useCallback } from 'react';

export interface DistrictPreset {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  isPopular?: boolean;
}

export const DISTRICT_PRESETS: DistrictPreset[] = [
  { name: 'Pune (Gultekdi / Haveli)', state: 'Maharashtra', latitude: 18.4975, longitude: 73.8647, isPopular: true },
  { name: 'Nashik (Lasalgaon / Niphad)', state: 'Maharashtra', latitude: 20.1477, longitude: 74.2284, isPopular: true },
  { name: 'Pimpalgaon Baswant', state: 'Maharashtra', latitude: 20.1687, longitude: 73.9856, isPopular: true },
  { name: 'Solapur', state: 'Maharashtra', latitude: 17.6599, longitude: 75.9064, isPopular: true },
  { name: 'Nagpur (Kalamna)', state: 'Maharashtra', latitude: 21.1712, longitude: 79.1364, isPopular: true },
  { name: 'Akola', state: 'Maharashtra', latitude: 20.7002, longitude: 77.0082 },
  { name: 'Indore (Choithram)', state: 'Madhya Pradesh', latitude: 22.6845, longitude: 75.8362, isPopular: true },
  { name: 'Ujjain', state: 'Madhya Pradesh', latitude: 23.1765, longitude: 75.7885 },
  { name: 'Neemuch', state: 'Madhya Pradesh', latitude: 24.4642, longitude: 74.8708 },
  { name: 'Gondal (Rajkot)', state: 'Gujarat', latitude: 21.9619, longitude: 70.7932, isPopular: true },
  { name: 'Khanna (Ludhiana)', state: 'Punjab', latitude: 30.7071, longitude: 76.2163, isPopular: true },
  { name: 'Azadpur (Delhi NCR)', state: 'NCT of Delhi', latitude: 28.7041, longitude: 77.1725, isPopular: true },
];

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationName: string;
  isLive: boolean;
  loading: boolean;
  error: string | null;
}

export function useGeolocation(
  defaultLat: number = 20.08,
  defaultLon: number = 74.11,
  autoRequest: boolean = true
) {
  const [location, setLocation] = useState<LocationState>({
    latitude: defaultLat,
    longitude: defaultLon,
    accuracy: undefined,
    locationName: 'Detecting Location...',
    isLive: false,
    loading: false,
    error: null,
  });

  const requestLiveLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!('geolocation' in navigator)) {
      setLocation(prev => ({
        ...prev,
        locationName: 'GPS Unsupported (Using Regional Default)',
        error: 'GPS Geolocation is not supported by your browser.'
      }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        const acc = Math.round(pos.coords.accuracy);

        // Find nearest known district for friendly naming
        let nearestName = `Live GPS (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
        let minDist = Infinity;
        for (const p of DISTRICT_PRESETS) {
          const d = Math.hypot(p.latitude - lat, p.longitude - lon);
          if (d < minDist && d < 0.6) { // roughly within ~65 km
            minDist = d;
            nearestName = `${p.name} (Live GPS)`;
          }
        }

        const newLoc: LocationState = {
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          locationName: nearestName,
          isLive: true,
          loading: false,
          error: null,
        };

        setLocation(newLoc);
        try {
          const savedData = JSON.stringify({
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            locationName: nearestName,
            isLive: true,
            timestamp: Date.now(),
          });
          sessionStorage.setItem('krishisetu_live_location', savedData);
          localStorage.setItem('krishisetu_live_location', savedData);
        } catch {
          // Ignore storage errors
        }
      },
      (err) => {
        let msg = 'Failed to retrieve live location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow GPS or select your district below.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS satellite signal unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out.';
        }

        setLocation(prev => ({
          ...prev,
          loading: false,
          locationName: prev.isLive ? prev.locationName : 'Nashik Hub (Default)',
          error: msg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const selectDistrict = useCallback((districtName: string) => {
    const found = DISTRICT_PRESETS.find(p => p.name === districtName);
    if (!found) return;

    const newLoc: LocationState = {
      latitude: found.latitude,
      longitude: found.longitude,
      accuracy: 500, // manual district radius
      locationName: `${found.name}, ${found.state}`,
      isLive: true,
      loading: false,
      error: null,
    };

    setLocation(newLoc);
    try {
      const savedData = JSON.stringify({
        latitude: found.latitude,
        longitude: found.longitude,
        accuracy: 500,
        locationName: `${found.name}, ${found.state}`,
        isLive: true,
        timestamp: Date.now(),
      });
      sessionStorage.setItem('krishisetu_live_location', savedData);
      localStorage.setItem('krishisetu_live_location', savedData);
    } catch {
      // Ignore
    }
  }, []);

  // Load saved location safely after hydration, or trigger live GPS
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('krishisetu_live_location') || localStorage.getItem('krishisetu_live_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) {
          queueMicrotask(() => {
            setLocation({
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              accuracy: parsed.accuracy,
              locationName: parsed.locationName || `Saved Location (${parsed.latitude}°N, ${parsed.longitude}°E)`,
              isLive: true,
              loading: false,
              error: null,
            });
          });
          return;
        }
      }
    } catch {
      // Ignore
    }

    if (autoRequest) {
      queueMicrotask(() => {
        requestLiveLocation();
      });
    }
  }, [autoRequest, requestLiveLocation]);

  return {
    ...location,
    requestLiveLocation,
    selectDistrict,
    districts: DISTRICT_PRESETS,
  };
}
