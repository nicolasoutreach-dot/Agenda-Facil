import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/router';

import VerifyOtpPage from '../pages/auth/verify-otp';

vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}));

const mockedUseRouter = vi.mocked(useRouter);
const originalFetch = global.fetch;

describe('VerifyOtpPage', () => {
  beforeEach(() => {
    mockedUseRouter.mockReset();
    window.sessionStorage.clear();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error allow deleting fetch for tests when not defined
      delete global.fetch;
    }
    vi.useRealTimers();
  });

  test('submits OTP and redirects on success', async () => {
    const replaceMock = vi.fn(() => Promise.resolve(true));

    mockedUseRouter.mockReturnValue({
      replace: replaceMock,
      isReady: true,
    } as any);

    window.sessionStorage.setItem('agenda-facil:pending-auth-email', 'user@example.com');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nextRedirect: '/dashboard' }),
      statusText: 'OK',
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VerifyOtpPage />);

    await waitFor(() => expect(screen.getByText(/Enviamos instrucoes/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Codigo OTP/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar acesso/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/auth/verify-otp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'user@example.com', otp: '123456' }),
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByText(/Autenticacao concluida/)).toBeInTheDocument(),
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });

    expect(window.sessionStorage.getItem('agenda-facil:pending-auth-email')).toBeNull();
  });
});
