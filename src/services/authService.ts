// ── Auth Service ─────────────────────────────────────────────────────────────
import apiClient from './api';
import type {
  LoginRequest,
  LoginResult,
  RegisterRequest,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  VerifyOTPRequest,
  ResetPasswordRequest,
  TwoFactorLoginRequest,
  LoginResponse,
  Enable2FAResponse,
  Verify2FARequest,
  MessageResponse,
  VerifySignupOTPRequest,
  ResendSignupOTPRequest,
  DevOTPResponse,
} from '@/types/auth';

/** Map known backend detail strings to user-friendly copy. */
function normalizeError(err: any): never {
  const rawDetail = err?.response?.data?.detail;
  const httpStatus: number = err?.response?.status ?? 0;

  // FastAPI validation errors (422) return detail as an array of objects.
  // Extract the first human-readable msg and strip Pydantic v2's "Value error, " prefix.
  let detail = '';
  if (typeof rawDetail === 'string') {
    detail = rawDetail;
  } else if (Array.isArray(rawDetail) && rawDetail.length > 0) {
    const raw: string = rawDetail[0]?.msg ?? '';
    detail = raw.replace(/^Value error,\s*/i, '');
  }

  const safe = [
    'Invalid email or password.',
    'Account temporarily locked',
    'CAPTCHA verification failed',
    'This account uses Google sign-in',
    'Please use a non-disposable email address',
    'Password must be at least',
    'Name must be',
    'Invalid or expired',
    'Code verified',
    'Too many attempts',
    'If that email is registered',
    'If this email is not already registered',
    'Two-factor authentication',
    '2FA is already enabled',
    '2FA is not enabled',
    'Invalid authenticator code',
    'Invalid code',
    'Session expired',
    'Password updated successfully',
    'An account with this email already exists',
    'Start 2FA setup first',
    'If that email is pending verification',
    'Please wait',
  ];

  const msg = safe.some((s) => detail.startsWith(s))
    ? detail
    : httpStatus === 429
    ? 'Too many attempts. Please wait a moment and try again.'
    : httpStatus === 422 || httpStatus === 400
    ? detail || 'Please check your input and try again.'
    : 'Something went wrong. Please try again.';
  throw new Error(msg);
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const { data } = await apiClient.post<LoginResult>('/auth/login', credentials);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  async register(data: RegisterRequest): Promise<DevOTPResponse> {
    try {
      const { data: response } = await apiClient.post<DevOTPResponse>('/auth/register', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async googleAuth(idToken: string): Promise<LoginResult> {
    try {
      const body: GoogleAuthRequest = { id_token: idToken };
      const { data } = await apiClient.post<LoginResult>('/auth/google', body);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  async verifyEmail(token: string): Promise<LoginResponse> {
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/verify-email', { token });
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<DevOTPResponse> {
    try {
      const { data: response } = await apiClient.post<DevOTPResponse>('/auth/forgot-password', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async verifyOTP(data: VerifyOTPRequest): Promise<MessageResponse> {
    try {
      const { data: response } = await apiClient.post<MessageResponse>('/auth/verify-otp', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
    try {
      const { data: response } = await apiClient.post<MessageResponse>('/auth/reset-password', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async verify2FA(data: TwoFactorLoginRequest): Promise<LoginResponse> {
    try {
      const { data: response } = await apiClient.post<LoginResponse>('/auth/2fa/verify', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async enable2FA(): Promise<Enable2FAResponse> {
    try {
      const { data } = await apiClient.post<Enable2FAResponse>('/auth/2fa/enable');
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  async confirm2FA(data: Verify2FARequest): Promise<MessageResponse> {
    try {
      const { data: response } = await apiClient.post<MessageResponse>('/auth/2fa/confirm', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async disable2FA(data: Verify2FARequest): Promise<MessageResponse> {
    try {
      const { data: response } = await apiClient.delete<MessageResponse>('/auth/2fa/disable', { data });
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async verifySignupOTP(data: VerifySignupOTPRequest): Promise<LoginResponse> {
    try {
      const { data: response } = await apiClient.post<LoginResponse>('/auth/verify-signup-otp', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async resendSignupOTP(data: ResendSignupOTPRequest): Promise<DevOTPResponse> {
    try {
      const { data: response } = await apiClient.post<DevOTPResponse>('/auth/resend-signup-otp', data);
      return response;
    } catch (err) {
      normalizeError(err);
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Logout should always succeed client-side even if server is unavailable
    }
  },
};
