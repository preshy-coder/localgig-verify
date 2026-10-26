import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api/index.js';
import { clearSession, readSession, setUnauthenticatedHandler, writeSession } from '../api/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [sessionEnded, setSessionEnded] = useState(false);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // If the server says our token is no longer good, log out and tell the person why.
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      clearSession();
      setSession(null);
      setSessionEnded(true);
    });
    return () => setUnauthenticatedHandler(null);
  }, []);

  const finish = useCallback((result) => {
    const next = { token: result.token, user: result.user };
    writeSession(next);
    setSession(next);
    setSessionEnded(false);
  }, []);

  const signup = useCallback(async (body) => finish(await api.signUp(body)), [finish]);
  const login = useCallback(async (body) => finish(await api.logIn(body)), [finish]);

  const value = useMemo(
    () => ({ user: session?.user || null, isAuthed: Boolean(session?.token), sessionEnded, signup, login, logout }),
    [session, sessionEnded, signup, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Screens inside this wrapper need a logged-in freelancer. Others are sent to log in first. */
export function RequireAuth() {
  const { isAuthed } = useAuth();
  const location = useLocation();
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/**
 * Log in and sign up screens. As soon as someone is logged in (including right after they
 * submit the form), they are sent on: back to where they were headed, or to `to`.
 */
export function GuestOnly({ children, to = '/me', state }) {
  const { isAuthed } = useAuth();
  const location = useLocation();
  if (isAuthed) {
    const from = location.state?.from;
    return <Navigate to={from || to} replace state={from ? undefined : state} />;
  }
  return children;
}
