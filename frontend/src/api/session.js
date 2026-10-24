// Keeps the logged-in session (token and basic user info) in the browser's localStorage.

const KEY = 'lgv.session';

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage can be blocked (private mode); the person just has to log in again next time */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function getToken() {
  return readSession()?.token || null;
}

// The API layer calls this when the server says the token is no longer good.
// AuthContext registers a function here that logs the person out.
let handler = null;
export function setUnauthenticatedHandler(fn) {
  handler = fn;
}
export function notifyUnauthenticated() {
  if (handler) handler();
}
