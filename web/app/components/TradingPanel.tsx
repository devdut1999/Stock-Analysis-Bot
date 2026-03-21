'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

type OrderType = 'buy' | 'sell';
type OrderMode = 'delivery' | 'intraday';

export default function TradingPanel({ symbol, currentPrice, change, changePercent }: TradingPanelProps) {
  const [orderType, setOrderType] = useState<OrderType>('buy');
  const [orderMode, setOrderMode] = useState<OrderMode>('delivery');
  const [quantity, setQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>(currentPrice?.toFixed(2) || '0');
  const [isMarketOrder, setIsMarketOrder] = useState(true);

  const isPositive = change >= 0;
  const totalValue = parseFloat(quantity || '0') * parseFloat(price || '0');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">
            ₹{currentPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{change?.toFixed(2)} ({isPositive ? '+' : ''}{changePercent?.toFixed(2)}%)
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">NSE • Real-time</p>
      </div>

      {/* Order Type Toggle */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setOrderType('buy')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            orderType === 'buy'
              ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderType('sell')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            orderType === 'sell'
              ? 'bg-red-50 text-red-600 border-b-2 border-red-500'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Order Mode */}
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setOrderMode('delivery')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
              orderMode === 'delivery'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Delivery
          </button>
          <button
            onClick={() => setOrderMode('intraday')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
              orderMode === 'intraday'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Intraday
          </button>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(String(Math.max(1, parseInt(quantity || '1') - 1)))}
              className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 h-10 px-3 text-center text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              min="1"
            />
            <button
              onClick={() => setQuantity(String(parseInt(quantity || '0') + 1))}
              className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Price Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">Price</label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isMarketOrder}
                onChange={(e) => setIsMarketOrder(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">Market</span>
            </label>
          </div>
          <input
            type="number"
            value={isMarketOrder ? '' : price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={isMarketOrder ? 'Market Price' : '0.00'}
            disabled={isMarketOrder}
            className="w-full h-10 px-3 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Order Value</span>
            <span className="font-semibold text-slate-700">
              ₹{(isMarketOrder ? parseFloat(quantity || '0') * currentPrice : totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {orderMode === 'delivery' && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Brokerage</span>
              <span className="font-semibold text-emerald-600">₹0</span>
            </div>
          )}
          {orderMode === 'intraday' && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Margin Required</span>
              <span className="font-semibold text-slate-700">
                ₹{((isMarketOrder ? parseFloat(quantity || '0') * currentPrice : totalValue) * 0.2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all ${
            orderType === 'buy'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
          }`}
        >
          {orderType === 'buy' ? 'BUY' : 'SELL'} {symbol}
        </motion.button>

        {/* Disclaimer */}
        <p className="text-[10px] text-slate-400 text-center">
          This is a demo. Connect your broker to place real orders.
        </p>
      </div>
    </div>
  );
}
