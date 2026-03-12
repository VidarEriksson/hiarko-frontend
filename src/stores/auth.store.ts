import { writable, get } from "svelte/store";

type MeUser = {
  email: string;
  id: number;
  iat: number;
  exp: number;
};

type AuthState = {
  token: string | null;
  user: MeUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setStoredRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = (await res.json()) as T;

  if (!res.ok) {
    const message = (data as any)?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

const initial: AuthState = {
  token: getStoredToken(),
  user: null,
  loading: false,
  error: null,
  initialized: false,
};

export const auth = writable<AuthState>(initial);

/**
 * Call once at app startup.
 * If access token exists, fetch /auth/me to restore user.
 * If only a refresh token exists, attempt to get a new access token first.
 */
export async function initAuth() {
  const { token } = get(auth);

  if (!token) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await refreshAccessToken();
        await loadMe();
      } catch {
        // refresh failed — stay logged out
      }
    }
    auth.update((s) => ({ ...s, initialized: true }));
    return;
  }

  try {
    await loadMe();
  } finally {
    auth.update((s) => ({ ...s, initialized: true }));
  }
}

/**
 * Logs the user in.
 * POST /auth/login { email, password } -> { accessToken, refreshToken }
 * Then calls /auth/me to get user payload and store it.
 */
export async function signIn(email: string, password: string) {
  auth.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const loginRes = await request<{ accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setStoredToken(loginRes.accessToken);
    setStoredRefreshToken(loginRes.refreshToken);

    auth.update((s) => ({ ...s, token: loginRes.accessToken }));
    await loadMe();

    return loginRes;
  } catch (e) {
    setStoredToken(null);
    setStoredRefreshToken(null);

    auth.update((s) => ({
      ...s,
      token: null,
      user: null,
      error: e instanceof Error ? e.message : "Login failed",
    }));

    throw e;
  } finally {
    auth.update((s) => ({ ...s, loading: false }));
  }
}

/**
 * Registers a user and signs them in if the API returns a token.
 * POST /auth/register { email, password } -> { token }
 */
export async function register(email: string, password: string) {
  auth.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const res = await request<{ token?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // If API returns a token, store it and load the user
    if (res.token) {
      const t = res.token ?? null;
      setStoredToken(t);
      auth.update((s) => ({ ...s, token: t }));
      await loadMe();
    }

    return res;
  } catch (e) {
    setStoredToken(null);
    setStoredRefreshToken(null);

    auth.update((s) => ({
      ...s,
      token: null,
      user: null,
      error: e instanceof Error ? e.message : "Registration failed",
    }));

    throw e;
  } finally {
    auth.update((s) => ({ ...s, loading: false }));
  }
}

/**
 * Loads the user profile from /auth/me using current token.
 * GET /auth/me -> { user: { email, id, iat, exp } }
 */
export async function loadMe() {
  const { token } = get(auth);

  if (!token) {
    auth.update((s) => ({ ...s, user: null }));
    return null;
  }

  try {
    auth.update((s) => ({ ...s, loading: true, error: null }));

    const meRes = await request<{ user: MeUser }>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    auth.update((s) => ({ ...s, user: meRes.user }));

    return meRes.user;
  } catch (e) {
    setStoredToken(null);
    setStoredRefreshToken(null);

    auth.update((s) => ({
      ...s,
      token: null,
      user: null,
      error: e instanceof Error ? e.message : "Session expired",
    }));

    return null;
  } finally {
    auth.update((s) => ({ ...s, loading: false }));
  }
}

/**
 * Uses the stored refresh token to get a new access token (with rotation).
 * Deduplicates concurrent calls — all callers share the same in-flight request.
 * Returns the new access token on success, throws on failure.
 */
let _refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = _doRefresh().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

async function _doRefresh(): Promise<string> {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    clearAuth();
    throw new Error("No refresh token");
  }

  try {
    const res = await request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    setStoredToken(res.accessToken);
    setStoredRefreshToken(res.refreshToken);
    auth.update((s) => ({ ...s, token: res.accessToken }));

    return res.accessToken;
  } catch (e) {
    clearAuth();
    throw e;
  }
}

export async function signOut() {
  const refreshToken = getStoredRefreshToken();

  if (refreshToken) {
    // Fire-and-forget — don't block sign-out on network failure
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }

  clearAuth();
}

function clearAuth() {
  setStoredToken(null);
  setStoredRefreshToken(null);
  auth.set({
    token: null,
    user: null,
    loading: false,
    error: null,
    initialized: true,
  });
}
