// The one place screens import the API from. Which version they get (fake data or the
// real back end) is decided by VITE_USE_MOCK in the .env file.
import * as mock from './mock.js';
import * as real from './real.js';

export const isMock = import.meta.env.VITE_USE_MOCK !== 'false';
export const api = isMock ? mock : real;
export { ApiError, asApiError, isConnectionError } from './errors.js';
