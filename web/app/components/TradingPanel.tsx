'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

type OrderType = 'buy' | 'sell';
type OrderMode = 'delivery' | 'intraday' | 'mtf';
type Exchange = 'NSE' | 'BSE';

export default function TradingPanel({ symbol, currentPrice, change, changePercent }: TradingPanelProps) {
  const [orderType, setOrderType] = useState<OrderType>('buy');
  const [orderMode, setOrderMode] = useState<OrderMode>('delivery');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [quantity, setQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>(currentPrice?.toFixed(2) || '0');
  const [isMarketOrder, setIsMarketOrder] = useState(true);
  const [showCharges, setShowCharges] = useState(false);

  const isPositive = change >= 0;
  const qty = parseInt(quantity || '0');
  const orderPrice = isMarketOrder ? currentPrice : parseFloat(price || '0');
  const orderValue = qty * orderPrice;

  // Calculate charges (India-specific)
  const charges = useMemo(() => {
    if (orderValue === 0) return null;
    
    const brokerage = orderMode === 'delivery' ? 0 : Math.min(20, orderValue * 0.0003);
    const stt = orderType === 'buy' 
      ? (orderMode === 'delivery' ? orderValue * 0.001 : 0)
      : (orderMode === 'delivery' ? orderValue * 0.001 : orderValue * 0.00025);
    const exchangeCharges = orderValue * 0.0000345;
    const sebiCharges = orderValue * 0.000001;
    const stampDuty = orderType === 'buy' ? orderValue * 0.00015 : 0;
    const gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;
    const ipf = orderValue * 0.000001;
    
    const total = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst + ipf;
    
    return {
      brokerage,
      stt,
      exchangeCharges,
      sebiCharges,
      stampDuty,
      gst,
      ipf,
      total
    };
  }, [orderValue, orderType, orderMode]);

  const marginRequired = orderMode === 'intraday' ? orderValue * 0.2 : orderValue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-700">{symbol}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExchange('NSE')}
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                exchange === 'NSE' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'
              }`}
            >
              NSE
            </button>
            <button
              onClick={() => setExchange('BSE')}
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                exchange === 'BSE' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'
              }`}
            >
              BSE
            </button>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">
            ₹{currentPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            ({isPositive ? '+' : ''}{changePercent?.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Order Type Toggle */}
      <div className="flex">
        <button
          onClick={() => setOrderType('buy')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            orderType === 'buy'
              ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500'
              : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderType('sell')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            orderType === 'sell'
              ? 'bg-red-50 text-red-600 border-b-2 border-red-500'
              : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Order Form */}
      <div className="p-4 space-y-4">
        {/* Order Mode */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(['delivery', 'intraday', 'mtf'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setOrderMode(mode)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                orderMode === mode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'mtf' ? 'MTF' : mode}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">Qty</label>
            <span className="text-xs text-slate-400">{exchange}</span>
          </div>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full h-10 px-3 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            min="1"
          />
        </div>

        {/* Price */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">Price</label>
            <button
              onClick={() => setIsMarketOrder(!isMarketOrder)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600"
            >
              {isMarketOrder ? 'Market' : 'Limit'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <input
            type="number"
            value={isMarketOrder ? '' : price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={isMarketOrder ? 'At Market' : '0.00'}
            disabled={isMarketOrder}
            className="w-full h-10 px-3 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-4">
          {/* Balance & Required */}
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Balance :</span>
              <span className="font-semibold text-slate-700">₹0</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Approx req. :</span>
              <span className="font-semibold text-slate-700">
                ₹{marginRequired.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-all ${
              orderType === 'buy'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {orderType === 'buy' ? 'Buy' : 'Sell'}
          </motion.button>
        </div>

        {/* Charges Breakdown */}
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowCharges(!showCharges)}
            className="flex items-center justify-between w-full text-xs"
          >
            <span className="text-slate-500">Estimated charges</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-700">
                ₹{charges?.total.toFixed(2) || '0.00'}
              </span>
              <svg 
                className={`w-4 h-4 text-slate-400 transition-transform ${showCharges ? 'rotate-180' : ''}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showCharges && charges && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 text-xs"
            >
              <div className="text-slate-400 font-medium">Groww charges</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Brokerage</span>
                <span className="text-slate-700">₹{charges.brokerage.toFixed(2)}</span>
              </div>
              
              <div className="text-slate-400 font-medium mt-2">External charges</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Exchange transaction charges</span>
                <span className="text-slate-700">₹{charges.exchangeCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stamp duty</span>
                <span className="text-slate-700">₹{charges.stampDuty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SEBI turnover charges</span>
                <span className="text-slate-700">₹{charges.sebiCharges.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Investor Protection Fund</span>
                <span className="text-slate-700">₹{charges.ipf.toFixed(4)}</span>
              </div>
              
              <div className="text-slate-400 font-medium mt-2">Taxes</div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST</span>
                <span className="text-slate-700">₹{charges.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Securities Transaction Tax</span>
                <span className="text-slate-700">₹{charges.stt.toFixed(2)}</span>
              </div>

              <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                Charges will be added at the end of the day. View exact amount in your contract note.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
