"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import {
  Sprout,
  Lock,
  Phone,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Award
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';
  
  const { user, login, loginDemo, requestOtp, loginWithOtp, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  // Mode: 'password' or 'otp'
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');

  // Password fields
  const [identifier, setIdentifier] = useState('+919876543210');
  const [password, setPassword] = useState('kisan123');
  const [showPassword, setShowPassword] = useState(false);

  // OTP fields
  const [otpPhone, setOtpPhone] = useState('+919876543210');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTarget);
    }
  }, [user, authLoading, router, redirectTarget]);

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your mobile number or email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await login(identifier, password);
      setSuccessMsg('Authentication verified. Accessing producer portal...');
      setTimeout(() => {
        router.push(redirectTarget);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpPhone.trim()) {
      setError('Please enter your mobile number.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await requestOtp(otpPhone);
      setOtpStep(2);
      setCooldown(30);
      if (res && res.simulated_otp) {
        setSimulatedOtp(res.simulated_otp);
      }
      setSuccessMsg('6-digit verification code has been dispatched to your handset.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP. Please check your phone number.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await loginWithOtp(otpPhone, otpCode);
      setSuccessMsg('Identity verified successfully. Welcome to KrishiSetu AI 2.0.');
      setTimeout(() => {
        router.push(redirectTarget);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await loginDemo();
      setSuccessMsg('Authenticated as verified producer Ramesh Patil. Redirecting...');
      setTimeout(() => {
        router.push(redirectTarget);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed. Please try manual credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient Luxury Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#0D824D]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-[#C5A45D]/10 rounded-full blur-[110px] pointer-events-none -z-10" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 card-luxury rounded-3xl border border-[#C5A45D]/30 shadow-2xl overflow-hidden">
        
        {/* Left Side: Authentic Indian Agricultural Photography Banner */}
        <div className="relative hidden md:block md:col-span-5 bg-[#0D281D] text-white p-8">
          <Image
            src="/images/market-harvest.jpg"
            alt="Indian agricultural harvest"
            fill
            className="object-cover opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D281D]/95 via-[#0D281D]/85 to-[#0D281D]/95" />
          
          <div className="relative z-10 h-full flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C5A45D]/20 text-[#C5A45D] border border-[#C5A45D]/40 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A45D]" />
                <span>Verified Producer Portal</span>
              </div>
              <h2 className="text-2xl font-serif font-black text-white leading-tight">
                Empowering Indian Farmers with True Market Realization.
              </h2>
              <p className="text-xs text-[#FAF9F5]/70 leading-relaxed font-light">
                Secure access to verified spot settlements across 3,000+ APMC mandis, AI forecasts, and algorithmic SELL / WAIT advisory.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-[#C5A45D]/30 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#C5A45D]">
                <Award className="w-4 h-4 text-[#C5A45D]" />
                <span>Institutional Grade Security</span>
              </div>
              <p className="text-[11px] text-[#FAF9F5]/70 font-light">
                Zero data monetization. Cryptographically verified Farmer IDs synced directly with APMC settlement databases.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Farmer Login Form */}
        <div className="p-7 sm:p-10 md:col-span-7 space-y-6">
          
          {/* Top Switcher: Sign In vs Register */}
          <div className="flex items-center p-1 rounded-full bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-xs font-bold">
            <span className="flex-1 py-1.5 px-3 text-center rounded-full bg-[#0D281D] text-white shadow-xs font-bold border border-[#C5A45D]/40">
              Producer Sign In
            </span>
            <Link
              href={`/auth/register${redirectTarget !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
              className="flex-1 py-1.5 px-3 text-center rounded-full text-[#6B756E] dark:text-[#9BA89F] hover:text-[#0D824D] dark:hover:text-[#C5A45D] transition-all font-semibold"
            >
              Register Farm Account
            </Link>
          </div>

          {/* Header */}
          <div className="text-left space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#0D281D] text-white flex items-center justify-center shadow-sm border border-[#C5A45D]/40">
                <Sprout className="w-5 h-5 text-[#C5A45D]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-black text-[#1A2621] dark:text-[#FAF9F5]">
                  Producer Sign In
                </h1>
                <div className="text-xs text-[#6B756E] dark:text-[#9BA89F]">
                  KrishiSetu AI 2.0 • Agricultural Intelligence Engine
                </div>
              </div>
            </div>
          </div>

          {/* Login Method Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-full bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-xs font-bold">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError(null); }}
              className={`py-1.5 rounded-full transition-all cursor-pointer ${
                loginMode === 'password'
                  ? 'bg-[#0D281D] text-white shadow-xs font-bold border border-[#C5A45D]/40'
                  : 'text-[#6B756E] dark:text-[#9BA89F] hover:text-[#0D824D] dark:hover:text-white'
              }`}
            >
              Password Sign In
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('otp'); setError(null); }}
              className={`py-1.5 rounded-full transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                loginMode === 'otp'
                  ? 'bg-[#0D281D] text-white shadow-xs font-bold border border-[#C5A45D]/40'
                  : 'text-[#6B756E] dark:text-[#9BA89F] hover:text-[#0D824D] dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span>Real Handset OTP</span>
            </button>
          </div>

          {/* Success Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-[#0D824D]/15 border border-[#0D824D]/30 text-xs text-[#0D824D] dark:text-[#66A65C] flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Sign in error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Simulated OTP Helper */}
          {simulatedOtp && loginMode === 'otp' && otpStep === 2 && (
            <div className="p-3 rounded-xl bg-[#C5A45D]/15 border border-[#C5A45D]/40 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-[#92722A] dark:text-[#C5A45D]">
                <Sparkles className="w-4 h-4 text-[#C5A45D]" />
                <span>Verification OTP: <strong className="font-mono text-sm tracking-wider font-extrabold">{simulatedOtp}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setOtpCode(simulatedOtp)}
                className="text-[11px] font-bold text-[#0D281D] dark:text-[#C5A45D] underline cursor-pointer"
              >
                Auto-Fill
              </button>
            </div>
          )}

          {/* Mode 1: Password Form */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="+91 98765 43210 or ramesh@krishi.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] font-semibold text-[#0D824D] dark:text-[#C5A45D] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A45D]" />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <span>{t('login')}</span>
                )}
              </button>
            </form>
          )}

          {/* Mode 2: Mobile / Email OTP Login */}
          {loginMode === 'otp' && (
            <div className="space-y-4">
              {otpStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                      Registered Mobile Number or Email Address
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        placeholder="+91 98765 43210 or ramesh@krishi.in"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                      />
                    </div>
                    <p className="text-[10px] text-[#6B756E] dark:text-[#9BA89F] mt-1.5 font-light">
                      A real 6-digit verification code will be dispatched to your handset via SMS gateway.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C5A45D]" />
                        <span>Dispatching OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Dispatch OTP Code</span>
                        <ArrowRight className="w-4 h-4 text-[#C5A45D]" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5]">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpStep(1)}
                        className="text-[11px] font-semibold text-[#0D824D] hover:underline cursor-pointer"
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-widest text-xl font-mono py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] focus:outline-none focus:border-[#0D824D] font-bold"
                    />
                    <div className="flex justify-between items-center text-[11px] text-[#6B756E] mt-1.5">
                      <span>Didn&apos;t receive code?</span>
                      <button
                        type="button"
                        disabled={cooldown > 0 || loading}
                        onClick={() => handleRequestOtp()}
                        className="font-bold text-[#0D824D] dark:text-[#C5A45D] hover:underline disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                      >
                        <Clock className="w-3 h-3 inline" />
                        <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C5A45D]" />
                        <span>Verifying Token...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Enter Portal</span>
                        <ArrowRight className="w-4 h-4 text-[#C5A45D]" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Fast Evaluation Mode */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#0D1F17] border border-[#E3E8DF] dark:border-[#22382D] text-center space-y-2">
            <div className="text-xs font-semibold text-[#1A2621] dark:text-[#FAF9F5] flex items-center justify-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#C5A45D]" />
              <span>Instant Verification Access</span>
            </div>
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#C5A45D]/15 hover:bg-[#C5A45D]/25 border border-[#C5A45D]/40 text-[#92722A] dark:text-[#C5A45D] font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{t('demoSignIn')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C5A45D]" />
            </button>
          </div>

          {/* Footer Link to Register */}
          <div className="text-center pt-1 text-xs text-[#6B756E] dark:text-[#9BA89F]">
            New producer to KrishiSetu?{' '}
            <Link
              href={`/auth/register${redirectTarget !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
              className="font-bold text-[#0D824D] dark:text-[#C5A45D] hover:underline"
            >
              Register Farm Account &rarr;
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D824D]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
