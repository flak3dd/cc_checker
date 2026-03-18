import axios from 'axios';
import { ProcessingStatus, CardResult, AnalyticsData, ResultsResponse } from '@/types';

const API_BASE_URL = 'http://localhost:8000';

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

  // POST file upload with card data
  uploadFile: async (file: File): Promise<{ success: boolean; message: string; count: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post('/api/upload', formData, {
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
};
