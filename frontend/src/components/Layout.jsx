import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, Pencil, Search, Send, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { isMock } from '../api/index.js';
import { Stamp } from './Stamp.jsx';
import { useToast } from './Toast.jsx';
import { useTheme } from '../lib/useTheme.js';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Logo() {
  return (
    <Link to="/" className="logo">
      <Stamp size={30} label="" />
      <span className="logo-text">LocalGig Verify</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Lightbulb size={20} aria-hidden="true" />
    </button>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>Every review on LocalGig Verify is confirmed by the client through a one-time link.</p>
      {isMock && (
        <p>
          <Link to="/demo" className="text-link">
            Demo tools
          </Link>
        </p>
      )}
    </footer>
  );
}

function RouteStage() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="route-stage"
        initial={reduceMotion ? false : { opacity: 0, y: 16, rotateX: -4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -10, rotateX: 3 }}
        transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1100, transformOrigin: '50% 0%' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

/** The usual frame: top bar, page, and a bottom tab bar on phones for logged-in freelancers. */
export function AppLayout() {
  const { pathname } = useLocation();
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  function handleLogout() {
    logout();
    navigate('/');
    toast.show("You're logged out");
  }

  return (
    <div className={['app', isAuthed && 'authed-app', ['/login', '/signup'].includes(pathname) && 'auth-app'].filter(Boolean).join(' ')}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {['/login', '/signup'].includes(pathname) && <ThemeToggle />}
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <nav className="topnav" aria-label="Main">
            {isAuthed ? (
              <>
                <NavLink to="/" end className="wide-only">
                  Find freelancers
                </NavLink>
                <NavLink to="/me" end className="wide-only">
                  My page
                </NavLink>
                <NavLink to="/me/request" className="wide-only">
                  Request a review
                </NavLink>
                <NavLink to="/me/profile" className="wide-only">
                  Edit profile
                </NavLink>
                <button type="button" className="linkbtn" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/" end className="wide-only">
                  Find freelancers
                </NavLink>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/signup" className="btn btn-primary btn-small">
                  <span className="wide-only-inline">Create profile</span>
                  <span className="narrow-only-inline">Sign up</span>
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <RouteStage />
      </main>
      <Footer />

      {isAuthed && (
        <nav className="bottomnav" aria-label="Main">
          <NavLink to="/" end>
            <Search size={20} aria-hidden="true" />
            <span>Find</span>
          </NavLink>
          <NavLink to="/me" end>
            <UserRound size={20} aria-hidden="true" />
            <span>My page</span>
          </NavLink>
          <NavLink to="/me/request">
            <Send size={20} aria-hidden="true" />
            <span>Request</span>
          </NavLink>
          <NavLink to="/me/profile">
            <Pencil size={20} aria-hidden="true" />
            <span>Profile</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}

/** For the page a client opens from an SMS: no menus, nothing to distract from the task. */
export function MinimalLayout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        <RouteStage />
      </main>
      <Footer />
    </div>
  );
}
