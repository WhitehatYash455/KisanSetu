"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sprout, Loader2, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
          <Sprout className="w-8 h-8" />
        </div>
        <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300 font-medium text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Verifying farmer credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
          <Lock className="w-7 h-7" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Authentication Required
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs">
            Redirecting to farmer sign in to access your portfolio and mandi advisory...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
