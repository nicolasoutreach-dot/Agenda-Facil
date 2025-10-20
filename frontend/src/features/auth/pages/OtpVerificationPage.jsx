import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { requestOtp, verifyOtp } from '../authAPI.js';
import { normalizeAuthErrorMessage, resolveSafeRedirectPath } from '../utils.js';
import {
  clearPendingAuthEmail,
  readPendingAuthEmail,
  savePendingAuthEmail,
} from '../pendingAuthStorage.js';

const OtpVerificationPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const initialEmail = useMemo(() => readPendingAuthEmail(), []);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [wasLastDeliverySuccessful, setWasLastDeliverySuccessful] = useState(false);
  const [isInitializing, setIsInitializing] = useState(!initialEmail);

  useEffect(() => {
    if (email) {
      setIsInitializing(false);
      return;
    }

    const stored = readPendingAuthEmail();

    if (stored) {
      setEmail(stored);
      setIsInitializing(false);
      return;
    }

    navigate('/auth', { replace: true });
  }, [email, navigate]);

  const displayEmail = useMemo(() => (email ?? '').trim().toLowerCase(), [email]);

  const handleVerify = async (event) => {
    event.preventDefault();
    const sanitizedOtp = otp.trim();

    if (!sanitizedOtp) {
      setErrorMessage('Informe o codigo recebido por e-mail.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('Validando o codigo informado...');
    setIsVerifying(true);

    try {
      const response = await verifyOtp({ email: displayEmail, otp: sanitizedOtp });
      await login(null, { session: response });

      clearPendingAuthEmail();

      setInfoMessage('Autenticacao concluida. Redirecionando para o seu painel...');

      const nextPath = resolveSafeRedirectPath(response?.nextRedirect);
      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 400);
    } catch (error) {
      setInfoMessage('');
      setErrorMessage(
        normalizeAuthErrorMessage(
          error,
          'Codigo invalido ou expirado. Solicite um novo acesso.',
        ),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!displayEmail || isResending) {
      return;
    }

    setErrorMessage('');
    setInfoMessage('Reenviando acesso...');
    setIsResending(true);

    try {
      const response = await requestOtp({ email: displayEmail });
      savePendingAuthEmail(displayEmail);
      setWasLastDeliverySuccessful(Boolean(response?.delivered));
      setInfoMessage(
        response?.delivered
          ? 'Enviamos um novo codigo. Verifique seu e-mail em instantes.'
          : 'Se o e-mail estiver cadastrado, o codigo chegara em instantes.',
      );
    } catch (error) {
      setInfoMessage('');
      setErrorMessage(
        normalizeAuthErrorMessage(
          error,
          'Nao foi possivel reenviar o acesso. Tente novamente em instantes.',
        ),
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleUseAnotherEmail = () => {
    clearPendingAuthEmail();
    navigate('/auth', { replace: true });
  };

  if (isInitializing) {
    return null;
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">Verificar acesso</h1>
        <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm mb-6">
          <p>
            Enviamos instrucoes para <strong>{displayEmail}</strong>.
          </p>
          <p className="mt-1">
            Digite abaixo o codigo OTP recebido para concluir seu login. Este codigo expira em 5 minutos.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            Codigo OTP
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="Digite o codigo recebido"
              className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              autoComplete="one-time-code"
            />
          </label>

          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          {infoMessage && !errorMessage && <p className="text-sm text-blue-600">{infoMessage}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            disabled={isVerifying}
          >
            {isVerifying ? 'Verificando...' : 'Confirmar acesso'}
          </button>
        </form>

        <div className="flex flex-col gap-3 text-sm text-center mt-6">
          <button
            type="button"
            onClick={handleResend}
            className="text-blue-600 font-semibold hover:underline disabled:text-blue-300"
            disabled={isResending}
          >
            {isResending ? 'Reenviando...' : 'Reenviar codigo'}
          </button>
          <button type="button" onClick={handleUseAnotherEmail} className="text-gray-500 hover:underline">
            Usar outro e-mail
          </button>
          {!wasLastDeliverySuccessful && (
            <span className="text-xs text-gray-500">
              Caso nao encontre o e-mail, verifique a caixa de spam.
            </span>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600 space-y-2">
          <p>
            <Link to="/" className="text-gray-500 hover:underline">
              Voltar para o site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;
