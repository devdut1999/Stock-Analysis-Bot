'use client';

import { useState, useEffect } from 'react';
import { INTEGRATIONS } from '../../lib/integrations/registry';
import { IntegrationDefinition } from '../../lib/integrations/types';
import IntegrationCard from './components/IntegrationCard';
import IntegrationConfigModal from './components/IntegrationConfigModal';

interface UserIntegration {
  provider: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export default function IntegrationsPage() {
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDefinition | null>(null);

  useEffect(() => {
    fetchUserIntegrations();
  }, []);

  const fetchUserIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setUserIntegrations(data.integrations || []);
      }
    } catch {
      // Not logged in or error
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (provider: string, config: Record<string, unknown> = {}) => {
    // Check if this is an OAuth integration (like Upstox)
    const integration = INTEGRATIONS.find(i => i.id === provider);
    if (integration?.authType === 'oauth2') {
      // Redirect to OAuth flow
      try {
        const res = await fetch(`/api/integrations/${provider}/connect`);
        if (res.ok) {
          const data = await res.json();
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
            return;
          }
        }
      } catch {
        // Fall through to regular enable
      }
    }

    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, config, enabled: true }),
    });
    if (res.ok) {
      await fetchUserIntegrations();
      setSelectedIntegration(null);
    }
  };

  const handleDisable = async (provider: string) => {
    const res = await fetch(`/api/integrations?provider=${provider}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchUserIntegrations();
    }
  };

  const isConnected = (provider: string) =>
    userIntegrations.some(i => i.provider === provider && i.enabled);

  const getUserConfig = (provider: string) =>
    userIntegrations.find(i => i.provider === provider)?.config || {};

  const categories = [
    { id: 'news' as const, label: 'News & Data', icon: '📊' },
    { id: 'social' as const, label: 'Social & Community', icon: '💬' },
    { id: 'broker' as const, label: 'Brokers', icon: '📈' },
    { id: 'messaging' as const, label: 'Messaging & Alerts', icon: '🔔' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-2">
          Connect external data sources, brokers, and notification channels to enhance your trading intelligence.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-48">
              <div className="skeleton h-8 w-8 rounded-xl mb-4" />
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-full mb-1" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        categories.map(cat => {
          const integrations = INTEGRATIONS.filter(i => i.category === cat.id);
          if (integrations.length === 0) return null;

          return (
            <section key={cat.id}>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span>{cat.icon}</span> {cat.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    connected={isConnected(integration.id)}
                    onConfigure={() => setSelectedIntegration(integration)}
                    onDisable={() => handleDisable(integration.id)}
                    onQuickEnable={() => handleEnable(integration.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {selectedIntegration && (
        <IntegrationConfigModal
          integration={selectedIntegration}
          currentConfig={getUserConfig(selectedIntegration.id)}
          onSave={(config) => handleEnable(selectedIntegration.id, config)}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  );
}
