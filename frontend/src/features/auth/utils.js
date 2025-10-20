const FRIENDLY_AUTH_MESSAGES = [
  {
    pattern: /invalid or expired otp code/i,
    message: 'Codigo expirado ou invalido. Solicite um novo acesso.',
  },
  {
    pattern: /invalid or expired magic link token/i,
    message: 'Link invalido ou expirado. Solicite um novo acesso.',
  },
  {
    pattern: /invalid or expired refresh token/i,
    message: 'Sessao expirada. Entre novamente.',
  },
  {
    pattern: /unauthorized/i,
    message: 'Sessao expirada. Entre novamente.',
  },
  {
    pattern: /email.*not.*found/i,
    message: 'Nao encontramos este e-mail. Verifique o endereco informado.',
  },
];

export const normalizeAuthErrorMessage = (error, fallbackMessage) => {
  if (!error) {
    return fallbackMessage;
  }

  const responseMessage = error?.response?.data?.message ?? '';
  const rawMessage = responseMessage || error?.message || '';

  const friendlyMatch = FRIENDLY_AUTH_MESSAGES.find(({ pattern }) => pattern.test(rawMessage));

  if (friendlyMatch) {
    return friendlyMatch.message;
  }

  if (responseMessage && !/internal server error/i.test(responseMessage)) {
    return responseMessage;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const resolveSafeRedirectPath = (target) => {
  if (typeof window === 'undefined') {
    return '/dashboard';
  }

  if (!target) {
    return '/dashboard';
  }

  try {
    const targetUrl = new URL(target, window.location.origin);
    const isSameOrigin = targetUrl.origin === window.location.origin;
    const relativePath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}` || '/dashboard';

    if (!isSameOrigin) {
      return '/dashboard';
    }

    if (relativePath.startsWith('/auth/magic-link')) {
      return '/dashboard';
    }

    return relativePath;
  } catch (error) {
    if (typeof target === 'string' && target.startsWith('/')) {
      return target;
    }
    return '/dashboard';
  }
};
