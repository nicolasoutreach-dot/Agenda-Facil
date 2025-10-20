import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Clock,
  Network,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { layoutSchema, tokens } from '@design-system';

const {
  colors,
  typography: { font_family: fontFamily },
  shadows,
} = tokens;

const featureHighlights = [
  {
    title: 'Operação inteligente',
    description:
      'Automatize confirmações, reduza faltas e receba alertas sobre clientes em risco de churn.',
    Icon: Brain,
  },
  {
    title: 'Sua marca em primeiro lugar',
    description:
      'Página de agendamento com a sua identidade, domínio personalizado e zero anúncios de terceiros.',
    Icon: ShieldCheck,
  },
  {
    title: 'Agenda sem atritos',
    description:
      'Integração com WhatsApp, bloqueio de horários, políticas de antecedência e fila de espera inteligente.',
    Icon: Clock,
  },
  {
    title: 'Ecossistema conectado',
    description:
      'Pagamentos, contabilidade e marketing plugáveis para você crescer mantendo o controle dos dados.',
    Icon: Network,
  },
];

const testimonials = [
  {
    quote:
      '“Reduzi em 40% os no-shows e dobro a recorrência com as campanhas automáticas. O painel é um copiloto do meu negócio.”',
    name: 'Marina Duarte',
    role: 'Fundadora da GlowUp Studio',
  },
  {
    quote:
      '“A Agenda Fácil tirou o caos do meu dia a dia. Meus clientes adoram a praticidade e eu ganhei tempo para focar em estratégia.”',
    name: 'Lucas Azevedo',
    role: 'CEO da Barbearia Magnífico',
  },
  {
    quote:
      '“Finalmente tenho visibilidade sobre retenção e faturamento. As métricas em tempo real mudaram minhas decisões.”',
    name: 'Clara Ramos',
    role: 'Especialista em Sobrancelhas',
  },
];

const pricingTiers = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    cadence: 'para começar agora',
    features: [
      'Agenda online com 1 profissional',
      'Painel de confirmação pelo WhatsApp',
      'Link de agendamento com sua marca',
      'Suporte por e-mail em horário comercial',
    ],
    ctaLabel: 'Criar conta',
  },
  {
    name: 'Profissional',
    price: 'R$ 89',
    cadence: 'por mês',
    badge: 'Mais popular',
    features: [
      'Até 5 profissionais e agendas individuais',
      'Sequências automáticas de reativação',
      'Integração com maquininhas e PIX',
      'Relatórios de retenção e ticket médio',
    ],
    ctaLabel: 'Experimentar por 14 dias',
    featured: true,
  },
  {
    name: 'Studio+',
    price: 'R$ 149',
    cadence: 'por mês',
    features: [
      'Equipe ilimitada e gestão de múltiplas unidades',
      'Automação avançada com funis personalizados',
      'API e Webhooks para integrações externas',
      'Suporte prioritário com account manager',
    ],
    ctaLabel: 'Falar com vendas',
  },
];

const faqs = [
  {
    question: 'Preciso instalar algum aplicativo?',
    answer:
      'Não. A Agenda Fácil roda 100% na web, otimizada para desktop e mobile. Você e seus clientes acessam pelo navegador.',
  },
  {
    question: 'Posso migrar minha base atual?',
    answer:
      'Sim! Importamos clientes, serviços e histórico via planilhas ou integrações. Nossa equipe acompanha todo o processo.',
  },
  {
    question: 'Como funcionam os pagamentos?',
    answer:
      'Você escolhe: conectar seu gateway favorito ou usar nossa solução integrada com taxas competitivas e repasse automático.',
  },
  {
    question: 'E se eu quiser cancelar?',
    answer:
      'Sem fidelidade. Cancele a qualquer momento direto no painel. Seus dados ficam disponíveis para exportação.',
  },
];

const heroStats = [
  {
    label: 'Média de aumento na retenção',
    value: '+28%',
    Icon: TrendingUp,
  },
  {
    label: 'Profissionais ativos na plataforma',
    value: '3.200+',
    Icon: Users,
  },
  {
    label: 'Tempo médio para agendar',
    value: '17s',
    Icon: Sparkles,
  },
];

const partners = ['WhatsApp', 'RD Station', 'Pagar.me', 'Asaas', 'Conta Azul'];

const defaultRenderLink = (href, className, children) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);

const RevealOnScroll = ({ as: Component = 'div', className = '', children, delay = 0, style, ...rest }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const combinedClassName = [
    'transition-all duration-700 ease-out will-change-transform',
    isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inlineStyle = { ...(style ?? {}), transitionDelay: `${delay}ms` };

  return (
    <Component ref={ref} className={combinedClassName} style={inlineStyle} {...rest}>
      {children}
    </Component>
  );
};

const PartnersMarquee = () => (
  <div className="bg-gray-50 border-y border-gray-200">
    <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 uppercase tracking-[0.35em]">
      {partners.map((partner) => (
        <RevealOnScroll as="span" key={partner} delay={80} className="text-gray-500/80">
          {partner}
        </RevealOnScroll>
      ))}
    </div>
  </div>
);

const FeaturesSection = () => (
  <section id="features" className="bg-gray-50">
    <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-3xl font-bold text-gray-900">Domine a gestão do seu estúdio em uma única tela</h3>
        <p className="mt-4 text-lg text-gray-600">
          Funcionalidades que entregam resultados palpáveis desde o primeiro dia, pensadas para quem gera experiências
          memoráveis.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {featureHighlights.map(({ title, description, Icon }) => (
          <RevealOnScroll
            as="article"
            key={title}
            delay={120}
            className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 p-8 shadow-sm shadow-slate-800/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 opacity-0 transition group-hover:opacity-100" />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Icon className="h-5 w-5" />
            </div>
            <h4 className="mt-6 text-xl font-semibold text-gray-900">{title}</h4>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{description}</p>
          </RevealOnScroll>
        ))}
      </div>
    </div>
  </section>
);

const TestimonialsSection = () => (
  <section id="social-proof" className="bg-white">
    <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-center">
        <div className="space-y-4">
          <RevealOnScroll
            as="span"
            delay={80}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            4.9 de satisfação média
          </RevealOnScroll>
          <RevealOnScroll as="h3" delay={120} className="text-3xl font-bold text-gray-900">
            Profissionais que assumiram o volante da própria jornada
          </RevealOnScroll>
          <RevealOnScroll as="p" delay={180} className="text-lg text-gray-600">
            Histórias reais de estúdios e clínicas que escalaram operações sem perder a experiência personalizada.
          </RevealOnScroll>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {testimonials.map(({ name, role, quote }) => (
            <RevealOnScroll
              as="blockquote"
              key={name}
              delay={140}
              className="flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-gray-50/60 p-6 shadow-sm shadow-indigo-500/10"
              style={{ boxShadow: shadows.card }}
            >
              <p className="text-sm text-gray-700 leading-relaxed">{quote}</p>
              <footer className="mt-6">
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <p className="text-xs text-gray-500">{role}</p>
              </footer>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const DemoSection = ({ renderLink }) => (
  <section id="demo-video" className="bg-white">
    <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
      <div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">
          <Video className="h-4 w-4" />
          Veja na prática
        </span>
        <h3 className="mt-4 text-3xl font-bold text-gray-900">Seu copiloto para operar com excelência</h3>
        <p className="mt-4 text-lg text-gray-600 leading-relaxed">
          Assista ao tour guiado e entenda como simplificamos a rotina do profissional de beleza: da captação de
          clientes ao pós-atendimento automatizado.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          {renderLink(
            '/signup',
            'inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700',
            'Assistir ao tour interativo',
          )}
          {renderLink(
            '/login',
            'inline-flex items-center justify-center rounded-full border border-indigo-200 px-6 py-3 font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50',
            'Entrar e testar agora',
          )}
        </div>
      </div>
      <div className="relative aspect-video rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 p-[3px] shadow-2xl">
        <div className="h-full w-full rounded-[calc(theme(borderRadius.3xl)-3px)] bg-gray-950/95 p-8 flex flex-col justify-between text-indigo-50">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-200">Dashboard ao vivo</p>
            <h4 className="mt-3 text-2xl font-bold text-white">Agenda inteligente</h4>
            <p className="mt-2 text-sm text-indigo-100/80">
              Visualize ocupação, receba alertas automáticos e reorganize a equipe em segundos.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {heroStats.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-indigo-400/30 bg-indigo-400/20 px-3 py-4 backdrop-blur-sm"
              >
                <Icon className="mx-auto mb-2 h-5 w-5 text-indigo-100" />
                <p className="text-lg font-semibold text-white">{value}</p>
                <p className="text-xs text-indigo-100/80">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const PricingSection = ({ renderLink }) => (
  <section id="pricing" className="bg-gray-950 text-gray-50">
    <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-3xl font-bold text-white">Planos sob medida para cada estágio</h3>
        <p className="mt-4 text-lg text-gray-300">
          Escolha o plano que acompanha o ritmo do seu crescimento. Sem custos ocultos, com upgrade a qualquer momento.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {pricingTiers.map(({ name, price, cadence, features, ctaLabel, featured, badge }) => (
          <RevealOnScroll
            as="article"
            key={name}
            delay={160}
            className={`relative rounded-3xl border p-8 transition ${
              featured
                ? 'border-indigo-400 bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-xl shadow-indigo-600/30'
                : 'border-gray-800 bg-gray-900'
            }`}
          >
            {badge ? (
              <span className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                {badge}
              </span>
            ) : null}
            <h4 className="text-lg font-semibold uppercase tracking-[0.4em] text-gray-400">{name}</h4>
            <p className="mt-4 text-3xl font-bold">
              {price}
              <span className="ml-2 text-sm font-normal text-gray-400">{cadence}</span>
            </p>
            <ul className="mt-8 space-y-4 text-sm text-gray-300">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {renderLink(
                '/signup',
                featured
                  ? 'inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-indigo-600 shadow-lg shadow-black/20 transition hover:bg-gray-100'
                  : 'inline-flex w-full items-center justify-center rounded-full border border-gray-700 px-6 py-3 font-semibold text-white transition hover:border-gray-500 hover:bg-gray-800',
                ctaLabel,
              )}
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </div>
  </section>
);

const FAQSection = () => (
  <section id="faq" className="bg-gray-50">
    <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-3xl font-bold text-gray-900">Perguntas frequentes</h3>
        <p className="mt-4 text-lg text-gray-600">Transparência total para você tomar a melhor decisão.</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {faqs.map(({ question, answer }) => (
          <RevealOnScroll
            as="article"
            key={question}
            delay={180}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h4 className="text-lg font-semibold text-gray-900">{question}</h4>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{answer}</p>
          </RevealOnScroll>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTASection = ({ renderLink }) => (
  <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-sky-500 py-16 text-white">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
    <div className="relative mx-auto max-w-5xl px-6 text-center">
      <h3 className="text-3xl font-bold">Construa experiências memoráveis para seus clientes</h3>
      <p className="mt-4 text-lg text-indigo-100">
        Cadastre-se em minutos, convide sua equipe e descubra como a Agenda Fácil pode se tornar o eixo central do seu
        negócio.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        {renderLink(
          '/signup',
          'inline-flex items-center justify-center rounded-full bg-white px-8 py-3 font-semibold text-indigo-700 shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-50',
          'Começar agora mesmo',
        )}
        {renderLink(
          '/login',
          'inline-flex items-center justify-center rounded-full border border-white/60 px-8 py-3 font-semibold text-white transition hover:bg-white/10',
          'Entrar na minha conta',
        )}
      </div>
    </div>
  </section>
);

const Header = ({ renderLink, isReady }) => {
  const { header } = layoutSchema;
  const linkRenderer = renderLink ?? defaultRenderLink;

  return (
    <header
      className={`sticky top-0 z-30 border-b border-gray-200/60 bg-white/90 backdrop-blur-md transition-all duration-700 ease-out ${
        isReady ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'
      }`}
      style={{ fontFamily }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-semibold">
            AF
          </div>
          <span className="text-lg font-semibold text-gray-900">Agenda Fácil</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          {header.nav_links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-gray-900">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:inline-flex">
          {linkRenderer(
            header.cta_button.href,
            'inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-indigo-500/30 transition hover:bg-indigo-700',
            header.cta_button.label,
          )}
        </div>
        <div className="md:hidden">
          {linkRenderer(
            '/login',
            'inline-flex items-center justify-center rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600',
            'Menu',
          )}
        </div>
      </div>
    </header>
  );
};

export const LandingContent = ({ renderLink = defaultRenderLink }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  const AnimatedSection = ({ children, delay = 0 }) => (
    <div
      className={`transition-all duration-700 ease-out will-change-transform ${
        isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );

  const sectionMap = {
    hero: (
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50 to-sky-50">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <RevealOnScroll delay={50} className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-indigo-700">
                Beauty Tech
              </RevealOnScroll>
              <RevealOnScroll as="h1" delay={120} className="mt-6 text-4xl font-extrabold text-gray-900 md:text-5xl" style={{ fontFamily }}>
                O painel definitivo para profissionais que querem escalar com protagonismo.
              </RevealOnScroll>
              <RevealOnScroll as="p" delay={200} className="mt-6 text-lg text-gray-600">
                Centralize agendas, fidelize clientes e acompanhe resultados em tempo real. Agenda Fácil é o cockpit que faltava para o seu estúdio.
              </RevealOnScroll>
              <RevealOnScroll delay={260} className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:items-stretch">
                {renderLink(
                  '/signup',
                  'inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 sm:w-auto',
                  'Criar minha conta gratuita',
                )}
                {renderLink(
                  '#demo-video',
                  'inline-flex w-full items-center justify-center rounded-full border border-indigo-200 px-8 py-4 text-base font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto',
                  'Ver tour guiado',
                )}
              </RevealOnScroll>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {heroStats.map(({ label, value, Icon }) => (
                  <RevealOnScroll
                    key={label}
                    delay={320}
                    className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm shadow-indigo-500/10"
                  >
                    <Icon className="h-5 w-5 text-indigo-500" />
                    <p className="mt-4 text-2xl font-semibold text-gray-900">{value}</p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">{label}</p>
                  </RevealOnScroll>
                ))}
              </div>
            </div>
            <div className="relative">
              <RevealOnScroll
                delay={200}
                className="absolute inset-0 -translate-x-6 translate-y-6 rounded-3xl border border-indigo-200 opacity-50"
              />
              <RevealOnScroll
                delay={320}
                className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-indigo-500/10"
              >
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 text-sm font-semibold text-gray-500">
                  Agenda diária
                </div>
                <div className="space-y-4 p-6">
                  {['09:00 • Corte Premium', '11:30 • Brow Lamination', '14:15 • Terapia Capilar'].map((slot) => (
                    <RevealOnScroll
                      key={slot}
                      delay={360}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-gray-700">{slot}</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                        Confirmado
                      </span>
                    </RevealOnScroll>
                  ))}
                  <RevealOnScroll
                    delay={420}
                    className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500"
                  >
                    + Ver fila de espera e oportunidades de upsell
                  </RevealOnScroll>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </section>
    ),
    'social-proof': (
      <>
        <PartnersMarquee />
        <TestimonialsSection />
      </>
    ),
    features: <FeaturesSection />,
    'demo-video': <DemoSection renderLink={renderLink} />,
    pricing: <PricingSection renderLink={renderLink} />,
    faq: <FAQSection />,
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily }}>
      <Header renderLink={renderLink} isReady={isReady} />
      <main className="flex-1">
        {layoutSchema.sections.map((section, index) => (
          <AnimatedSection key={section.id} delay={index * 120}>
            {sectionMap[section.id] ?? null}
          </AnimatedSection>
        ))}
        <AnimatedSection delay={(layoutSchema.sections.length + 1) * 120}>
          <FinalCTASection renderLink={renderLink} />
        </AnimatedSection>
      </main>
      <footer className="bg-gray-900 py-12 text-center text-gray-400 text-sm">
        <p>
          © {new Date().getFullYear()} Agenda Fácil — tecnologia brasileira impulsionando profissionais de beleza
          independentes.
        </p>
        <p className="mt-2">
          Construído com tokens do nosso design system — cores primárias {colors.primary} e {colors.secondary}.
        </p>
      </footer>
    </div>
  );
};

const LandingPage = () => <LandingContent />;

export default LandingPage;
