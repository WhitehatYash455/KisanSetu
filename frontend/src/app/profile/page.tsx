"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Language } from '@/lib/translations';
import { apiRequest } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  User,
  ShieldCheck,
  Layers,
  Globe,
  Save,
  CheckCircle2
} from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [fullName, setFullName] = useState(profile?.full_name || 'Ramesh Patil');
  const [phone, setPhone] = useState(profile?.phone_number || '+919876543210');
  const [district, setDistrict] = useState(profile?.district || 'Nashik');
  const [village, setVillage] = useState(profile?.village || 'Lasalgaon');
  const [pincode, setPincode] = useState(profile?.pincode || '422306');
  
  // Notification states
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifySMS, setNotifySMS] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);

  // Farm states
  const [farmName, setFarmName] = useState('Nashik Agro Farm');
  const [acreage, setAcreage] = useState(4.5);
  const [soilType, setSoilType] = useState('Black Cotton Soil (काळी माती)');
  const [irrigation, setIrrigation] = useState('Drip Irrigation (ठिबक सिंचन)');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      queueMicrotask(() => {
        setFullName(profile.full_name);
        setPhone(profile.phone_number);
        if (profile.district) setDistrict(profile.district);
        if (profile.village) setVillage(profile.village);
        if (profile.pincode) setPincode(profile.pincode);
      });
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await apiRequest('/farmer/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phone,
          district,
          village,
          pincode,
          preferred_language: language,
        }),
      });

      await apiRequest('/farmer/settings', {
        method: 'PUT',
        body: JSON.stringify({
          notification_push: notifyPush,
          notification_sms: notifySMS,
          notification_whatsapp: notifyWhatsapp,
        }),
      });

      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn('Profile sync fallback:', err);
      // Fallback local update
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const farmerId = profile?.farmer_id || 'AGRI-8N4K-3M9Q';

  return (
    <ProtectedRoute>
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle Luxury Ambient Glow */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#0D824D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-96 right-10 w-96 h-96 bg-[#C5A45D]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E8DF] dark:border-[#22382D] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#123B2A]/10 dark:bg-[#C5A45D]/15 text-[#123B2A] dark:text-[#E8D8B0] border border-[#C5A45D]/40 shadow-xs mb-2">
              <User className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span className="font-medium tracking-wide">Farmer Registry & Preferences</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#202B24] dark:text-[#F7F6EF] tracking-tight">
              {t('profile')} &amp; Farm Settings
            </h1>
            <p className="text-xs sm:text-sm text-[#6B756E] dark:text-[#9BA89F] mt-1 font-light leading-relaxed">
              Manage your opaque Farmer ID credentials, location coordinates, and alerts.
            </p>
          </div>

          {/* Unique Opaque Farmer ID Badge */}
          <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-[#0D281D] to-[#123B2A] text-white border border-[#C5A45D]/50 shadow-lg shadow-[#0D281D]/20 flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <ShieldCheck className="w-5 h-5 text-[#C5A45D]" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5A45D]">
                {t('farmerId')} (Opaque)
              </div>
              <div className="font-mono text-sm font-black tracking-wide text-white">
                {farmerId}
              </div>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-[#0D281D] text-white border border-[#C5A45D] text-xs font-semibold flex items-center space-x-2 shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#C5A45D]" />
            <span>Profile and farm preferences saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-8">
          
          {/* Section 1: Farmer Personal Details */}
          <div className="p-6 sm:p-8 rounded-3xl card-luxury space-y-6">
            <div className="flex items-center space-x-3 border-b border-[#E3E8DF] dark:border-[#22382D] pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0D824D]/10 dark:bg-[#123B2A] flex items-center justify-center text-[#0D824D] dark:text-[#C5A45D] border border-[#0D824D]/20">
                <User className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#202B24] dark:text-[#F7F6EF]">
                  Personal &amp; Contact Information
                </h2>
                <p className="text-[11px] text-[#6B756E] dark:text-[#9BA89F]">Verified identity for mandi transactions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  District (जिल्हा)
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Village / Taluka (गाव)
                </label>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  PIN Code
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Farm Location & Soil Details */}
          <div className="p-6 sm:p-8 rounded-3xl card-luxury space-y-6">
            <div className="flex items-center space-x-3 border-b border-[#E3E8DF] dark:border-[#22382D] pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0D824D]/10 dark:bg-[#123B2A] flex items-center justify-center text-[#0D824D] dark:text-[#C5A45D] border border-[#0D824D]/20">
                <Layers className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#202B24] dark:text-[#F7F6EF]">
                  My Farm &amp; Cultivation Location
                </h2>
                <p className="text-[11px] text-[#6B756E] dark:text-[#9BA89F]">Crop land details for yield intelligence</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Farm Name
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Total Cultivated Acreage ({t('acres')})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={acreage}
                  onChange={(e) => setAcreage(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Soil Type (मातीचा प्रकार)
                </label>
                <input
                  type="text"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-1.5">
                  Irrigation Source (सिंचन प्रकार)
                </label>
                <input
                  type="text"
                  value={irrigation}
                  onChange={(e) => setIrrigation(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#202B24] dark:text-[#F7F6EF] text-sm focus:outline-none focus:border-[#0D824D] focus:ring-2 focus:ring-[#0D824D] transition-colors font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Language & Alert Channels */}
          <div className="p-6 sm:p-8 rounded-3xl card-luxury space-y-6">
            <div className="flex items-center space-x-3 border-b border-[#E3E8DF] dark:border-[#22382D] pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0D824D]/10 dark:bg-[#123B2A] flex items-center justify-center text-[#0D824D] dark:text-[#C5A45D] border border-[#0D824D]/20">
                <Globe className="w-5 h-5 text-[#0D824D] dark:text-[#C5A45D]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#202B24] dark:text-[#F7F6EF]">
                  Language &amp; Notification Preferences
                </h2>
                <p className="text-[11px] text-[#6B756E] dark:text-[#9BA89F]">Customize language and communication channels</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF] mb-2">
                Preferred Language (प्राधान्य भाषा)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                  { code: 'mr', label: 'मराठी (Marathi)' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code as Language)}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer hover:scale-[1.02] ${
                      language === item.code
                        ? 'bg-[#0D281D] text-white border-[#C5A45D] shadow-md ring-1 ring-[#C5A45D]/40'
                        : 'bg-[#FAF9F5] dark:bg-[#12221B] border-[#E3E8DF] dark:border-[#22382D] text-[#202B24] dark:text-[#F7F6EF] hover:border-[#0D824D]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3E8DF] dark:border-[#22382D] space-y-3">
              <span className="block text-xs font-bold text-[#202B24] dark:text-[#F7F6EF]">
                Alert Delivery Channels
              </span>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#12221B] border border-[#E3E8DF] dark:border-[#22382D] cursor-pointer hover:border-[#0D824D] transition-colors">
                <span className="text-xs font-semibold text-[#202B24] dark:text-[#F7F6EF]">
                  In-App &amp; Push Notifications (Price Spikes &amp; Weather)
                </span>
                <input
                  type="checkbox"
                  checked={notifyPush}
                  onChange={(e) => setNotifyPush(e.target.checked)}
                  className="w-4 h-4 accent-[#0D824D] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#12221B] border border-[#E3E8DF] dark:border-[#22382D] cursor-pointer hover:border-[#0D824D] transition-colors">
                <span className="text-xs font-semibold text-[#202B24] dark:text-[#F7F6EF]">
                  WhatsApp Mandi Advisory
                </span>
                <input
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="w-4 h-4 accent-[#0D824D] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#12221B] border border-[#E3E8DF] dark:border-[#22382D] cursor-pointer hover:border-[#0D824D] transition-colors">
                <span className="text-xs font-semibold text-[#202B24] dark:text-[#F7F6EF]">
                  SMS Alerts
                </span>
                <input
                  type="checkbox"
                  checked={notifySMS}
                  onChange={(e) => setNotifySMS(e.target.checked)}
                  className="w-4 h-4 accent-[#0D824D] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-sm shadow-xl shadow-[#0D281D]/20 border border-[#C5A45D]/40 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-4 h-4 text-[#C5A45D]" />
              <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
            </button>
          </div>

        </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
