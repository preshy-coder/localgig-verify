import { useEffect } from 'react';

const BASE = 'LocalGig Verify';

/** Sets the browser tab title, e.g. "Wanjiku Mwangi | LocalGig Verify". */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [title]);
}
