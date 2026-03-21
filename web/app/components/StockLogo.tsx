'use client';

import { useState } from 'react';
import Image from 'next/image';

const STOCK_COLORS = [
  '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5',
  '#e0f7fa', '#fffde7', '#eceff1', '#fbe9e7', '#e8eaf6',
];

export function getStockColor(symbol: string): string {
  const index = symbol.charCodeAt(0) % STOCK_COLORS.length;
  return STOCK_COLORS[index];
}

function getStockInitials(symbol: string): string {
  return symbol.slice(0, 2).toUpperCase();
}

// Known company domains for Clearbit logo lookup (top NSE stocks)
const COMPANY_DOMAINS: Record<string, string> = {
  RELIANCE: 'ril.com',
  TCS: 'tcs.com',
  INFY: 'infosys.com',
  HDFCBANK: 'hdfcbank.com',
  ICICIBANK: 'icicibank.com',
  HINDUNILVR: 'hul.co.in',
  SBIN: 'sbi.co.in',
  BHARTIARTL: 'airtel.in',
  ITC: 'itcportal.com',
  KOTAKBANK: 'kotak.com',
  LT: 'larsentoubro.com',
  AXISBANK: 'axisbank.com',
  WIPRO: 'wipro.com',
  HCLTECH: 'hcltech.com',
  BAJFINANCE: 'bajajfinserv.in',
  MARUTI: 'marutisuzuki.com',
  TATAMOTORS: 'tatamotors.com',
  TATASTEEL: 'tatasteel.com',
  SUNPHARMA: 'sunpharma.com',
  TITAN: 'titan.co.in',
  ASIANPAINT: 'asianpaints.com',
  ULTRACEMCO: 'ultratechcement.com',
  NESTLEIND: 'nestle.in',
  POWERGRID: 'powergrid.in',
  NTPC: 'ntpc.co.in',
  JSWSTEEL: 'jsw.in',
  TECHM: 'techmahindra.com',
  COALINDIA: 'coalindia.in',
  ONGC: 'ongcindia.com',
  ADANIENT: 'adani.com',
  ADANIPORTS: 'adaniports.com',
  HINDALCO: 'hindalco.com',
  DRREDDY: 'drreddys.com',
  DIVISLAB: 'divislaboratories.com',
  CIPLA: 'cipla.com',
  EICHERMOT: 'eicher.in',
  HEROMOTOCO: 'heromotocorp.com',
  BAJAJFINSV: 'bajajfinserv.in',
  HDFCLIFE: 'hdfclife.com',
  SBILIFE: 'sbilife.co.in',
  INDUSINDBK: 'indusind.com',
  GRASIM: 'grasim.com',
  BRITANNIA: 'britannia.co.in',
  APOLLOHOSP: 'apollohospitals.com',
  M_M: 'mahindra.com',
  TATACONSUM: 'tataconsumer.com',
  SHRIRAMFIN: 'shriramfinance.in',
};

function getLogoDomain(symbol: string): string | null {
  return COMPANY_DOMAINS[symbol.toUpperCase()] || null;
}

interface StockLogoProps {
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
  showRealLogo?: boolean; // Only true on stock detail page
}

export default function StockLogo({ symbol, name, size = 40, className = '', showRealLogo = false }: StockLogoProps) {
  const [imgError, setImgError] = useState(0); // 0=try clearbit, 1=try google, 2=fallback
  const bgColor = getStockColor(symbol);
  const initials = getStockInitials(symbol);
  const domain = showRealLogo ? getLogoDomain(symbol) : null;

  // Show real logo only on detail pages for known companies
  if (domain && imgError < 2) {
    const logoSrc = imgError === 0
      ? `https://logo.clearbit.com/${domain}?size=${size * 2}`
      : `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`;

    return (
      <div
        className={`relative rounded-xl overflow-hidden bg-white border border-slate-100 shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
        title={name || symbol}
      >
        <Image
          src={logoSrc}
          alt={name || symbol}
          width={size}
          height={size}
          className="object-contain p-1.5"
          unoptimized
          onError={() => setImgError(prev => prev + 1)}
        />
      </div>
    );
  }

  // Colored initials (default for lists, fallback for detail)
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-slate-600 shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: Math.max(10, size * 0.28),
      }}
      title={name || symbol}
    >
      {initials}
    </div>
  );
}
