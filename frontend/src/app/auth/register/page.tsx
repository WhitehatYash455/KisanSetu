"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Language } from '@/lib/translations';
import {
  Sprout,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Layers,
  Globe,
  Loader2,
  ShieldCheck
} from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const { user, register, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stateName, setStateName] = useState('Maharashtra');
  const [district, setDistrict] = useState('Nashik');
  const [village, setVillage] = useState('Lasalgaon');
  const [pincode, setPincode] = useState('422306');
  const [acreage, setAcreage] = useState('4.5');
  const [preferredLang, setPreferredLang] = useState<Language>(language);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTarget);
    }
  }, [user, authLoading, router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation checks
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full farmer name (at least 2 letters).');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (!district.trim()) {
      setError('Please enter your primary agricultural district.');
      return;
    }

    setLoading(true);

    try {
      await register({
        phone_number: phone,
        full_name: fullName,
        email: email.trim() || undefined,
        password: password,
        state: stateName,
        district: district,
        village_taluka: village,
        pincode: pincode,
        primary_crops: ['Onion', 'Tomato', 'Soybean'],
        farm_size_acres: parseFloat(acreage) || 4.5,
        preferred_language: preferredLang,
      });

      setSuccessMsg('Registration successful! Generating cryptographic Farmer ID...');
      setTimeout(() => {
        router.push(redirectTarget);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check the provided information.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient Luxury Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-[#0D824D]/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#C5A45D]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-2xl w-full space-y-6 card-luxury p-6 sm:p-10 rounded-3xl border border-[#C5A45D]/30 shadow-2xl transition-all">

        {/* Top Switcher: Sign In vs Register */}
        <div className="flex items-center p-1 rounded-full bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-xs font-bold max-w-sm mx-auto">
          <Link
            href={`/auth/login${redirectTarget !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
            className="flex-1 py-1.5 px-3 text-center rounded-full text-[#6B756E] dark:text-[#9BA89F] hover:text-[#0D824D] dark:hover:text-[#C5A45D] transition-all font-semibold"
          >
            Producer Sign In
          </Link>
          <span className="flex-1 py-1.5 px-3 text-center rounded-full bg-[#0D281D] text-white shadow-xs font-bold border border-[#C5A45D]/40">
            Register Farm Account
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#0D281D] text-white items-center justify-center shadow-md border border-[#C5A45D]/40">
            <Sprout className="w-6 h-6 text-[#C5A45D]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#1A2621] dark:text-[#FAF9F5]">
            Register Agricultural Account
          </h1>
          <p className="text-xs sm:text-sm text-[#6B756E] dark:text-[#9BA89F] max-w-md mx-auto font-light leading-relaxed">
            Obtain your official non-sequential Farmer ID, track 3,000+ APMC mandis, and receive ML-driven harvest selling recommendations.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#0D824D]/15 border border-[#0D824D]/30 text-xs sm:text-sm text-[#0D824D] dark:text-[#66A65C] flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-600 flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Registration Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1: Farmer Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-black text-[#0D824D] dark:text-[#C5A45D] uppercase tracking-wider border-b border-[#E3E8DF] dark:border-[#22382D] pb-2">
              <span className="w-2 h-2 rounded-full bg-[#C5A45D]" />
              <span>1. Producer Contact &amp; Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Full Name (शेतकऱ्याचे नाव) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Mobile Number (मोबाईल क्र.) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                Email Address (पर्यायी ई-मेल) <span className="text-[#6B756E] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh.patil@krishi.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-[#6B756E] hover:text-[#0D281D] dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Farm Location & Language */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-black text-[#0D824D] dark:text-[#C5A45D] uppercase tracking-wider border-b border-[#E3E8DF] dark:border-[#22382D] pb-2">
              <span className="w-2 h-2 rounded-full bg-[#C5A45D]" />
              <span>2. Farm Location &amp; Regional Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  State (राज्य)
                </label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                >
                  <option value="Maharashtra">Maharashtra (महाराष्ट्र)</option>
                  <option value="Madhya Pradesh">Madhya Pradesh (मध्य प्रदेश)</option>
                  <option value="Gujarat">Gujarat (ગુજરાત)</option>
                  <option value="Karnataka">Karnataka (ಕರ್ನಾಟಕ)</option>
                  <option value="Punjab">Punjab (ਪੰਜਾਬ)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (उत्तर प्रदेश)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  District (जिल्हा) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Nashik"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Village / Taluka (गाव/तालुका)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Lasalgaon"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  PIN Code (पिन कोड)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="422306"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Land Acreage (एकर जमीन)
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={acreage}
                    onChange={(e) => setAcreage(e.target.value)}
                    placeholder="4.5"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Preferred Dialect (भाषा)
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value as Language)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  >
                    <option value="en">English</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A45D]" />
                  <span>Provisioning Account &amp; Farmer ID...</span>
                </>
              ) : (
                <>
                  <span>Complete Producer Registration</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A45D]" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Existing Farmer Link */}
        <div className="text-center pt-2 text-xs text-[#6B756E] dark:text-[#9BA89F] border-t border-[#E3E8DF] dark:border-[#22382D]">
          Already have an account?{' '}
          <Link
            href={`/auth/login${redirectTarget !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
            className="font-bold text-[#0D824D] dark:text-[#C5A45D] hover:underline"
          >
            {t('login')} &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D824D]" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
