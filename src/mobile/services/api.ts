import { Platform } from 'react-native';
import axios from 'axios';
import { ProcessingStatus, CardResult, AnalyticsData, ResultsResponse, PlateCheckStatus, PlateCheckResponse, WaCheckoutStatus } from '@/types';

import Constants from 'expo-constants';

// Production API URL — set this to your deployment URL if needed.
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Resolve API host: use production URL if set, otherwise auto-detect LAN IP
function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    // If we're on web and PRODUCTION_API_URL is set, use it.
    if (PRODUCTION_API_URL) return PRODUCTION_API_URL;
    
    // In local development, if we're accessing via localhost or 127.0.0.1, use port 8000 on that same host.
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))) {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    
    // Otherwise, use relative URLs (empty string) to call the same host.
    return '';
  }

  // If a production URL is configured for native apps, use it
  if (PRODUCTION_API_URL) return PRODUCTION_API_URL;

  // Expo provides the dev server hostname which is the machine's LAN IP
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const lanIp = debuggerHost?.split(':')[0];

  if (lanIp) return `http://${lanIp}:8000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Generous timeout for device over LAN
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Log connection target on startup (visible in Expo Go console)
console.log(`[API] Target: ${API_BASE_URL}`);

export const api = {
  // GET current processing status
  getStatus: async (): Promise<ProcessingStatus> => {
    const { data } = await apiClient.get<ProcessingStatus>('/api/status');
    return data;
  },

  // GET results grouped by run
  getResults: async (): Promise<ResultsResponse> => {
    const { data } = await apiClient.get<ResultsResponse>('/api/results');
    return data;
  },

  // POST clear all results
  clearResults: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/results/clear');
    return data;
  },

  // POST re-run cards from a run
  rerunCards: async (
    cards: Array<{ card_number: string; mm: string; yy: string; cvv: string }>
  ): Promise<{ success: boolean; message: string; count: number }> => {
    const { data } = await apiClient.post('/api/rerun', { cards });
    return data;
  },

  // GET analytics data
  getAnalytics: async (): Promise<AnalyticsData> => {
    const { data } = await apiClient.get<AnalyticsData>('/api/analytics');
    return data;
  },

  // POST file upload with card data or plate data (cross-platform)
  uploadFile: async (
    fileUri: string,
    target: 'cc' | 'wa_rego' = 'cc',
    fileName: string = 'upload.txt',
  ): Promise<{ success: boolean; message: string; count: number }> => {
    const formData = new FormData();
    // React Native FormData accepts { uri, name, type } objects
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'text/plain',
    } as any);
    const { data } = await apiClient.post(`/api/upload?target=${target}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // POST start processing
  startProcessing: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/processing/start');
    return data;
  },

  // POST stop processing
  stopProcessing: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/processing/stop');
    return data;
  },

  // --- Plate Check API ---
  getPlateCheckStatus: async (): Promise<PlateCheckStatus> => {
    const { data } = await apiClient.get<PlateCheckStatus>('/api/plate-check/status');
    return data;
  },

  getPlateCheckResults: async (): Promise<PlateCheckResponse> => {
    const { data } = await apiClient.get<PlateCheckResponse>('/api/plate-check/results');
    return data;
  },

  startPlateCheck: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/plate-check/start');
    return data;
  },

  stopPlateCheck: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/plate-check/stop');
    return data;
  },
  
  clearPlateResults: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/plate-check/clear');
    return data;
  },

  generatePlates: async (count: number = 100): Promise<{ success: boolean; message: string; count: number }> => {
    const { data } = await apiClient.post(`/api/plate-check/generate?count=${count}`);
    return data;
  },

  getLogTail: async (file: 'wa' | 'results' | 'cc' | 'wa-checkout' | 'gateway2' = 'wa', lines: number = 50): Promise<{ lines: string[] }> => {
    const { data } = await apiClient.get(`/api/logs/tail?file=${file}&lines=${lines}`);
    return data;
  },

  // --- Gateway2 API ---
  getGateway2Status: async (): Promise<ProcessingStatus> => {
    const { data } = await apiClient.get<ProcessingStatus>('/api/gateway2/status');
    return data;
  },

  startGateway2: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/gateway2/start');
    return data;
  },

  stopGateway2: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/gateway2/stop');
    return data;
  },

  getGateway2Results: async (): Promise<{ results: CardResult[]; total: number; hasMore: boolean }> => {
    const { data } = await apiClient.get('/api/gateway2/results');
    return data;
  },

  clearGateway2Results: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/gateway2/clear');
    return data;
  },

  // --- WA Checkout API ---
  getWaCheckoutStatus: async (): Promise<WaCheckoutStatus> => {
    const { data } = await apiClient.get<WaCheckoutStatus>('/api/wa-checkout/status');
    return data;
  },

  startWaCheckout: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/wa-checkout/start');
    return data;
  },

  stopWaCheckout: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/wa-checkout/stop');
    return data;
  },

  clearWaCheckoutLogs: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/wa-checkout/clear');
    return data;
  },

  getWaRegoHits: async (): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>('/api/wa-rego/hits');
    return data;
  },

  getWaCheckoutResults: async (): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>('/api/wa-rego/checkout-results');
    return data;
  },

  setCheckoutTerm: async (term: 3 | 6 | 12): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/wa-checkout/set-term', { term });
    return data;
  },

  getCheckoutTerm: async (): Promise<{ term: number }> => {
    const { data } = await apiClient.get('/api/wa-checkout/term');
    return data;
  },

  selectCard: async (card: { card_number: string; mm: string; yy: string; cvv: string }): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/wa-checkout/select-card', card);
    return data;
  },

  // Paginated results for Results hub
  getPaginatedResults: async (type: 'cc' | 'wa' | 'gateway2', page: number = 1, limit: number = 20): Promise<{ results: any[]; hasMore: boolean; total: number }> => {
    const endpoint = type === 'gateway2' ? `/api/gateway2/results?page=${page}&limit=${limit}` : `/api/results/${type}?page=${page}&limit=${limit}`;
    const { data } = await apiClient.get(endpoint);
    return data;
  },
};

