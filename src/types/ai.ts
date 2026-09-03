// ── AI / Chat types ──────────────────────────────────────────────────────────
export type AIDataType =
  | 'financial_data'
  | 'calculation'
  | 'retrieved_information'
  | 'insight';

export interface AIDataBlock {
  type: AIDataType;
  title: string;
  values?: Record<string, unknown>;
}

export interface AISource {
  title: string;
  url: string;
  publisher?: string;
}

export interface AIChatRequest {
  message: string;
  conversationId?: string;
  context?: {
    page?: string;
    transactionIds?: string[];
    loanId?: string;
    goalId?: string;
  };
}

export interface AIChatResponse {
  message: string;
  intent?: string;
  data?: AIDataBlock[];
  sources?: AISource[];
  calculation?: {
    type: string;
    result: unknown;
  };
  confidence?: number;
  disclaimer?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  data?: AIDataBlock[];
  sources?: AISource[];
  disclaimer?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
