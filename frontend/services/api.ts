import { Platform } from 'react-native';
import axios from 'axios';
import { ProcessingStatus, CardResult, AnalyticsData, ResultsResponse, PlateCheckStatus, PlateCheckResponse, WaCheckoutStatus, CarfactsStatus } from '@/types';

// Use 10.0.2.2 for Android emulator to access host's localhost
const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

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

  getLogTail: async (file: 'wa' | 'results' | 'cc' | 'wa-checkout' | 'carfacts' = 'wa', lines: number = 50): Promise<{ lines: string[] }> => {
    const { data } = await apiClient.get(`/api/logs/tail?file=${file}&lines=${lines}`);
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

  selectCard: async (card: { card_number: string; mm: string; yy: string; cvv: string }): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/wa-checkout/select-card', card);
    return data;
  },

  // --- CarFacts API ---
  getCarfactsStatus: async (): Promise<CarfactsStatus> => {
    const { data } = await apiClient.get<CarfactsStatus>('/api/carfacts/status');
    return data;
  },

  startCarfacts: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/carfacts/start');
    return data;
  },

  stopCarfacts: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/carfacts/stop');
    return data;
  },

  getCarfactsResults: async (): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>('/api/carfacts/results');
    return data;
  },

  clearCarfactsLogs: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/api/carfacts/clear');
    return data;
  },
};
