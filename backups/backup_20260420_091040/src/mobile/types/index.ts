// Card and processing types
export type CardStatus = 'SUCCESS' | 'FAIL' | 'UNKNOWN' | 'ERROR' | 'ERROR_PREPAYMENT' | 'PROCESSING';
export type ProcessingState = 'idle' | 'running' | 'paused' | 'error';

export interface ProcessingStatus {
  is_running: boolean;
  remaining_cards: number;
  total_processed: number;
}

export interface CardResult {
  card_number: string; // Last 4 digits
  mm: string;
  yy: string;
  cvv: string;
  status: CardStatus;
  screenshot_path: string;
  timestamp: string;
}

export interface AnalyticsData {
  success_count: number;
  fail_count: number;
  total_count: number;
  success_rate: number;
  current_card?: CardResult | undefined;
  time_buckets?: { timestamp: number; success: number; fail: number }[];
  time_series?: { timestamp: number; value: number }[];
}

export interface ResultsResponse {
  runs: CardResult[][];
  total: number;
}

// Plate Check Types
export interface PlateCheckStatus {
  is_running: boolean;
  hits_count: number;
  total_lines: number;
  pending_count: number;
}

export interface PlateCheckResponse {
  results: string[];
}

export interface WaCheckoutStatus {
  is_running: boolean;
  hits_to_process: number;
  pending_payment?: {
    plate: string;
    timestamp: number;
  } | null;
}
