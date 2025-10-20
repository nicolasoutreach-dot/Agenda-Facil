import type { AppProps } from 'next/app';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

import '../src/index.css';

function App({ Component, pageProps }: AppProps<{ session: Session | null }>) {
  const { session, ...rest } = pageProps;

  return (
    <SessionProvider session={session}>
      <Component {...rest} />
    </SessionProvider>
  );
}

export default App;
