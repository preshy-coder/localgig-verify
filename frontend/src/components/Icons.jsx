// Simple line icons. They inherit the text colour and are hidden from screen readers
// (the words next to them carry the meaning).
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

const make = (children, extra = {}) =>
  function IconComponent(props) {
    return (
      <svg {...base} {...extra} {...props}>
        {children}
      </svg>
    );
  };

export const Icon = {
  Search: make(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  User: make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  Send: make(<><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>),
  Edit: make(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></>),
  Check: make(<path d="M4 12.5l5.5 5.5L20 6.5" />, { strokeWidth: 2.6 }),
  Plus: make(<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  Close: make(<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>),
  Trash: make(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></>),
  Pin: make(<><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  Copy: make(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>),
  Share: make(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.7l6.8-4.4" /><path d="M8.6 13.3l6.8 4.4" /></>),
  Chat: make(<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.2A8 8 0 1121 12z" />),
  Alert: make(<><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  Clock: make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  Refresh: make(<><path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v5h-5" /></>),
  Image: make(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 9" /></>),
  ArrowUp: make(<><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>),
  ArrowDown: make(<><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>),
  Eye: make(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  EyeOff: make(<><path d="M17.9 17.9A10 10 0 0112 19C5.6 19 2 12 2 12a18 18 0 014.1-5" /><path d="M9.9 5.2A9 9 0 0112 5c6.4 0 10 7 10 7a18 18 0 01-2.2 3.2" /><path d="M3 3l18 18" /></>),
  External: make(<><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></>),
  WifiOff: make(<><path d="M2 8.8a15 15 0 015-3" /><path d="M22 8.8a15 15 0 00-9.5-3.2" /><path d="M5 12.6a10 10 0 012.7-1.8" /><path d="M19 12.6a10 10 0 00-4.2-2.3" /><path d="M8.5 16.4a5 5 0 017 0" /><path d="M12 20h.01" /><path d="M3 3l18 18" /></>),
  Lock: make(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>),
  Star: make(<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" fill="currentColor" strokeWidth="1.2" />),
};
