import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ProcessingStatus, AnalyticsData, ResultsResponse } from '@/types';

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
