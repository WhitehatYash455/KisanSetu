"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  KeyRound,
  Phone,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';

function ForgotPasswordForm() {
  const router = useRouter();
  const { requestOtp, resetPasswordWithOtp } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('+919876543210');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your registered mobile number or email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await requestOtp(identifier, 'forgot_password');
      setSuccessMsg(res.message || 'Verification security code dispatched successfully.');
      if (res.simulated_otp) {
        setSimulatedOtp(res.simulated_otp);
      }
      setStep(2);
      setCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request OTP code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError('Please enter the 6-digit verification code sent to your handset.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPasswordWithOtp(identifier, otpCode, newPassword);
      setSuccessMsg('Password updated successfully! Redirecting to producer dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. Please check the OTP code.';
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

      <div className="max-w-md w-full space-y-6 card-luxury p-8 rounded-3xl border border-[#C5A45D]/30 shadow-2xl transition-all">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#0D281D] text-white items-center justify-center shadow-md border border-[#C5A45D]/40">
            <KeyRound className="w-6 h-6 text-[#C5A45D]" />
          </div>
          <h1 className="text-2xl font-serif font-black text-[#1A2621] dark:text-[#FAF9F5]">
            {step === 1 ? 'Reset Producer Password' : 'Enter Verification Code'}
          </h1>
          <p className="text-xs text-[#6B756E] dark:text-[#9BA89F] font-light leading-relaxed">
            {step === 1
              ? 'Enter your registered mobile number or email to receive a 6-digit security token'
              : `Security token dispatched to ${identifier}`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center space-x-2 py-1">
          <div className={`w-10 h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-[#0D824D] dark:bg-[#C5A45D]' : 'bg-[#E3E8DF] dark:border-[#22382D]'}`} />
          <div className={`w-10 h-1.5 rounded-full transition-all ${step === 2 ? 'bg-[#0D824D] dark:bg-[#C5A45D]' : 'bg-[#E3E8DF] dark:border-[#22382D]'}`} />
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-[#0D824D]/15 border border-[#0D824D]/30 text-xs text-[#0D824D] dark:text-[#66A65C] flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Simulated OTP Development helper */}
        {simulatedOtp && step === 2 && (
          <div className="p-3 rounded-xl bg-[#C5A45D]/15 border border-[#C5A45D]/40 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-[#92722A] dark:text-[#C5A45D]">
              <Sparkles className="w-4 h-4 text-[#C5A45D]" />
              <span>Dev OTP Code: <strong className="font-mono text-sm tracking-wider font-extrabold">{simulatedOtp}</strong></span>
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

        {/* Step 1: Identifier Input */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                Registered Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A45D]" />
                  <span>Dispatching Security Token...</span>
                </>
              ) : (
                <>
                  <span>Send 6-Digit Token</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A45D]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP + New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                6-Digit Security Token (OTP)
              </label>
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
                <span>Didn&apos;t receive token?</span>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleRequestOtp()}
                  className="font-bold text-[#0D824D] dark:text-[#C5A45D] hover:underline disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3 inline" />
                  <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Token'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A2621] dark:text-[#FAF9F5] mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B756E] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#22382D] bg-[#FAF9F5] dark:bg-[#12221B] text-[#1A2621] dark:text-[#FAF9F5] text-sm focus:outline-none focus:border-[#0D824D] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0D281D] hover:bg-[#123B2A] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-[#C5A45D]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A45D]" />
                  <span>Updating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Reset Password &amp; Enter Portal</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A45D]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="text-center pt-2 text-xs text-[#6B756E] dark:text-[#9BA89F] border-t border-[#E3E8DF] dark:border-[#22382D]">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-bold text-[#0D824D] dark:text-[#C5A45D] hover:underline">
            Back to Sign In &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D824D]" />
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
