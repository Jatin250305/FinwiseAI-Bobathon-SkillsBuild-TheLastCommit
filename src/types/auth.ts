// ── Auth types ──────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'bank_officer' | 'bank_admin';
export type AuthProvider = 'local' | 'google';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  avatarUrl?: string | null;
  authProvider: AuthProvider;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  captcha_token?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Partial2FAResponse {
  requires_2fa: true;
  partial_token: string;
}

// LoginResult is now declared below (after NeedsVerificationResponse)

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  captcha_token?: string;
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
  captcha_token?: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password: string;
}

export interface TwoFactorLoginRequest {
  partial_token: string;
  totp_code: string;
}

export interface Enable2FAResponse {
  qr_uri: string;
  secret: string;
}

export interface Verify2FARequest {
  totp_code: string;
}

export interface MessageResponse {
  message: string;
}

// dev_otp is only present when APP_ENV=development on the backend
export interface DevOTPResponse {
  message: string;
  dev_otp?: string | null;
}

// ── Signup OTP verification ───────────────────────────────────────────────────

export interface VerifySignupOTPRequest {
  email: string;
  otp: string;
}

export interface ResendSignupOTPRequest {
  email: string;
}

export interface NeedsVerificationResponse {
  needs_verification: true;
  email: string;
  dev_otp?: string | null;
}

export type LoginResult = LoginResponse | Partial2FAResponse | NeedsVerificationResponse;
