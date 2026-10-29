// Small helpers for phone numbers, names and dates.

/**
 * Turns what a person types into +254XXXXXXXXX, or returns null if it isn't a
 * Kenyan mobile number. Accepts 0712345678, 712345678, 254712345678, +254 712 345 678.
 */
export function normalizePhone(input) {
  if (!input) return null;
  let s = String(input).replace(/[\s\-().]/g, '');
  if (s.startsWith('+254')) s = s.slice(4);
  else if (s.startsWith('254')) s = s.slice(3);
  else if (s.startsWith('0')) s = s.slice(1);
  if (!/^[71]\d{8}$/.test(s)) return null;
  return '+254' + s;
}

/** +254712345678 becomes "0712 345 678". Anything else is returned unchanged. */
export function formatPhone(e164) {
  const m = /^\+254([71]\d{2})(\d{3})(\d{3})$/.exec(e164 || '');
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164 || '';
}

/** Digits only, for wa.me links. */
export function whatsappDigits(e164) {
  return String(e164 || '').replace(/\D/g, '');
}

export function whatsappChatUrl(e164, text) {
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${whatsappDigits(e164)}${q}`;
}

export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || ''; 
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "Peter Kamau" becomes "Peter K." */
export function shortName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function slugify(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function plural(n, one, many) {
  return n === 1 ? one : many;
}

const dateFmt = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric' });

export function formatDate(iso) {
  return iso ? dateFmt.format(new Date(iso)) : '';
}

export function formatMonth(iso) {
  return iso ? monthFmt.format(new Date(iso)) : '';
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} ${plural(mins, 'minute', 'minutes')} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${plural(hours, 'hour', 'hours')} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}

/** Whole days left until `iso`, or 0 or less if it has passed. */
export function daysLeft(iso) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function expiresText(iso) {
  const d = daysLeft(iso);
  if (d <= 0) return 'Expired';
  if (d === 1) return 'Expires tomorrow';
  return `Expires in ${d} days`;
}

export function formatRating(value) {
  return value == null ? '' : Number(value).toFixed(1);
}

export function publicProfileUrl(slug) {
  return `${window.location.origin}/f/${slug}`;
}
