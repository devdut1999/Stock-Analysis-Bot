import Link from 'next/link';

interface StockCardProps {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  sector?: string;
  compact?: boolean;
}

export default function StockCard({
  symbol,
  name,
  price,
  change,
  changePercent,
  sector,
  compact = false,
}: StockCardProps) {
  const isPositive = (change ?? 0) >= 0;

  if (compact) {
    return (
      <Link
        href={`/stock/${symbol}`}
        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors"
      >
        <div className="min-w-0">
          <span className="font-bold text-sm text-slate-900">{symbol}</span>
          <span className="text-xs text-slate-400 ml-2 truncate">{name}</span>
        </div>
        <div className="text-right shrink-0 ml-3">
          {price != null && (
            <div className="text-sm font-semibold text-slate-700">₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          )}
          {changePercent != null && (
            <div className={`text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/stock/${symbol}`}
      className="block bg-white rounded-2xl border border-slate-200 p-5 card-hover shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{symbol}</h3>
          <p className="text-xs text-slate-400 truncate max-w-[140px]">{name}</p>
        </div>
        {sector && (
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-wider font-semibold">
            {sector}
          </span>
        )}
      </div>
      {price != null && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <span className="text-xl font-bold text-slate-900">
            ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          {changePercent != null && (
            <span className={`ml-2 text-sm font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
