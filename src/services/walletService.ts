// ── Wallet Service ────────────────────────────────────────────────────────────
import apiClient from './api';

export interface WalletBalance {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export const walletService = {
  async get(): Promise<WalletBalance> {
    const { data } = await apiClient.get<WalletBalance>('/wallet');
    return data;
  },

  async deposit(amount: number, description: string): Promise<WalletBalance> {
    const { data } = await apiClient.post<WalletBalance>('/wallet/deposit', {
      amount,
      description,
    });
    return data;
  },
};
