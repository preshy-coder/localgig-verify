function normalisePhone(input) {
  if (typeof input !== 'string') return null;
  let p = input.replace(/[\s-]/g, '');
  if (p.startsWith('+254')) p = p.slice(4);
  else if (p.startsWith('254')) p = p.slice(3);
  else if (p.startsWith('0')) p = p.slice(1);
  return /^[17]\d{8}$/.test(p) ? '+254' + p : null;
}

module.exports = { normalisePhone };