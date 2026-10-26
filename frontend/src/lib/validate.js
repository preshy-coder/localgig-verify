// Checks that run in the browser before anything is sent, so people get instant feedback.
// The back end must repeat these checks: the browser can always be bypassed.
import { normalizePhone } from './format.js';

export const LIMITS = {
  fullName: [2, 60],
  password: [8, 72],
  headline: 80,
  bio: 500,
  town: 40,
  skills: 10,
  skill: 30,
  portfolio: 8,
  itemTitle: 60,
  itemDescription: 300,
  clientName: [2, 60],
  jobTitle: [3, 80],
  comment: 500,
  displayName: 40,
};

export const PHONE_MESSAGE = 'Enter a Kenyan mobile number, like 0712 345 678.';
export const EMAIL_MESSAGE = 'Enter a valid email address.';

export function isEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function checkName(value, [min, max], emptyMsg) {
  const v = (value || '').trim();
  if (!v) return emptyMsg;
  if (v.length < min || v.length > max) return `Use ${min} to ${max} characters.`;
  return null;
}

function checkPassword(value) {
  const [min, max] = LIMITS.password;
  if (!value) return 'Enter a password.';
  if (value.length < min) return `Password must be at least ${min} characters.`;
  if (value.length > max) return `Password can be at most ${max} characters.`;
  return null;
}

export function validateSignUp({ fullName, email, phone, password }) {
  const e = {};
  const n = checkName(fullName, LIMITS.fullName, 'Enter your full name.');
  if (n) e.fullName = n;
  if (!isEmail(email)) e.email = EMAIL_MESSAGE;
  if (!normalizePhone(phone)) e.phone = PHONE_MESSAGE;
  const p = checkPassword(password);
  if (p) e.password = p;
  return e;
}

export function validateLogin({ identifier, password }) {
  const e = {};
  if (!isEmail(identifier) && !normalizePhone(identifier)) e.identifier = 'Enter a valid email address or Kenyan mobile number.';
  if (!password) e.password = 'Enter your password.';
  return e;
}

export function validateProfile(p) {
  const e = {};
  if ((p.headline || '').length > LIMITS.headline) e.headline = `Keep your headline to ${LIMITS.headline} characters or fewer.`;
  if ((p.bio || '').length > LIMITS.bio) e.bio = `Keep your bio to ${LIMITS.bio} characters or fewer.`;
  if ((p.town || '').length > LIMITS.town) e.town = `Keep the town name to ${LIMITS.town} characters or fewer.`;
  if (p.skills.length > LIMITS.skills) e.skills = `Add up to ${LIMITS.skills} skills.`;
  p.portfolio.forEach((item, i) => {
    if (!item.title.trim()) e[`portfolio.${i}.title`] = 'Give this work a title.';
    else if (item.title.length > LIMITS.itemTitle) e[`portfolio.${i}.title`] = `Keep the title to ${LIMITS.itemTitle} characters or fewer.`;
    if ((item.description || '').length > LIMITS.itemDescription) e[`portfolio.${i}.description`] = `Keep this to ${LIMITS.itemDescription} characters or fewer.`;
    if (item.link && !/^https?:\/\/\S+$/i.test(item.link.trim())) e[`portfolio.${i}.link`] = 'Links must start with http:// or https://';
  });
  return e;
}

export function validateRequest({ clientName, clientPhone, jobTitle }, ownPhone) {
  const e = {};
  const n = checkName(clientName, LIMITS.clientName, "Enter your client's name.");
  if (n) e.clientName = n;
  const phone = normalizePhone(clientPhone);
  if (!phone) e.clientPhone = PHONE_MESSAGE;
  else if (phone === ownPhone) e.clientPhone = "That's your own number. Enter your client's number.";
  const j = checkName(jobTitle, LIMITS.jobTitle, 'Say what the job was.');
  if (j) e.jobTitle = j;
  return e;
}

export function validateReview({ rating, comment, displayName }) {
  const e = {};
  if (!rating) e.rating = 'Choose a rating from 1 to 5 stars.';
  if ((comment || '').length > LIMITS.comment) e.comment = `Keep your comment to ${LIMITS.comment} characters or fewer.`;
  if ((displayName || '').length > LIMITS.displayName) e.displayName = `Keep the name to ${LIMITS.displayName} characters or fewer.`;
  return e;
}
