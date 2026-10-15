"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest } from './api';

export interface FarmerProfile {
  id: string;
  farmer_id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  preferred_language: 'en' | 'hi' | 'mr';
  state?: string;
  district?: string;
  sub_district?: string;
  village?: string;
  pincode?: string;
  total_acreage?: number;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  identifier: string;
  email?: string;
  phone?: string;
  full_name: string;
  role: string;
}

export interface RegisterData {
  full_name: string;
  identifier: string; // mobile number or email
  password: string;
  phone_number?: string;
  email?: string;
  state?: string;
  district?: string;
  sub_district?: string;
  village?: string;
  pincode?: string;
  total_acreage?: number;
  preferred_language?: 'en' | 'hi' | 'mr';
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  profile: FarmerProfile;
  message?: string;
}

interface MeResponse {
  user: AuthUser;
  profile: FarmerProfile;
  settings?: Record<string, unknown>;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: FarmerProfile | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  loginWithOtp: (identifier: string, otpCode: string) => Promise<void>;
  requestOtp: (identifier: string, purpose?: 'login' | 'forgot_password') => Promise<{ message: string; simulated_otp?: string }>;
  resetPasswordWithOtp: (identifier: string, otpCode: string, newPassword: string) => Promise<void>;
  register: (data: RegisterData | string, phoneOrPwd?: string, district?: string, village?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Clear session helper
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem('krishi_auth_token');
      localStorage.removeItem('krishi_auth_user');
      localStorage.removeItem('krishi_auth_profile');
    } catch {
      // LocalStorage unavailable in edge environments
    }
    setUser(null);
    setProfile(null);
    setToken(null);
  }, []);

  // Save session helper
  const saveSession = useCallback((authRes: AuthResponse) => {
    try {
      localStorage.setItem('krishi_auth_token', authRes.access_token);
      localStorage.setItem('krishi_auth_user', JSON.stringify(authRes.user));
      localStorage.setItem('krishi_auth_profile', JSON.stringify(authRes.profile));
    } catch {
      // LocalStorage fallback
    }
    setToken(authRes.access_token);
    setUser(authRes.user);
    setProfile(authRes.profile);
  }, []);

  // Initialize session on mount by checking token validity with the server
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('krishi_auth_token') : null;
        if (!savedToken) {
          if (isMounted) setLoading(false);
          return;
        }

        // Verify token with real backend session endpoint
        try {
          const sessionData = await apiRequest<MeResponse>('/auth/me', {}, savedToken);
          if (isMounted && sessionData && sessionData.user) {
            setToken(savedToken);
            setUser(sessionData.user);
            setProfile(sessionData.profile);
          }
        } catch (err) {
          console.warn('Session expired or invalid, clearing local session credentials:', err);
          if (isMounted) clearSession();
        }
      } catch (err) {
        console.error('Failed to initialize authentication state:', err);
        if (isMounted) clearSession();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const p = await apiRequest<FarmerProfile>('/farmer/profile', {}, token);
      setProfile(p);
      try {
        localStorage.setItem('krishi_auth_profile', JSON.stringify(p));
      } catch {
        // ignore storage quota
      }
    } catch (e) {
      console.error('Error refreshing farmer profile:', e);
    }
  };

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password,
        }),
      });

      saveSession(res);
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    // Verified fast evaluation with seeded Ramesh Patil farmer credentials
    await login('+919876543210', 'kisan123');
  };

  const requestOtp = async (identifier: string, purpose: 'login' | 'forgot_password' = 'login') => {
    const res = await apiRequest<{ message: string; simulated_otp?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({
        identifier: identifier.trim(),
        purpose,
      }),
    });
    return res;
  };

  const loginWithOtp = async (identifier: string, otpCode: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<AuthResponse>('/auth/login-otp', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp_code: otpCode.trim(),
        }),
      });

      saveSession(res);
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordWithOtp = async (identifier: string, otpCode: string, newPassword: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<AuthResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp_code: otpCode.trim(),
          new_password: newPassword,
        }),
      });

      saveSession(res);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    data: RegisterData | string,
    phoneOrPwd?: string,
    district?: string,
    village?: string
  ) => {
    setLoading(true);
    try {
      let payload: RegisterData;

      if (typeof data === 'object') {
        payload = data;
      } else {
        // Backward-compatible invocation signature: register(name, phone, district, village)
        payload = {
          full_name: data,
          identifier: phoneOrPwd || '',
          phone_number: phoneOrPwd,
          password: 'kisanpassword123',
          district: district || 'Nashik',
          village: village || 'Lasalgaon',
        };
      }

      const res = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      saveSession(res);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' }, token).catch(() => {});
      }
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        loginDemo,
        loginWithOtp,
        requestOtp,
        resetPasswordWithOtp,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
