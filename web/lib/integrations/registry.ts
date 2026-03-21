import { IntegrationDefinition } from './types';

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'google_news',
    name: 'Google News',
    description: 'Fetch latest stock market news from Google News. No API key required.',
    icon: '📰',
    category: 'news',
    configSchema: [],
    requiresAuth: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Get stock analysis videos from financial creators and market commentary.',
    icon: '▶️',
    category: 'social',
    configSchema: [
      { key: 'apiKey', label: 'YouTube Data API Key', type: 'password', required: true, placeholder: 'AIza...', helpText: 'Get from Google Cloud Console → APIs → YouTube Data API v3' },
    ],
    requiresAuth: true,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Track discussions on r/IndianStockMarket and r/IndianStreetBets.',
    icon: '🔴',
    category: 'social',
    configSchema: [],
    requiresAuth: false,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Send stock alerts and analysis to your Telegram channel or group.',
    icon: '✈️',
    category: 'messaging',
    configSchema: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true, placeholder: '123456:ABC-DEF...', helpText: 'Create a bot via @BotFather on Telegram' },
      { key: 'chatId', label: 'Chat ID', type: 'text', required: true, placeholder: '-1001234567890', helpText: 'Channel or group chat ID' },
    ],
    requiresAuth: true,
  },
  {
    id: 'zerodha',
    name: 'Zerodha Kite',
    description: 'Connect your Zerodha account for live portfolio tracking and market data.',
    icon: '🪁',
    category: 'broker',
    configSchema: [
      { key: 'apiKey', label: 'Kite API Key', type: 'password', required: true, helpText: 'From Kite Connect developer portal' },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
    ],
    requiresAuth: true,
  },
  {
    id: 'upstox',
    name: 'Upstox',
    description: 'Connect your Upstox account for fast real-time NSE/BSE data, F&O analytics, and portfolio sync.',
    icon: '📈',
    category: 'broker',
    configSchema: [],
    requiresAuth: true,
    authType: 'oauth2',
    oauthConfig: {
      authUrl: 'https://api.upstox.com/v2/login/authorization/dialog',
      tokenUrl: 'https://api.upstox.com/v2/login/authorization/token',
    },
  },
  {
    id: 'groww',
    name: 'Groww',
    description: 'Import your Groww portfolio and track holdings. Coming soon.',
    icon: '🌱',
    category: 'broker',
    configSchema: [],
    requiresAuth: true,
  },
];

export const INTEGRATION_MAP = new Map(INTEGRATIONS.map(i => [i.id, i]));

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_MAP.get(id);
}

export function getIntegrationsByCategory(category: IntegrationDefinition['category']): IntegrationDefinition[] {
  return INTEGRATIONS.filter(i => i.category === category);
}
