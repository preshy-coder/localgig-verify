import { useId } from 'react';

// The verified seal: the one memorable shape in the app. It only appears where a person
// or a review really has been confirmed by a client (or, greyed out, where none have yet).

function scallopPath(cx, cy, r, bumps = 16, depth = 0.045, steps = 180) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const radius = r * (1 + depth * Math.cos(bumps * t));
    const x = cx + radius * Math.cos(t);
    const y = cy + radius * Math.sin(t);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + 'Z';
}

const BODY = scallopPath(50, 50, 46);

export function Stamp({ size = 48, muted = false, thump = false, ring = false, onInk = false, label = 'Verified by clients', className = '' }) {
  const pathId = 'ring' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const classes = ['stamp', muted && 'stamp-muted', thump && 'stamp-thump', onInk && 'stamp-on-ink', className].filter(Boolean).join(' ');
  // With an empty label the stamp is decoration only and is hidden from screen readers.
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} {...a11y} className={classes}>
      <path d={BODY} className="stamp-body" />
      <circle cx="50" cy="50" r="38" className="stamp-ring" />
      {ring && (
        <>
          <defs>
            <path id={pathId} d="M50 50 m-31 0 a31 31 0 1 1 62 0 a31 31 0 1 1 -62 0" />
          </defs>
          <text className="stamp-text">
            <textPath href={`#${pathId}`} textLength="188" lengthAdjust="spacing">
              Verified by past clients. Verified by past clients.
            </textPath>
          </text>
        </>
      )}
      <path d="M34 51l11 11 22-25" className="stamp-check" />
    </svg>
  );
}
