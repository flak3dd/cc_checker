import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ProcessingStatus, AnalyticsData, ResultsResponse, PlateCheckStatus, PlateCheckResponse } from '@/types';

export const useStatusQuery = () =>
  useQuery<ProcessingStatus>({
    queryKey: ['status'],
    queryFn: () => api.getStatus(),
    refetchInterval: 2000, // Poll every 2 seconds
    staleTime: 1000,
  });

export const useResultsQuery = () =>
  useQuery<ResultsResponse>({
    queryKey: ['results'],
    queryFn: () => api.getResults(),
    staleTime: 10000,
  });

export const useAnalyticsQuery = () =>
  useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => api.getAnalytics(),
    refetchInterval: 5000,
    staleTime: 2000,
  });

export const usePlateCheckStatusQuery = () =>
  useQuery<PlateCheckStatus>({
    queryKey: ['plateCheckStatus'],
    queryFn: () => api.getPlateCheckStatus(),
    refetchInterval: 3000,
    staleTime: 1500,
  });

export const usePlateCheckResultsQuery = () =>
  useQuery<PlateCheckResponse>({
    queryKey: ['plateCheckResults'],
    queryFn: () => api.getPlateCheckResults(),
    refetchInterval: 5000,
    staleTime: 2500,
  });

export const useLogTailQuery = (file: 'wa' | 'results' | 'cc' = 'wa') =>
  useQuery<{ lines: string[] }>({
    queryKey: ['logTail', file],
    queryFn: () => api.getLogTail(file),
    refetchInterval: 1500,
    staleTime: 500,
  });
