import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminApp } from './AdminApp';
import { LoginView } from './components/LoginView';
import { PublicEventRegisterPage } from './components/PublicEventRegisterPage';
import { PublicEventsPage } from './components/PublicEventsPage';
import { PublicValidateView } from './components/PublicValidateView';
import { Toast } from './components/Toast';
import { ApiError } from './lib/api';
import {
  AuthUser,
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  loginRequest,
  setStoredToken,
} from './lib/auth';
import { APP_NAME } from './lib/brand';
import { useT } from './i18n';

export function App() {
  const { t } = useT();
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setAuthBootstrapping(false);
        return;
      }

      try {
        const user = await fetchCurrentUser(token);
        if (!cancelled) {
          setAuthToken(token);
          setAuthUser(user);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setAuthToken(null);
          setAuthUser(null);
        }
      } finally {
        if (!cancelled) setAuthBootstrapping(false);
      }
    };

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { access_token } = await loginRequest(email, password);
      const user = await fetchCurrentUser(access_token);
      setStoredToken(access_token);
      setAuthToken(access_token);
      setAuthUser(user);
      setToastMessage(t('login.welcome', { name: user.nome }));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('login.fallbackError');
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setAuthToken(null);
    setAuthUser(null);
    setLoginError(null);
  };

  if (authBootstrapping) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center text-slate-500 text-sm gap-2">
        <span className="material-symbols-outlined animate-spin text-blue-600">
          progress_activity
        </span>
        {t('login.loadingApp', { app: APP_NAME })}
      </div>
    );
  }

  const isAuthenticated = Boolean(authUser && authToken);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/app" replace />
            ) : (
              <LoginView
                onSubmit={handleLogin}
                isSubmitting={loginLoading}
                errorMessage={loginError}
              />
            )
          }
        />
        <Route path="/validar" element={<PublicValidateView />} />
        <Route path="/validar/:codigo" element={<PublicValidateView />} />
        <Route path="/eventos" element={<PublicEventsPage />} />
        <Route path="/eventos/:id" element={<PublicEventRegisterPage />} />
        <Route
          path="/app/*"
          element={
            isAuthenticated && authUser && authToken ? (
              <AdminApp
                authUser={authUser}
                authToken={authToken}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/app' : '/'} replace />} />
      </Routes>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
}

export default App;
