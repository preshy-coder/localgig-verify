import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async function when the component mounts (and whenever `deps` change).
 * Returns { status: 'loading' | 'ready' | 'error', data, error, reload, setData }.
 * Late answers from an older request are ignored.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    setState({ status: 'loading', data: null, error: null });
    fn().then(
      (data) => {
        if (id === latest.current) setState({ status: 'ready', data, error: null });
      },
      (error) => {
        if (id === latest.current) setState({ status: 'error', data: null, error });
      },
    );
    return () => {
      latest.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  return { ...state, reload, setData };
}
