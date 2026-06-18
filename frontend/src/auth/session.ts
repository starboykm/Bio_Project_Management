export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const LAST_ACTIVITY_KEY = 'lastActivityAt';

export function hasToken() {
  return Boolean(localStorage.getItem('accessToken'));
}

export function markActivity() {
  if (hasToken()) {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }
}

export function isSessionExpired() {
  if (!hasToken()) {
    return false;
  }
  const lastActivityAt = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  return lastActivityAt > 0 && Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
}

export function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}
