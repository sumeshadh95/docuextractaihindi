export interface DynamicRow {
  [key: string]: string;
}

export interface ExtractionResult {
  document_type_guess: string;
  extracted_text: string;
  extracted_table: DynamicRow[];
  warnings?: string[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}