// Card and processing types
export type CardStatus = 'SUCCESS' | 'FAIL' | 'ERROR_PREPAYMENT' | 'PROCESSING';
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
  success_rate: number; // 0-100
  current_card?: CardResult | undefined;
}

export interface ResultsResponse {
  runs: CardResult[][];
  total: number;
}
