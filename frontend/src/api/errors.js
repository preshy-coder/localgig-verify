// One error type for everything that can go wrong when talking to the API.
// Screens look at `error.code` (see FRONTEND-DATA-NEEDS.md, section 2).

const DEFAULT_MESSAGES = {
  NETWORK: "Can't reach LocalGig Verify. Check your internet and try again.",
  TIMEOUT: 'This is taking too long. Check your internet and try again.',
  VALIDATION_FAILED: 'Some details need fixing.',
  INVALID_CREDENTIALS: 'Email or phone number and password do not match.',
  UNAUTHENTICATED: 'Your session has ended. Log in again to continue.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that.",
  LINK_NOT_FOUND: "This link isn't valid.",
  LINK_EXPIRED: 'This link has expired.',
  LINK_USED: 'This link has already been used.',
  PHONE_TAKEN: 'That phone number already has an account.',
  DUPLICATE_REQUEST: 'You already have an open request for this number.',
  RATE_LIMITED: 'Too many tries. Wait a moment and try again.',
  SMS_FAILED: "We couldn't send the SMS. Try again.",
  SERVER_ERROR: 'Something went wrong on our side. Try again in a moment.',
};

export class ApiError extends Error {
  constructor({ status = 0, code = 'SERVER_ERROR', message, fields = null, retryAfterSeconds = null } = {}) {
    super(message || DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.SERVER_ERROR);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Makes sure whatever was thrown is an ApiError, so screens can rely on `code`. */
export function asApiError(e) {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: 'SERVER_ERROR' });
}

/** True when the problem is the person's connection, not the server. */
export function isConnectionError(e) {
  return e?.code === 'NETWORK' || e?.code === 'TIMEOUT';
}
