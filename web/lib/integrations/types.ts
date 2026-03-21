export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'toggle';
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'news' | 'broker' | 'social' | 'messaging';
  configSchema: ConfigField[];
  requiresAuth: boolean;
}

export interface IntegrationFetchParams<TConfig = Record<string, unknown>> {
  config: TConfig;
  symbol?: string;
  limit?: number;
}

export interface IntegrationAdapter<TConfig = Record<string, unknown>, TResult = unknown> {
  id: string;
  validate(config: TConfig): Promise<{ valid: boolean; error?: string }>;
  fetch(params: IntegrationFetchParams<TConfig>): Promise<TResult>;
}
