/**
 * The one place that knows where the session token lives. Keeping the storage
 * key in a single module means a future move to a cookie or to memory touches
 * this file only.
 */
const TOKEN_KEY = "userToken";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);

export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);
