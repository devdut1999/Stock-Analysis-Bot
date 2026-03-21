'use client';

import { useState } from 'react';
import { IntegrationDefinition } from '../../../lib/integrations/types';

interface IntegrationConfigModalProps {
  integration: IntegrationDefinition;
  currentConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function IntegrationConfigModal({
  integration,
  currentConfig,
  onSave,
  onClose,
}: IntegrationConfigModalProps) {
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of integration.configSchema) {
      initial[field.key] = (currentConfig[field.key] as string) || '';
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(config);
    setSaving(false);
  };

  const hasRequiredFields = integration.configSchema
    .filter(f => f.required)
    .every(f => config[f.key]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{integration.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{integration.name}</h2>
              <p className="text-xs text-slate-400">{integration.description}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {integration.configSchema.length === 0 ? (
            <p className="text-sm text-slate-500">
              This integration doesn&apos;t require any configuration. Click Enable to get started.
            </p>
          ) : (
            integration.configSchema.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={config[field.key] || ''}
                  onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
                {field.helpText && (
                  <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>
                )}
              </div>
            ))
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !hasRequiredFields}
            className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Enable Integration'}
          </button>
        </div>
      </div>
    </div>
  );
}
