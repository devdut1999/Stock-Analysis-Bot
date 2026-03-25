import { IntegrationDefinition } from '../../../lib/integrations/types';

interface IntegrationCardProps {
  integration: IntegrationDefinition;
  connected: boolean;
  loading?: boolean;
  onConfigure: () => void;
  onDisable: () => void;
  onQuickEnable: () => void;
}

export default function IntegrationCard({
  integration,
  connected,
  loading = false,
  onConfigure,
  onDisable,
  onQuickEnable,
}: IntegrationCardProps) {
  const needsConfig = integration.configSchema.length > 0;

  return (
    <div className={`bg-white rounded-2xl border p-6 transition-all ${
      connected
        ? 'border-emerald-200 shadow-sm shadow-emerald-100'
        : 'border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{integration.icon}</span>
        {connected && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
            Connected
          </span>
        )}
      </div>

      <h3 className="font-bold text-slate-900 text-lg mb-1">{integration.name}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-5">{integration.description}</p>

      <div className="flex gap-2">
        {connected ? (
          <>
            {needsConfig && (
              <button
                onClick={onConfigure}
                disabled={loading}
                className="flex-1 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Configure
              </button>
            )}
            <button
              onClick={onDisable}
              disabled={loading}
              className="text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </button>
          </>
        ) : (
          <button
            onClick={needsConfig ? onConfigure : onQuickEnable}
            disabled={loading}
            className="flex-1 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              needsConfig ? 'Configure & Connect' : integration.authType === 'oauth2' ? `Connect ${integration.name}` : 'Enable'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
