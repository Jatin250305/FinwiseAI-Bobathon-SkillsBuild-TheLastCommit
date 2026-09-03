// ── Transaction Service ───────────────────────────────────────────────────────
import apiClient from './api';
import type {
  Transaction,
  TransactionFilters,
  CreateTransactionRequest,
} from '@/types/transaction';

export const transactionService = {
  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const params: Record<string, string> = {};
    if (filters?.search)   params.search     = filters.search;
    if (filters?.category) params.category   = filters.category;
    if (filters?.type)     params.type       = filters.type;
    if (filters?.dateFrom) params.dateFrom   = filters.dateFrom;
    if (filters?.dateTo)   params.dateTo     = filters.dateTo;
    if (filters?.loanId)   params.loanId     = filters.loanId;
    const { data } = await apiClient.get<Transaction[]>('/transactions', { params });
    return data;
  },

  async create(data: CreateTransactionRequest): Promise<Transaction> {
    const { data: created } = await apiClient.post<Transaction>('/transactions', data);
    return created;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};
