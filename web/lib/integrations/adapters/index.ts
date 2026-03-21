import { IntegrationAdapter } from '../types';
import { googleNewsAdapter } from './google-news';

export const adapters: Record<string, IntegrationAdapter<any, any>> = {
  google_news: googleNewsAdapter,
};

export function getAdapter(id: string): IntegrationAdapter<any, any> | undefined {
  return adapters[id];
}
