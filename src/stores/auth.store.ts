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

const API_BASE = "http://localhost:3000";
const TOKEN_KEY = "auth_token";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
 * If token exists, fetch /auth/me to restore user.
 */
export async function initAuth() {
  const { token } = get(auth);

  if (!token) {
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
 * POST /auth/login { email, password } -> { token }
 * Then calls /auth/me to get user payload and store it.
 */
export async function signIn(email: string, password: string) {
  auth.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const loginRes = await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setStoredToken(loginRes.token);

    auth.update((s) => ({
      ...s,
      token: loginRes.token,
    }));
    await loadMe();

    return loginRes;
  } catch (e) {
    setStoredToken(null);

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

    auth.update((s) => ({
      ...s,
      user: meRes.user,
    }));

    return meRes.user;
  } catch (e) {
    setStoredToken(null);

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

export function signOut() {
  setStoredToken(null);
  auth.set({
    token: null,
    user: null,
    loading: false,
    error: null,
    initialized: true,
  });
}
