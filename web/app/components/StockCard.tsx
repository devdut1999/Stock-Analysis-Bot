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
        className="flex items-center justify-between px-3 py-2.5 hover:bg-[#222636] rounded-lg transition-colors"
      >
        <div className="min-w-0">
          <span className="font-semibold text-sm text-white">{symbol}</span>
          <span className="text-xs text-[#5d6178] ml-2 truncate">{name}</span>
        </div>
        <div className="text-right shrink-0 ml-3">
          {price != null && (
            <div className="text-sm font-medium text-[#e1e4ea]">₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          )}
          {changePercent != null && (
            <div className={`text-xs font-medium ${isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
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
      className="block bg-[#1a1d29] rounded-xl border border-[#2a2e3f] p-4 hover:bg-[#222636] hover:border-[#3b82f6]/25 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-white">{symbol}</h3>
          <p className="text-xs text-[#5d6178] truncate max-w-[160px]">{name}</p>
        </div>
        {sector && (
          <span className="text-[10px] bg-[#222636] text-[#5d6178] px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider">
            {sector}
          </span>
        )}
      </div>
      {price != null && (
        <div className="mt-3">
          <span className="text-lg font-bold text-white">
            ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          {changePercent != null && (
            <span className={`ml-2 text-sm font-semibold ${isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
