import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { verifyOtp } from '../authAPI.js';
import { normalizeAuthErrorMessage, resolveSafeRedirectPath } from '../utils.js';

const MagicLinkPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = searchParams.get('token');

  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Validando link de acesso...' : '');
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'Link inválido. Solicite um novo acesso.',
  );

  useEffect(() => {
    let isCancelled = false;

    const authenticate = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await verifyOtp({ token });

        if (isCancelled) {
          return;
        }

        await login(null, { session: response });
        setStatus('success');
        setMessage('Tudo certo! Redirecionando para o seu painel...');

        const nextPath = resolveSafeRedirectPath(response?.nextRedirect);
        setTimeout(() => {
          if (!isCancelled) {
            navigate(nextPath, { replace: true });
          }
        }, 500);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStatus('error');
        setMessage('');
        setErrorMessage(
          normalizeAuthErrorMessage(
            error,
            'Link inválido ou expirado. Solicite um novo link e tente novamente.',
          ),
        );
      }
    };

    authenticate();

    return () => {
      isCancelled = true;
    };
  }, [login, navigate, token]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Confirmando seu acesso</h1>
        {message && <p className="text-gray-600">{message}</p>}

        {status === 'loading' && (
          <div className="flex justify-center pt-2">
            <span className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <p className="text-red-500 text-sm">{errorMessage}</p>
            <div className="space-y-2">
              <Link
                to="/auth"
                className="inline-flex justify-center w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Voltar para o login
              </Link>
              <Link to="/" className="block text-sm text-gray-500 hover:underline">
                Ir para a página inicial
              </Link>
            </div>
          </div>
        )}

        {status === 'success' && (
          <p className="text-sm text-blue-600">
            Caso não seja redirecionado automaticamente,{' '}
            <button
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
              className="text-blue-700 hover:underline font-semibold"
            >
              clique aqui para acessar o painel.
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default MagicLinkPage;
