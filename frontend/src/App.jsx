import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { isMock } from './api/index.js';
import { AuthProvider, GuestOnly, RequireAuth } from './auth/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { AppLayout, MinimalLayout, ScrollToTop } from './components/Layout.jsx';
import Browse from './screens/Browse.jsx';
import SignUp from './screens/SignUp.jsx';
import LogIn from './screens/LogIn.jsx';
import PublicProfile from './screens/PublicProfile.jsx';
import Dashboard from './screens/Dashboard.jsx';
import EditProfile from './screens/EditProfile.jsx';
import RequestReview from './screens/RequestReview.jsx';
import ClientReview from './screens/ClientReview.jsx';
import Demo from './screens/Demo.jsx';
import NotFound from './screens/NotFound.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Browse />} />
              <Route path="f/:slug" element={<PublicProfile />} />
              <Route path="signup" element={<GuestOnly to="/me/profile" state={{ welcome: true }}><SignUp /></GuestOnly>} />
              <Route path="login" element={<GuestOnly><LogIn /></GuestOnly>} />
              <Route path="me" element={<RequireAuth />}>
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<EditProfile />} />
                <Route path="request" element={<RequestReview />} />
              </Route>
              {isMock && <Route path="demo" element={<Demo />} />}
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route element={<MinimalLayout />}>
              <Route path="r/:token" element={<ClientReview />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
