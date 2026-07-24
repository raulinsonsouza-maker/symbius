const AUTH_KEY = 'symbius:auth';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

export function login(username, password) {
  const ok = username?.trim() === ADMIN_USER && password === ADMIN_PASS;
  if (ok) sessionStorage.setItem(AUTH_KEY, '1');
  return ok;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}
