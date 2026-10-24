const crypto = require('crypto');

function makeSlug(fullName) {
  const base = fullName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'freelancer';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

module.exports = { makeSlug };