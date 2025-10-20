const STORAGE_KEY = 'agenda-facil:pending-auth-email';
let fallbackEmail = null;

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('Session storage unavailable. Falling back to in-memory store.', error);
    return null;
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}

export function savePendingAuthEmail(email) {
  const normalized = normalizeEmail(email);
  fallbackEmail = normalized || null;

  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  if (!normalized) {
    storage.removeItem(STORAGE_KEY);
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, normalized);
  } catch (error) {
    console.warn('Failed to persist pending auth email to sessionStorage.', error);
  }
}

export function readPendingAuthEmail() {
  const storage = getSessionStorage();

  if (!storage) {
    return fallbackEmail;
  }

  try {
    const stored = storage.getItem(STORAGE_KEY);

    if (stored) {
      fallbackEmail = stored;
    }

    return stored ?? fallbackEmail;
  } catch (error) {
    console.warn('Failed to read pending auth email from sessionStorage.', error);
    return fallbackEmail;
  }
}

export function clearPendingAuthEmail() {
  fallbackEmail = null;

  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear pending auth email from sessionStorage.', error);
  }
}
