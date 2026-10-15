"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { Language } from '@/lib/translations';
import { apiRequest } from '@/lib/api';
import {
  Menu,
  X,
  Search,
  Globe,
  Bell,
  Check,
  TrendingUp,
  Award,
  MessageSquare,
  Calculator,
  CloudSun,
  Sprout,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Layers,
  LayoutDashboard,
  Store,
  User
} from 'lucide-react';

interface AppNotification {
  id: string;
  title_en: string;
  title_hi?: string;
  title_mr?: string;
  message_en: string;
  message_hi?: string;
  message_mr?: string;
  is_read: boolean;
  [key: string]: unknown;
}

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: string;
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(2);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer and dropdowns on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Load sample notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await apiRequest<AppNotification[]>('/notifications');
        if (Array.isArray(res)) {
          setNotifications(res);
          setUnreadCount(res.filter((n) => !n.is_read).length);
        }
      } catch {
        setNotifications([
          {
            id: 'notif-001',
            title_en: 'Onion Price Spike in Pimpalgaon Mandi',
            title_hi: 'पिंपलगांव मंडी में प्याज के भाव में तेजी',
            title_mr: 'पिंपळगाव बाजार समितीत कांद्याच्या दरात वाढ',
            message_en: 'Modal price reached ₹3,550/Quintal (+4.2% change today).',
            is_read: false,
          },
          {
            id: 'notif-002',
            title_en: 'Transit Weather Notice: Clear Sky',
            title_hi: 'परिवहन मौसम सूचना: साफ आसमान',
            title_mr: 'वाहतूक हवामान सूचना: निरभ्र आकाश',
            message_en: 'Safe road transit corridor across Nashik - Mumbai highway.',
            is_read: false,
          }
        ]);
        setUnreadCount(2);
      }
    }
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // client fallback
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setLangMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/forecasts?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/forecasts');
    }
  };

  const langLabels: Record<Language, string> = {
    en: 'English',
    hi: 'हिन्दी',
    mr: 'मराठी'
  };

  const primaryNavLinks: NavLinkItem[] = [
    {
      href: '/dashboard',
      label: t('dashboard') || 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/crops',
      label: t('myCrops') || 'My Crops',
      icon: Sprout,
      active: pathname.startsWith('/crops'),
    },
    {
      href: '/forecasts',
      label: t('priceForecast') || 'Price Prediction',
      icon: TrendingUp,
      active: pathname.startsWith('/forecasts'),
    },
    {
      href: '/recommendations',
      label: t('sellingAdvisor') || 'Market Recommendation',
      icon: Award,
      active: pathname.startsWith('/recommendations'),
    },
    {
      href: '/chat',
      label: t('advisoryChat') || '24h Advisory Chat',
      icon: MessageSquare,
      active: pathname.startsWith('/chat'),
      badge: '24h',
    },
  ];

  const moreToolsLinks: NavLinkItem[] = [
    {
      href: '/markets',
      label: t('mandiPrices') || 'Mandi Prices',
      icon: Store,
      active: pathname.startsWith('/markets'),
    },
    {
      href: '/calculator',
      label: t('calculator') || 'Profit Calculator',
      icon: Calculator,
      active: pathname.startsWith('/calculator'),
    },
    {
      href: '/weather',
      label: t('weather') || 'Weather & Transit',
      icon: CloudSun,
      active: pathname.startsWith('/weather'),
    },
  ];

  const allNavLinks = [...primaryNavLinks, ...moreToolsLinks];
  const isMoreActive = moreToolsLinks.some((item) => item.active);

  return (
    <>
      {/* =========================================================================
          MAIN TOP NAVIGATION BAR (Elegantly Framed, Segmented Capsule & Controls)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#091510]/95 backdrop-blur-md border-b border-[#E2E8DF] dark:border-[#193828] shadow-xs transition-colors">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            
            {/* Left: Brand Logo & Emblem with framed badge */}
            <div className="flex items-center space-x-2 shrink-0">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#0D824D] to-[#0D281D] flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform duration-200">
                  <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white">
                      Krishi<span className="text-[#0D824D] dark:text-[#34D399]">Setu</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#0D824D] dark:text-[#34D399] border border-emerald-300/80 dark:border-emerald-800/60 shadow-2xs">
                      AI 2.0
                    </span>
                  </div>
                  <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 hidden 2xl:block">
                    Price Prediction &amp; Mandi Advisory
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Segmented Capsule Navigation Frame */}
            <div className="hidden lg:flex items-center p-1 rounded-full bg-[#FAF9F5] dark:bg-[#0E2018] border border-[#E2E8DF] dark:border-[#193828] shadow-xs">
              <nav className="flex items-center gap-0.5">
                {/* Always visible on lg+ */}
                {primaryNavLinks.slice(0, 3).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 ${
                        item.active
                          ? 'bg-[#0D824D] text-white shadow-xs font-bold'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#142C21] hover:text-[#0D824D] dark:hover:text-[#10B981]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* Visible only on 2xl+ to avoid crowding on 1024-1366px */}
                {primaryNavLinks.slice(3).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`hidden 2xl:inline-flex relative items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 ${
                        item.active
                          ? 'bg-[#0D824D] text-white shadow-xs font-bold'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#142C21] hover:text-[#0D824D] dark:hover:text-[#10B981]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                            item.active
                              ? 'bg-[#096D40] text-white'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* More Tools Dropdown within the frame */}
                <div className="relative" ref={moreRef}>
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    aria-expanded={moreMenuOpen}
                    aria-label="More agricultural tools"
                    className={`relative inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                      isMoreActive || (pathname === '/recommendations' || pathname === '/chat')
                        ? 'bg-[#0D824D] text-white shadow-xs font-bold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#142C21] hover:text-[#0D824D] dark:hover:text-[#10B981]'
                    }`}
                  >
                    <span>More Tools</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute right-0 mt-2.5 w-60 bg-white dark:bg-[#0E2218] rounded-2xl shadow-xl border border-gray-200 dark:border-[#193828] p-1.5 z-50 animate-slide-up">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800/80 mb-1">
                        All Intelligence Tools
                      </div>
                      
                      {/* On screens smaller than 2xl, show recommendations and chat inside dropdown */}
                      <div className="2xl:hidden border-b border-gray-100 dark:border-gray-800/80 pb-1 mb-1">
                        {primaryNavLinks.slice(3).map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMoreMenuOpen(false)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                item.active
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#0D824D] dark:text-[#10B981] font-bold'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#142C21]'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <Icon className="w-4 h-4 text-[#0D824D] dark:text-[#10B981] shrink-0" />
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>

                      {moreToolsLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreMenuOpen(false)}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                              item.active
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#0D824D] dark:text-[#10B981] font-bold'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#142C21]'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-[#0D824D] dark:text-[#10B981] shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Right: Framed Controls & Auth */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              
              {/* Search input (visible on xl+) */}
              <form onSubmit={handleSearchSubmit} className="relative hidden 2xl:block w-36">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-3 pr-7 text-xs rounded-full bg-white dark:bg-[#12241A] text-gray-800 dark:text-gray-100 border border-[#D8E0D4] dark:border-[#1E3A2B] shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600"
                >
                  <Search className="w-3 h-3" />
                </button>
              </form>

              {/* Framed Utility Cluster (Language, Theme, Notifications) */}
              <div className="flex items-center p-0.5 sm:p-1 rounded-full bg-[#EEF2EB] dark:bg-[#12241A] border border-[#D8E0D4] dark:border-[#1E3A2B] shadow-inner gap-0.5">
                
                {/* Language Selector Dropdown */}
                <div className="relative" ref={langRef}>
                  <button
                    type="button"
                    onClick={() => setLangMenuOpen(!langMenuOpen)}
                    aria-label="Language selection"
                    className="flex items-center space-x-1 px-2 py-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#1A3326] transition text-xs font-semibold cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs uppercase font-extrabold">{language}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>

                  {langMenuOpen && (
                    <div className="absolute right-0 mt-2.5 w-36 bg-white dark:bg-[#14271E] rounded-2xl shadow-xl border border-gray-200 dark:border-[#1E382B] p-1.5 z-50">
                      {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => handleLanguageChange(lang)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                            language === lang
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1A3326]'
                          }`}
                        >
                          <span>{langLabels[lang]}</span>
                          {language === lang && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme Toggle (Dark / Light) */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle Theme"
                  className="p-1.5 rounded-full text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#1A3326] transition cursor-pointer"
                  title="Toggle Dark/Light Mode"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>

                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                    aria-label="Notifications"
                    className="relative p-1.5 rounded-full text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#1A3326] transition cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#EEF2EB] dark:ring-[#12241A]" />
                    )}
                  </button>

                  {notifMenuOpen && (
                    <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-white dark:bg-[#14271E] rounded-2xl shadow-xl border border-gray-200 dark:border-[#1E382B] p-2 z-50">
                      <div className="px-3 pb-2 border-b border-gray-100 dark:border-[#1E382B] flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 dark:text-white">
                          Market Alerts
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-[#1E382B]">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 text-xs flex items-start justify-between gap-2 hover:bg-gray-50 dark:hover:bg-[#1A3326] rounded-xl"
                          >
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {language === 'hi' && n.title_hi
                                  ? n.title_hi
                                  : language === 'mr' && n.title_mr
                                  ? n.title_mr
                                  : n.title_en}
                              </div>
                              <div className="text-gray-500 text-[11px] mt-0.5">
                                {language === 'hi' && n.message_hi
                                  ? n.message_hi
                                  : language === 'mr' && n.message_mr
                                  ? n.message_mr
                                  : n.message_en}
                              </div>
                            </div>
                            {!n.is_read && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="text-emerald-600 hover:text-emerald-700 p-1"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Desktop Auth State: Sign In / Register Buttons OR User Profile Dropdown */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-expanded={userMenuOpen}
                    aria-label="Farmer profile menu"
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {(profile?.full_name || user.email || 'F').charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline max-w-[85px] truncate text-xs">
                      {profile?.full_name || 'Farmer'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-emerald-600 shrink-0" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-[#14271E] rounded-2xl shadow-xl border border-gray-200 dark:border-[#1E382B] p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/80 mb-1">
                        <div className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {profile?.full_name || 'Farmer Member'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">
                          {profile?.farmer_id || user.phone || user.identifier || user.email}
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3326]"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Farm Dashboard</span>
                      </Link>
                      <Link
                        href="/crops"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3326]"
                      >
                        <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                        <span>My Crops</span>
                      </Link>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-left cursor-pointer mt-1 border-t border-gray-100 dark:border-gray-800/80 pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0D824D] hover:bg-[#096D40] text-white shadow-xs hover:shadow-sm transition-all duration-200 shrink-0 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/auth/register"
                    className="hidden sm:inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 border border-[#E2E8DF] dark:border-[#193828] bg-white dark:bg-[#0E2218] hover:bg-gray-50 dark:hover:bg-[#142C21] transition-all duration-200 shrink-0 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>Register</span>
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle Mobile Menu"
                className="lg:hidden p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3326] transition cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-[#1E382B] bg-white dark:bg-[#0D1B15] px-4 pt-3 pb-6 space-y-2">
            {allNavLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    item.active
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1A3326]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Mobile Auth Actions */}
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-[#1E382B] space-y-2">
              {user ? (
                <div className="space-y-2">
                  <div className="px-3 text-xs text-gray-500">
                    Signed in as: <strong className="text-gray-900 dark:text-white">{profile?.full_name || 'Farmer'}</strong>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-center rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-center rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold"
                  >
                    Register Farm
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
