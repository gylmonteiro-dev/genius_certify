import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminApp } from './AdminApp';
import { LoginView } from './components/LoginView';
import { RecoverPasswordView } from './components/RecoverPasswordView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { PublicEventRegisterPage } from './components/PublicEventRegisterPage';
import { PublicEventsPage } from './components/PublicEventsPage';
import { PublicHomeView } from './components/PublicHomeView';
import { PublicMyCertificatesView } from './components/PublicMyCertificatesView';
import { PublicValidateView } from './components/PublicValidateView';
import { ParticipanteInscricoesView } from './components/ParticipanteInscricoesView';
import { ParticipanteLoginView } from './components/ParticipanteLoginView';
import { ParticipanteRegisterView } from './components/ParticipanteRegisterView';
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
import {
  ContaParticipante,
  clearStoredParticipanteToken,
  fetchContaParticipante,
  getStoredParticipanteToken,
  participanteCadastrar,
  participanteLogin,
  setStoredParticipanteToken,
} from './lib/participanteAuth';
import { APP_NAME } from './lib/brand';
import { useT } from './i18n';

export function App() {
  const { t } = useT();
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [participante, setParticipante] = useState<ContaParticipante | null>(null);
  const [participanteToken, setParticipanteToken] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [participanteAuthLoading, setParticipanteAuthLoading] = useState(false);
  const [participanteAuthError, setParticipanteAuthError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const token = getStoredToken();
      const contaToken = getStoredParticipanteToken();
      if (!token && !contaToken) {
        if (!cancelled) setAuthBootstrapping(false);
        return;
      }

      const tasks: Promise<void>[] = [];
      if (token) {
        tasks.push(
          (async () => {
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
            }
          })(),
        );
      }
      if (contaToken) {
        tasks.push(
          (async () => {
            try {
              const conta = await fetchContaParticipante(contaToken);
              if (!cancelled) {
                setParticipanteToken(contaToken);
                setParticipante(conta);
              }
            } catch {
              clearStoredParticipanteToken();
              if (!cancelled) {
                setParticipanteToken(null);
                setParticipante(null);
              }
            }
          })(),
        );
      }

      await Promise.all(tasks);
      if (!cancelled) setAuthBootstrapping(false);
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

  const applyParticipanteSession = async (accessToken: string) => {
    const conta = await fetchContaParticipante(accessToken);
    setStoredParticipanteToken(accessToken);
    setParticipanteToken(accessToken);
    setParticipante(conta);
    setParticipanteAuthError(null);
  };

  const handleParticipanteLogin = async (documento: string, senha: string) => {
    setParticipanteAuthLoading(true);
    setParticipanteAuthError(null);
    try {
      const { access_token } = await participanteLogin(documento, senha);
      await applyParticipanteSession(access_token);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('participant.fallbackError');
      setParticipanteAuthError(message);
    } finally {
      setParticipanteAuthLoading(false);
    }
  };

  const handleParticipanteCadastrar = async (payload: {
    documento: string;
    data_nascimento: string;
    email: string;
    senha: string;
  }) => {
    setParticipanteAuthLoading(true);
    setParticipanteAuthError(null);
    try {
      const { access_token } = await participanteCadastrar(payload);
      await applyParticipanteSession(access_token);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('participant.registerFallbackError');
      setParticipanteAuthError(message);
    } finally {
      setParticipanteAuthLoading(false);
    }
  };

  const handleParticipanteLogout = () => {
    clearStoredParticipanteToken();
    setParticipanteToken(null);
    setParticipante(null);
    setParticipanteAuthError(null);
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
  const isParticipanteAuthenticated = Boolean(participante && participanteToken);

  return (
    <>
      <Routes>
        <Route path="/" element={<PublicHomeView />} />
        <Route
          path="/entrar"
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
        <Route path="/entrar/recuperar" element={<RecoverPasswordView />} />
        <Route path="/entrar/redefinir" element={<ResetPasswordView />} />
        <Route path="/validar" element={<PublicValidateView />} />
        <Route path="/validar/:codigo" element={<PublicValidateView />} />
        <Route path="/meus-certificados" element={<PublicMyCertificatesView />} />
        <Route
          path="/minhas-inscricoes/entrar"
          element={
            isParticipanteAuthenticated ? (
              <Navigate to="/minhas-inscricoes" replace />
            ) : (
              <ParticipanteLoginView
                onSubmit={handleParticipanteLogin}
                isSubmitting={participanteAuthLoading}
                errorMessage={participanteAuthError}
              />
            )
          }
        />
        <Route
          path="/minhas-inscricoes/cadastrar"
          element={
            isParticipanteAuthenticated ? (
              <Navigate to="/minhas-inscricoes" replace />
            ) : (
              <ParticipanteRegisterView
                onSubmit={handleParticipanteCadastrar}
                isSubmitting={participanteAuthLoading}
                errorMessage={participanteAuthError}
              />
            )
          }
        />
        <Route
          path="/minhas-inscricoes"
          element={
            isParticipanteAuthenticated && participante && participanteToken ? (
              <ParticipanteInscricoesView
                conta={participante}
                token={participanteToken}
                onLogout={handleParticipanteLogout}
              />
            ) : (
              <Navigate to="/minhas-inscricoes/entrar" replace />
            )
          }
        />
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
              <Navigate to="/entrar" replace />
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
