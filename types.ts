export interface NotionRow {
  Name: string;
  Address: string;
  Phone: string;
  Email: string;
  Organization: string;
  Notes: string;
}

export interface ExtractionResult {
  document_type_guess: string;
  extracted_text: string;
  extracted_table: NotionRow[];
  warnings?: string[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}