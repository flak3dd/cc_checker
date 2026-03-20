import { Platform } from 'react-native';
import axios from 'axios';
import { ProcessingStatus, CardResult, AnalyticsData, ResultsResponse, PlateCheckStatus, PlateCheckResponse } from '@/types';

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

  // POST file upload with card data or plate data
  uploadFile: async (file: File, target: 'cc' | 'wa_rego' = 'cc'): Promise<{ success: boolean; message: string; count: number }> => {
    const formData = new FormData();
    formData.append('file', file);
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

  getLogTail: async (file: 'wa' | 'results' | 'cc' = 'wa', lines: number = 50): Promise<{ lines: string[] }> => {
    const { data } = await apiClient.get(`/api/logs/tail?file=${file}&lines=${lines}`);
    return data;
  },
};
