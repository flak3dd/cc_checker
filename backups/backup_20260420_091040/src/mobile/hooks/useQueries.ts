import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ProcessingStatus, AnalyticsData, ResultsResponse, PlateCheckStatus, PlateCheckResponse, WaCheckoutStatus } from '@/types';

/** Common retry config for device resilience */
const DEVICE_QUERY_OPTS = {
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
  // Optimize for performance
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;

export const useStatusQuery = () =>
  useQuery<ProcessingStatus>({
    queryKey: ['status'],
    queryFn: () => api.getStatus(),
    refetchInterval: 5000,
    staleTime: 5000,
    ...DEVICE_QUERY_OPTS,
  });

export const useResultsQuery = () =>
  useQuery<ResultsResponse>({
    queryKey: ['results'],
    queryFn: () => api.getResults(),
    staleTime: 30000,
    ...DEVICE_QUERY_OPTS,
  });

export const useAnalyticsQuery = () =>
  useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => api.getAnalytics(),
    refetchInterval: 7000,
    staleTime: 10000,
    ...DEVICE_QUERY_OPTS,
  });

export const usePlateCheckStatusQuery = () =>
  useQuery<PlateCheckStatus>({
    queryKey: ['plateCheckStatus'],
    queryFn: () => api.getPlateCheckStatus(),
    refetchInterval: 3000,
    staleTime: 1500,
    ...DEVICE_QUERY_OPTS,
  });

export const usePlateCheckResultsQuery = () =>
  useQuery<PlateCheckResponse>({
    queryKey: ['plateCheckResults'],
    queryFn: () => api.getPlateCheckResults(),
    refetchInterval: 5000,
    staleTime: 2500,
    ...DEVICE_QUERY_OPTS,
  });

export const useLogTailQuery = (file: 'wa' | 'results' | 'cc' | 'wa-checkout' | 'gateway2' = 'wa') =>
  useQuery<{ lines: string[] }>({
    queryKey: ['logTail', file],
    queryFn: () => api.getLogTail(file),
    refetchInterval: 1500,
    staleTime: 1000,
    ...DEVICE_QUERY_OPTS,
  });

export const useGateway2StatusQuery = () =>
  useQuery<ProcessingStatus>({
    queryKey: ['gateway2Status'],
    queryFn: () => api.getGateway2Status(),
    refetchInterval: 5000,
    staleTime: 5000,
    ...DEVICE_QUERY_OPTS,
  });

export const useGateway2CrawlStatusQuery = () =>
  useQuery<{ is_running: boolean }>({
    queryKey: ['gateway2CrawlStatus'],
    queryFn: () => api.getGateway2CrawlStatus(),
    refetchInterval: 5000,
    staleTime: 5000,
    ...DEVICE_QUERY_OPTS,
  });

export const useGateway2ResultsQuery = () =>
  useQuery({
    queryKey: ['gateway2Results'],
    queryFn: () => api.getGateway2Results(),
    staleTime: 30000,
    ...DEVICE_QUERY_OPTS,
  });

export const useWaCheckoutStatusQuery = () =>
  useQuery<WaCheckoutStatus>({
    queryKey: ['waCheckoutStatus'],
    queryFn: () => api.getWaCheckoutStatus(),
    refetchInterval: 3000,
    staleTime: 1500,
    ...DEVICE_QUERY_OPTS,
  });

export const useWaRegoHitsQuery = () =>
  useQuery<any[]>({
    queryKey: ['waRegoHits'],
    queryFn: () => api.getWaRegoHits(),
    refetchInterval: 10000,
    staleTime: 15000,
    ...DEVICE_QUERY_OPTS,
  });

export const useWaCheckoutResultsQuery = () =>
  useQuery<any[]>({
    queryKey: ['waCheckoutResults'],
    queryFn: () => api.getWaCheckoutResults(),
    refetchInterval: 5000,
    ...DEVICE_QUERY_OPTS,
  });

export const usePaginatedResultsQuery = (type: 'cc' | 'wa' | 'gateway2', page: number = 1, limit: number = 20) =>
  useQuery({
    queryKey: ['paginatedResults', type, page],
    queryFn: () => api.getPaginatedResults(type, page, limit),
    staleTime: 30000,
    ...DEVICE_QUERY_OPTS,
  });
