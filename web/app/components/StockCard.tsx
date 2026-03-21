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
        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="min-w-0">
          <span className="font-semibold text-sm text-gray-900">{symbol}</span>
          <span className="text-xs text-gray-500 ml-2 truncate">{name}</span>
        </div>
        <div className="text-right shrink-0 ml-3">
          {price != null && (
            <div className="text-sm font-medium">₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          )}
          {changePercent != null && (
            <div className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
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
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{symbol}</h3>
          <p className="text-xs text-gray-500 truncate max-w-[160px]">{name}</p>
        </div>
        {sector && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
            {sector}
          </span>
        )}
      </div>
      {price != null && (
        <div className="mt-3">
          <span className="text-lg font-bold text-gray-900">
            ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          {changePercent != null && (
            <span className={`ml-2 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
