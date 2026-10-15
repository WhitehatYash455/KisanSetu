"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { Sprout, ShieldCheck, Database, CloudSun, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0D281D] dark:bg-[#06120C] text-[#FAF9F5] border-t border-[#C5A45D]/30 py-14 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D824D] flex items-center justify-center text-white ring-1 ring-[#C5A45D]/50 shadow-md">
              <Sprout className="w-5 h-5 text-[#FAF9F5]" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight">Krishi<span className="text-[#C5A45D]">Setu</span></span>
              <div className="text-[10px] text-[#A3B8AD] tracking-wider uppercase font-semibold">AI 2.0 Agriculture Intelligence</div>
            </div>
          </div>
          <p className="text-xs text-[#C8D6CE] leading-relaxed">
            Empowering Indian farmers with verified mandi spot prices, transparent machine-learning forecasts, and explainable selling advisories to maximize net realization.
          </p>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#143E2C] border border-[#C5A45D]/30 text-[11px] text-[#EADCB8] font-medium">
            <Award className="w-3.5 h-3.5 text-[#C5A45D]" />
            <span>Farmer First &amp; Transparent</span>
          </div>
        </div>

        {/* Verified Data Sources */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#C5A45D]">
            Verified Integrations
          </h4>
          <ul className="space-y-2.5 text-xs text-[#D5E3DB]">
            <li className="flex items-center space-x-2.5">
              <Database className="w-4 h-4 text-[#589D52]" />
              <span>Agmarknet &amp; data.gov.in Mandis</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <CloudSun className="w-4 h-4 text-[#589D52]" />
              <span>Open-Meteo Agro Meteorology</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-[#589D52]" />
              <span>Supabase PostgreSQL + RLS</span>
            </li>
          </ul>
        </div>

        {/* Essential Workflows */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#C5A45D]">
            Essential Workflows
          </h4>
          <ul className="space-y-2 text-xs text-[#D5E3DB]">
            <li><Link href="/dashboard" className="hover:text-[#C5A45D] transition-colors">{t('dashboard')}</Link></li>
            <li><Link href="/crops" className="hover:text-[#C5A45D] transition-colors">{t('myCrops')}</Link></li>
            <li><Link href="/markets" className="hover:text-[#C5A45D] transition-colors">{t('mandiPrices')}</Link></li>
            <li><Link href="/forecasts" className="hover:text-[#C5A45D] transition-colors">{t('priceForecast')}</Link></li>
            <li><Link href="/recommendations" className="hover:text-[#C5A45D] transition-colors">{t('sellingAdvisor')}</Link></li>
            <li><Link href="/calculator" className="hover:text-[#C5A45D] transition-colors">{t('calculator')}</Link></li>
            <li><Link href="/chat" className="hover:text-[#C5A45D] transition-colors">{t('advisoryChat')}</Link></li>
            <li><Link href="/weather" className="hover:text-[#C5A45D] transition-colors">{t('weather')}</Link></li>
          </ul>
        </div>

        {/* Advisory & Limitations */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#C5A45D]">
            Advisory Notice
          </h4>
          <p className="text-[11px] text-[#A9BEB3] leading-relaxed">
            Market rates are sourced directly from verified government APMC records. Price forecasts are calculated using chronological time-series machine learning models and represent statistical estimates, not financial guarantees.
          </p>
          <div className="text-[10px] text-[#8EA69B] pt-1">
            Compliant with non-sequential Farmer ID privacy.
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-[#143E2C] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#A9BEB3]">
        <div className="flex items-center space-x-2">
          <span>&copy; 2026 KrishiSetu. Designed for Indian Farmers.</span>
          <span className="text-[#C5A45D]">&bull;</span>
          <span className="text-white/80">Agricultural Technology Suite</span>
        </div>
        <div className="mt-3 sm:mt-0 font-mono text-[10px] text-[#C5A45D]">
          Government Open Data &bull; Agmarknet API Standard
        </div>
      </div>
    </footer>
  );
};
