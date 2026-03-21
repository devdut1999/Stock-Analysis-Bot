import { IntegrationAdapter } from '../types';
import { googleNewsAdapter } from './google-news';
import { upstoxAdapter } from './upstox-adapter';

export const adapters: Record<string, IntegrationAdapter<any, any> | typeof upstoxAdapter> = {
  google_news: googleNewsAdapter,
  upstox: upstoxAdapter,
};

export function getAdapter(id: string) {
  return adapters[id];
}
