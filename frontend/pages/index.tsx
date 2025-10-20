import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LandingContent } from '@/features/pages/LandingPage';

const renderNextLink = (href: string, className: string, children: ReactNode) => (
  <Link href={href} className={className}>
    {children}
  </Link>
);

const IndexPage = () => (
  <>
    <Head>
      <title>Agenda Fácil | O painel definitivo para profissionais de beleza</title>
      <meta
        name="description"
        content="Construa sua relação com clientes, centralize agendamentos e expanda seu negócio com a Agenda Fácil."
      />
    </Head>

    <LandingContent renderLink={renderNextLink} />
  </>
);

export default IndexPage;
