// frontend/dashboard.tsx
import React, { useEffect, useState } from "react";
import { tokens as systemTokens, layoutSchema } from "../design-system";
import type { LayoutSchema } from "../design-system";

type Notification = { id: number; cliente: string; tipo: string; status: string };
type Agendamento = { hora: string; cliente: string; servico: string; status: string };
type SectionId = "agenda" | "financeiro" | "clientes" | "estoque" | "inteligencia" | "configuracoes";
type ServiceSummary = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  bufferBefore: number;
  bufferAfter: number;
  isActive: boolean;
};
type BreakWindow = { start: string; end: string };
type WorkingHourSummary = {
  id: string;
  dayOfWeek: string;
  dayIndex?: number;
  startTime: string;
  endTime: string;
  breakWindows: BreakWindow[];
  timeZone: string | null;
};
type WorkingHourFormState = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  breakStart: string;
  breakEnd: string;
};
type BlockSummary = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  type: string;
};
type BlockFormState = {
  startsAt: string;
  endsAt: string;
  reason: string;
  type: string;
};
const agendamentos: Agendamento[] = [
  { hora: "09:00", cliente: "Maria Souza", servico: "Corte feminino", status: "Confirmado" },
  { hora: "10:00", cliente: "Pedro Lima", servico: "Barba completa", status: "Confirmado" },
  { hora: "11:00", cliente: "Disponvel", servico: "-", status: "Livre" },
  { hora: "12:00", cliente: "Disponvel", servico: "-", status: "Livre" },
  { hora: "13:00", cliente: "Ana Felix", servico: "Colorao", status: "Aguardando" },
];

const clientesCRM = Array.from(
  agendamentos
    .filter((a) => !a.cliente.startsWith("Dispon"))
    .reduce((acc, agendamento) => acc.set(agendamento.cliente, agendamento), new Map<string, Agendamento>())
    .values()
).map((a) => ({
  nome: a.cliente,
  servico: a.servico,
  status: a.status,
  horario: a.hora,
}));

const estoqueResumo = [
  { item: "Tintura premium", quantidade: 8, status: "OK" },
  { item: "Shampoo profissional", quantidade: 4, status: "Reposicao breve" },
  { item: "Luvas descartaveis", quantidade: 120, status: "OK" },
];

const integracoesDisponiveis = [
  { nome: "Google Calendar", status: "Conectado" },
  { nome: "WhatsApp Business API", status: "Em configuracao" },
  { nome: "Pagamentos PIX", status: "Conectado" },
];

const defaultServices: ServiceSummary[] = [
  {
    id: "service-sample-1",
    name: "Corte Premium",
    description: "Corte feminino completo com finalizacao profissional.",
    durationMinutes: 60,
    price: 150,
    currency: "BRL",
    bufferBefore: 10,
    bufferAfter: 10,
    isActive: true,
  },
  {
    id: "service-sample-2",
    name: "Coloracao Completa",
    description: "Coloracao com diagnostico, tonalizacao e tratamento.",
    durationMinutes: 120,
    price: 320,
    currency: "BRL",
    bufferBefore: 15,
    bufferAfter: 15,
    isActive: true,
  },
];

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terca-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sabado",
];
const BLOCK_TYPE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "lunch", label: "Almoco" },
  { value: "maintenance", label: "Manutencao" },
  { value: "holiday", label: "Folga/Feriado" },
  { value: "other", label: "Outro" },
];

const safeAlert = (message: string) => {
  if (typeof window !== "undefined") window.alert(message); // importante: no quebrar SSR
};

export default function Dashboard() {
  const layout = layoutSchema as LayoutSchema;

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, cliente: "Maria Souza", tipo: "Lembrete", status: "Pendente" },
    { id: 2, cliente: "Joo Lima", tipo: "Confirmao", status: "Entregue" },
    { id: 3, cliente: "Bruna Dias", tipo: "Cancelamento", status: "Erro" },
  ]);
  const [showRules, setShowRules] = useState(true);
  const [showFinance, setShowFinance] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("agenda");

  const { colors, spacing, typography, shadows } = systemTokens;
  const neutral = colors.neutral as Record<string, string>;
  const accent = colors.accent as Record<string, string>;
  const primary = (colors.primary as string) || "#2563eb";
  const primaryLight = (colors.primary_light as string) || "#3b82f6";
  const secondary = (colors.secondary as string) || "#1D4ED8";
  const neutral50 = neutral["50"] ?? "#f9fafb";
  const neutral100 = neutral["100"] ?? "#ffffff";
  const neutral200 = neutral["200"] ?? "#f3f4f6";
  const neutral800 = neutral["800"] ?? "#1f2937";
  const danger = accent?.danger ?? "#ef4444";
  const warning = accent?.warning ?? "#f97316";

  const [services, setServices] = useState<ServiceSummary[]>(defaultServices);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHourSummary[]>([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  const [workingHoursError, setWorkingHoursError] = useState<string | null>(null);
  const [newWorkingHour, setNewWorkingHour] = useState<WorkingHourFormState>({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "18:00",
    timeZone: "",
    breakStart: "",
    breakEnd: "",
  });
  const [editingWorkingHourId, setEditingWorkingHourId] = useState<string | null>(null);
  const [editingWorkingHour, setEditingWorkingHour] = useState<WorkingHourFormState | null>(null);
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [newBlock, setNewBlock] = useState<BlockFormState>({
    startsAt: "",
    endsAt: "",
    reason: "",
    type: "manual",
  });

  const getDayIndexFromKey = (key: string) => {
    const index = WEEKDAY_KEYS.indexOf(key as (typeof WEEKDAY_KEYS)[number]);
    return index >= 0 ? index : 0;
  };

  const getWorkingDayLabel = (entry: WorkingHourSummary) => {
    const index =
      typeof entry.dayIndex === "number" ? entry.dayIndex : getDayIndexFromKey(entry.dayOfWeek);
    return WEEKDAY_LABELS[index] ?? entry.dayOfWeek;
  };

  const isoToDisplay = (iso: string) => {
    if (!iso) return "-";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const buildBreakWindowsPayload = (form: { breakStart: string; breakEnd: string }) => {
    if (form.breakStart && form.breakEnd) {
      return [{ start: form.breakStart, end: form.breakEnd }];
    }
    return [];
  };

  const fetchServices = async (signal?: AbortSignal) => {
    if (signal?.aborted) {
      return;
    }
    setServicesLoading(true);
    try {
      const response = await fetch("/api/v1/services", {
        credentials: "include",
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setServicesError("Faca login para visualizar e editar seus servicos.");
        } else {
          setServicesError("Nao foi possivel carregar os servicos agora.");
        }
        return;
      }

      const body = await response.json();
      if (signal?.aborted) {
        return;
      }

      if (Array.isArray(body?.services)) {
        const normalized = body.services.map((service: any, index: number): ServiceSummary => ({
          id: service.id ?? `service-${index}`,
          name: service.name ?? "Servico sem nome",
          description: service.description ?? null,
          durationMinutes: Number(service.durationMinutes ?? 0),
          price:
            service.price === null || service.price === undefined
              ? null
              : Number(service.price),
          currency: service.currency ?? "BRL",
          bufferBefore: Number(service.bufferBefore ?? 0),
          bufferAfter: Number(service.bufferAfter ?? 0),
          isActive: service.isActive ?? true,
        }));
        setServices(normalized);
        setServicesError(null);
      }
    } catch (error) {
      if ((error as { name?: string } | undefined)?.name === "AbortError") {
        return;
      }
      setServicesError("Nao foi possivel carregar os servicos agora.");
    } finally {
      if (!signal?.aborted) {
        setServicesLoading(false);
      }
    }
  };

  const fetchWorkingHours = async (signal?: AbortSignal) => {
    if (signal?.aborted) {
      return;
    }
    setWorkingHoursLoading(true);
    try {
      const response = await fetch("/api/v1/scheduling/working-hours", {
        credentials: "include",
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setWorkingHoursError("Faca login para gerenciar os horarios.");
        } else {
          setWorkingHoursError("Nao foi possivel carregar os horarios.");
        }
        return;
      }

      const body = await response.json();
      if (signal?.aborted) {
        return;
      }

      const normalized: WorkingHourSummary[] = Array.isArray(body?.workingHours)
        ? body.workingHours
            .map((entry: any, index: number) => {
              const key =
                typeof entry.dayOfWeek === "string" ? entry.dayOfWeek : WEEKDAY_KEYS[0];
              const dayIndex =
                typeof entry.dayIndex === "number"
                  ? entry.dayIndex
                  : WEEKDAY_KEYS.indexOf(key as (typeof WEEKDAY_KEYS)[number]);
              const breaks = Array.isArray(entry.breakWindows)
                ? entry.breakWindows
                    .map((bw: any) => ({
                      start: typeof bw.start === "string" ? bw.start : "",
                      end: typeof bw.end === "string" ? bw.end : "",
                    }))
                    .filter((bw: BreakWindow) => bw.start && bw.end)
                : [];
              return {
                id: entry.id ?? `working-${index}`,
                dayOfWeek: key,
                dayIndex: dayIndex >= 0 ? dayIndex : undefined,
                startTime: typeof entry.startTime === "string" ? entry.startTime : "09:00",
                endTime: typeof entry.endTime === "string" ? entry.endTime : "18:00",
                breakWindows: breaks,
                timeZone: typeof entry.timeZone === "string" ? entry.timeZone : null,
              };
            })
            .sort((a, b) => {
              const dayA =
                typeof a.dayIndex === "number" ? a.dayIndex : getDayIndexFromKey(a.dayOfWeek);
              const dayB =
                typeof b.dayIndex === "number" ? b.dayIndex : getDayIndexFromKey(b.dayOfWeek);
              if (dayA !== dayB) {
                return dayA - dayB;
              }
              return a.startTime.localeCompare(b.startTime);
            })
        : [];
      setWorkingHours(normalized);
      setWorkingHoursError(null);
    } catch (error) {
      if ((error as { name?: string } | undefined)?.name === "AbortError") {
        return;
      }
      setWorkingHoursError("Nao foi possivel carregar os horarios.");
    } finally {
      if (!signal?.aborted) {
        setWorkingHoursLoading(false);
      }
    }
  };

  const fetchBlocks = async (signal?: AbortSignal) => {
    if (signal?.aborted) {
      return;
    }
    setBlocksLoading(true);
    try {
      const response = await fetch("/api/v1/scheduling/blocks", {
        credentials: "include",
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setBlocksError("Faca login para visualizar os bloqueios.");
        } else {
          setBlocksError("Nao foi possivel carregar os bloqueios.");
        }
        return;
      }

      const body = await response.json();
      if (signal?.aborted) {
        return;
      }

      const normalized: BlockSummary[] = Array.isArray(body?.blocks)
        ? body.blocks
            .map((block: any, index: number) => ({
              id: block.id ?? `block-${index}`,
              startsAt:
                typeof block.startsAt === "string"
                  ? block.startsAt
                  : block.startDateTime ?? "",
              endsAt:
                typeof block.endsAt === "string" ? block.endsAt : block.endDateTime ?? "",
              reason: block.reason ?? null,
              type: block.type ?? "manual",
            }))
            .sort(
              (a, b) =>
                new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime(),
            )
        : [];
      setBlocks(normalized);
      setBlocksError(null);
    } catch (error) {
      if ((error as { name?: string } | undefined)?.name === "AbortError") {
        return;
      }
      setBlocksError("Nao foi possivel carregar os bloqueios.");
    } finally {
      if (!signal?.aborted) {
        setBlocksLoading(false);
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const controller = new AbortController();
    fetchServices(controller.signal);
    fetchWorkingHours(controller.signal);
    fetchBlocks(controller.signal);
    return () => controller.abort();
  }, []);

  const handleCreateWorkingHour = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkingHoursError(null);

    const payload = {
      dayOfWeek: Number(newWorkingHour.dayOfWeek),
      startTime: newWorkingHour.startTime,
      endTime: newWorkingHour.endTime,
      timeZone: newWorkingHour.timeZone || undefined,
      breakWindows: buildBreakWindowsPayload(newWorkingHour),
    };

    try {
      const response = await fetch("/api/v1/scheduling/working-hours", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setWorkingHoursError("Faca login para gerenciar os horarios.");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setWorkingHoursError(body?.message ?? "Nao foi possivel cadastrar o horario.");
        return;
      }

      await fetchWorkingHours();
      setNewWorkingHour({
        dayOfWeek: newWorkingHour.dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        timeZone: newWorkingHour.timeZone,
        breakStart: "",
        breakEnd: "",
      });
    } catch (error) {
      setWorkingHoursError("Nao foi possivel cadastrar o horario.");
    }
  };

  const startEditingWorkingHour = (entry: WorkingHourSummary) => {
    const index =
      typeof entry.dayIndex === "number" ? entry.dayIndex : getDayIndexFromKey(entry.dayOfWeek);
    setEditingWorkingHourId(entry.id);
    setEditingWorkingHour({
      dayOfWeek: String(index),
      startTime: entry.startTime,
      endTime: entry.endTime,
      timeZone: entry.timeZone ?? "",
      breakStart: entry.breakWindows[0]?.start ?? "",
      breakEnd: entry.breakWindows[0]?.end ?? "",
    });
    setWorkingHoursError(null);
  };

  const cancelEditingWorkingHour = () => {
    setEditingWorkingHourId(null);
    setEditingWorkingHour(null);
  };

  const handleUpdateWorkingHour = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingWorkingHourId || !editingWorkingHour) {
      return;
    }

    setWorkingHoursError(null);

    const payload = {
      dayOfWeek: Number(editingWorkingHour.dayOfWeek),
      startTime: editingWorkingHour.startTime,
      endTime: editingWorkingHour.endTime,
      timeZone: editingWorkingHour.timeZone || undefined,
      breakWindows: buildBreakWindowsPayload(editingWorkingHour),
    };

    try {
      const response = await fetch(`/api/v1/scheduling/working-hours/${editingWorkingHourId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setWorkingHoursError("Faca login para gerenciar os horarios.");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setWorkingHoursError(body?.message ?? "Nao foi possivel atualizar o horario.");
        return;
      }

      await fetchWorkingHours();
      cancelEditingWorkingHour();
    } catch (error) {
      setWorkingHoursError("Nao foi possivel atualizar o horario.");
    }
  };

  const handleDeleteWorkingHour = async (id: string) => {
    setWorkingHoursError(null);
    try {
      const response = await fetch(`/api/v1/scheduling/working-hours/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        setWorkingHoursError("Faca login para gerenciar os horarios.");
        return;
      }

      if (response.status !== 204) {
        const body = await response.json().catch(() => null);
        setWorkingHoursError(body?.message ?? "Nao foi possivel remover o horario.");
        return;
      }

      await fetchWorkingHours();
      if (editingWorkingHourId === id) {
        cancelEditingWorkingHour();
      }
    } catch (error) {
      setWorkingHoursError("Nao foi possivel remover o horario.");
    }
  };

  const parseDateInput = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  };

  const handleCreateBlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBlocksError(null);

    const startDate = parseDateInput(newBlock.startsAt);
    const endDate = parseDateInput(newBlock.endsAt);

    if (!startDate || !endDate) {
      setBlocksError("Informe datas e horarios validos.");
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setBlocksError("A data final deve ser maior que a inicial.");
      return;
    }

    try {
      const response = await fetch("/api/v1/scheduling/blocks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
          reason: newBlock.reason.trim() || undefined,
          type: newBlock.type,
        }),
      });

      if (response.status === 401) {
        setBlocksError("Faca login para gerenciar os bloqueios.");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setBlocksError(body?.message ?? "Nao foi possivel cadastrar o bloqueio.");
        return;
      }

      await fetchBlocks();
      setNewBlock({
        startsAt: "",
        endsAt: "",
        reason: "",
        type: newBlock.type,
      });
    } catch (error) {
      setBlocksError("Nao foi possivel cadastrar o bloqueio.");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    setBlocksError(null);
    try {
      const response = await fetch(`/api/v1/scheduling/blocks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        setBlocksError("Faca login para gerenciar os bloqueios.");
        return;
      }

      if (response.status !== 204) {
        const body = await response.json().catch(() => null);
        setBlocksError(body?.message ?? "Nao foi possivel remover o bloqueio.");
        return;
      }

      await fetchBlocks();
    } catch (error) {
      setBlocksError("Nao foi possivel remover o bloqueio.");
    }
  };

  const formatCurrency = (value: number | null | undefined, currency = "BRL") => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "Sob consulta";
    }

    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
      }).format(value);
    } catch {
      const amount = Number(value);
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const formatDuration = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return "-";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}min`;
  };

  }, []);

  const copiarLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return safeAlert("No foi possvel copiar o link.");
    try {
    await navigator.clipboard.writeText("https://seu-estudio.app/painel");
      safeAlert("Link copiado!");
    } catch {
      safeAlert("No foi possvel copiar o link.");
    }
  };

  const limparNotificacoes = () => {
    setNotifications([]);
    safeAlert("Notificaes limpas!");
  };

  // Styles inspirados na LP (gradiente, rounded-3xl, glass, rounded-full)
  const S = {
    page: {
      fontFamily: typography.font_family,
      color: neutral800,
      minHeight: "100vh",
      background: `linear-gradient(120deg, ${neutral50}, ${neutral200})`,
    } as React.CSSProperties,
    container: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: `${spacing.lg} ${spacing.md}`,
    },
    navWrap: {
      position: "sticky" as const,
      top: 0,
      zIndex: 20,
      backdropFilter: "saturate(1.2) blur(8px)",
      background: "rgba(255,255,255,0.75)",
      borderBottom: `1px solid ${neutral200}`,
    },
    navbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      padding: `${spacing.sm} 0`,
    },
    navLeft: { display: "flex", alignItems: "center", gap: spacing.md },
    logo: { height: 32 },
    navMenu: {
      display: "flex",
      alignItems: "center",
      gap: spacing.sm,
      marginLeft: spacing.sm,
    },
    navMenuItem: {
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: 999,
      color: neutral800,
      textDecoration: "none",
      fontWeight: 600,
      transition: "background-color .15s ease, color .15s ease",
      cursor: "pointer",
    } as React.CSSProperties,
    navMenuItemActive: {
      background: "rgba(37,99,235,0.12)",
      color: primary,
    },
    sectionsViewport: {
      position: "relative",
      overflow: "hidden",
      marginTop: spacing.lg,
      minHeight: "60vh",
    },
    sectionsInner: {
      display: "grid",
      gridAutoFlow: "column",
      gridAutoColumns: "100%",
      transition: "transform 0.45s ease",
    },
    sectionSlide: {
      paddingBottom: spacing.lg,
      paddingTop: spacing.lg,
      overflow: "hidden",
    },
    sectionSlideInner: {
      display: "flex",
      flexDirection: "column",
      gap: spacing.lg,
    },
    hero: {
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      gap: spacing.lg,
      alignItems: "center",
      marginTop: spacing.lg,
    },
    heroBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: spacing.xs,
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: 999,
      border: `1px solid ${neutral200}`,
      background: neutral100,
      fontSize: "0.8rem",
    },
    h1: {
      fontSize: typography.h1.size,
      fontWeight: typography.h1.weight,
      lineHeight: typography.h1.line_height,
      margin: 0,
      color: neutral800,
    },
    subtitle: {
      fontSize: typography.body.size,
      lineHeight: typography.body.line_height,
      margin: 0,
      color: "#4b5563",
    },
    ctasRow: { display: "flex", flexWrap: "wrap" as const, gap: spacing.sm, marginTop: spacing.sm },
    btnPrimary: {
      border: "none",
      backgroundImage: `linear-gradient(90deg, ${primary}, ${primaryLight})`,
      color: "#fff",
      padding: `${spacing.sm} ${spacing.lg}`,
      borderRadius: 999,
      fontSize: typography.cta.size,
      fontWeight: typography.cta.weight,
      boxShadow: "0 10px 20px rgba(37,99,235,0.25)",
      transform: "translateZ(0)",
      transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
      cursor: "pointer",
    } as React.CSSProperties,
    btnSecondary: {
      border: `1px solid ${neutral200}`,
      background: neutral100,
      color: neutral800,
      padding: `${spacing.sm} ${spacing.lg}`,
      borderRadius: 999,
      fontSize: typography.cta.size,
      fontWeight: typography.cta.weight,
      boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
      transform: "translateZ(0)",
      transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
      cursor: "pointer",
    } as React.CSSProperties,
    btnGhost: {
      border: `1px solid ${primary}`,
      background: "transparent",
      color: primary,
      padding: `${spacing.sm} ${spacing.lg}`,
      borderRadius: 999,
      fontSize: typography.cta.size,
      fontWeight: typography.cta.weight,
      boxShadow: "0 6px 14px rgba(37,99,235,0.15)",
      transform: "translateZ(0)",
      transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
      cursor: "pointer",
    } as React.CSSProperties,
    heroCard: {
      background: "rgba(255,255,255,0.8)",
      border: `1px solid ${neutral200}`,
      borderRadius: 24, // rounded-3xl
      padding: spacing.lg,
      boxShadow: "0 12px 50px rgba(0,0,0,0.08)",
      backdropFilter: "blur(8px)",
    },
    gridIndicators: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    card: {
      background: "rgba(255,255,255,0.85)",
      border: `1px solid ${neutral200}`,
      borderRadius: 24,
      padding: spacing.md,
      boxShadow: "0 10px 36px rgba(0,0,0,0.08)",
      backdropFilter: "blur(6px)",
    } as React.CSSProperties,
    pill: {
      display: "inline-block",
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: 999,
      background: primaryLight,
      color: "#fff",
      fontSize: "0.85rem",
      marginTop: spacing.xs,
    },
    section: { marginTop: spacing.lg },
    sectionTitle: {
      fontSize: typography.h2.size,
      fontWeight: typography.h2.weight,
      lineHeight: typography.h2.line_height,
      marginBottom: spacing.sm,
    },
    agendaList: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: spacing.sm },
    agendaItem: {
      display: "flex",
      flexDirection: "column",
      border: `1px solid ${neutral200}`,
      borderRadius: 20,
      padding: spacing.md,
      background: "rgba(255,255,255,0.9)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.07)",
      backdropFilter: "blur(4px)",
    } satisfies React.CSSProperties,
    serviceList: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "grid",
      gap: spacing.sm,
    },
    serviceItem: {
      display: "flex",
      flexDirection: "column",
      gap: spacing.xs,
      border: `1px solid ${neutral200}`,
      borderRadius: 18,
      padding: spacing.md,
      background: "rgba(255,255,255,0.9)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      backdropFilter: "blur(4px)",
    } satisfies React.CSSProperties,
    inlineForm: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: spacing.xs,
    } as React.CSSProperties,
    inputControl: {
      flex: "1 1 120px",
      border: `1px solid ${neutral200}`,
      borderRadius: 999,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: "0.9rem",
      background: "#fff",
    } as React.CSSProperties,
    helperText: {
      fontSize: "0.85rem",
      color: "#6b7280",
    },
    btnSmallPrimary: {
      border: "none",
      backgroundImage: `linear-gradient(90deg, ${primary}, ${primaryLight})`,
      color: "#fff",
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: 999,
      fontSize: "0.9rem",
      fontWeight: typography.cta.weight,
      cursor: "pointer",
    } as React.CSSProperties,
    btnSmallSecondary: {
      border: `1px solid ${neutral200}`,
      background: neutral100,
      color: neutral800,
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: 999,
      fontSize: "0.9rem",
      fontWeight: typography.cta.weight,
      cursor: "pointer",
    } as React.CSSProperties,
    btnSmallDanger: {
      border: "none",
      background: danger,
      color: "#fff",
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: 999,
      fontSize: "0.9rem",
      fontWeight: typography.cta.weight,
      cursor: "pointer",
    } as React.CSSProperties,
    layoutTag: {
      display: "inline-flex",
      alignItems: "center",
      gap: spacing.xs,
      background: neutral100,
      border: `1px solid ${primary}`,
      borderRadius: 999,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: "0.85rem",
      color: primary,
    },
    footer: {
      borderTop: `1px solid ${neutral200}`,
      paddingTop: spacing.md,
      marginTop: spacing.lg,
      color: "#4b5563",
    },
  };
  const agendaContent = (
    <div className="section-slide-inner" style={S.sectionSlideInner}>
      <section className="hero-section" style={S.hero}>
        <div>
          <div style={S.heroBadge}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: accent.success }} />
            <span>Tempo medio de agendamento &lt; 60s</span>
          </div>
          <h1 style={{ ...S.h1, marginTop: spacing.sm }}>Seu Negocio, Sua Marca, Seu Sucesso.</h1>
          <p style={{ ...S.subtitle, marginTop: spacing.xs }}>Ola, Nicolas Oliveira. Bem-vindo ao painel interno.</p>
          <div className="hero-ctas" style={S.ctasRow}>
            <button type="button" onClick={copiarLink} className="btn" style={S.btnPrimary}>Copiar link</button>
            <button type="button" className="btn" style={S.btnSecondary}>Enviar WhatsApp</button>
            <button type="button" className="btn" style={S.btnGhost}>Editar perfil</button>
          </div>
          <div className="grid-indicators" style={S.gridIndicators}>
            {[
              { h: "Agendamentos Hoje", p: "12 (+2 vs ontem)", tag: "Saude da agenda" },
              { h: "Receita Estimada", p: "R$ 1.280", tag: "Meta bateu 78%" },
              { h: "Comparecimento", p: "92% (No-show 8%)", tag: "Dentro da meta" },
              { h: "Reagendamentos", p: "3 (Todos confirmados)", tag: "Zero perdas" },
            ].map((card) => (
              <div key={card.h} style={S.card}>
                <h4 style={{ margin: 0, fontSize: "1.05rem" }}>{card.h}</h4>
                <p style={{ ...S.subtitle, marginTop: spacing.xs }}>{card.p}</p>
                <span style={S.pill}>{card.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="hero-aside" style={S.heroCard}>
          <h3 style={{ marginTop: 0, marginBottom: spacing.sm }}>Painel em tempo real</h3>
          <p style={S.subtitle}>
            Bloqueie horrios arrastando ' Duplo clique para novo agendamento ' Regras de confirmao automtica.
          </p>
          <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.sm }}>
            <span style={S.layoutTag}>#agenda ' AgendaSection</span>
            <span style={S.layoutTag}>#analytics ' IndicatorsSection</span>
          </div>
        </aside>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Agenda do Dia</h2>
        <p style={{ ...S.subtitle, color: accent.success, marginBottom: spacing.sm }}>
          Clique e arraste para bloquear. Duplo clique para novo agendamento.
        </p>
        <ul style={S.agendaList}>
          {agendamentos.map((a) => (
            <li key={`${a.hora}-${a.cliente}`} style={S.agendaItem}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <strong>{a.hora}</strong>
                <span>' {a.cliente}</span>
              </div>
              <span>{a.servico}</span>
              <span style={{ color: a.status === "Confirmado" ? accent.success : primary }}>
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section style={S.section}>
        <h2 style={{ ...S.sectionTitle, cursor: "pointer" }} onClick={() => setShowRules((v) => !v)}>
          Regras de Confirmao Automtica {showRules ? "(ocultar)" : "(ver)"}
        </h2>
        {showRules && (
          <div style={S.card}>
            <ul style={{ margin: 0, paddingLeft: spacing.md }}>
              <li>Servios rpidos aprovados automaticamente (at 30 min).</li>
              <li>Clientes recorrentes confirmados (3+ visitas no trimestre).</li>
              <li>Reagendamentos em menos de 24h recebem aprovao automtica.</li>
            </ul>
          </div>
        )}
      </section>

      <section style={S.section}>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          <h2 style={S.sectionTitle}>WhatsApp e Notificaes</h2>
          <button type="button" onClick={limparNotificacoes} className="btn" style={S.btnPrimary}>
            Limpar notificaes
          </button>
        </div>
        <div style={{ ...S.card, marginTop: spacing.sm }}>
          <ul style={{ margin: 0, paddingLeft: spacing.md }}>
            {notifications.map((n) => (
              <li key={n.id}>
                <strong>{n.cliente}</strong> '?? {n.tipo} ({n.status})
              </li>
            ))}
            {notifications.length === 0 && <p>Nenhuma notificao.</p>}
          </ul>
        </div>
      </section>
    </div>
  );

  const financeContent = (
    <div className="section-slide-inner" style={S.sectionSlideInner}>
      <section style={S.section}>
        <h2 style={{ ...S.sectionTitle, cursor: "pointer" }} onClick={() => setShowFinance((v) => !v)}>
          Resumo Financeiro {showFinance ? "(ocultar)" : "(ver)"}
        </h2>
        {showFinance && (
          <div style={S.card}>
            <p><strong>Receita do Dia:</strong> R$ 1.280</p>
            <p><strong>Receita da Semana:</strong> R$ 6.480</p>
            <p><strong>Agendamentos:</strong> 9 pagos ' 3 pendentes</p>
            <p><strong>Saldo estimado:</strong> R$ 980</p>
            <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.sm }}>
              <button type="button" className="btn" style={S.btnPrimary}>Exportar CSV</button>
              <button type="button" className="btn" style={S.btnGhost}>Visualizar relatrio</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  const clientesContent = (
    <div className="section-slide-inner" style={S.sectionSlideInner}>
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Clientes (CRM)</h2>
        <div style={S.card}>
          <ul style={{ margin: 0, paddingLeft: spacing.md }}>
            {clientesCRM.map((cliente) => (
              <li key={cliente.nome}>
                <strong>{cliente.nome}</strong> - {cliente.servico} as {cliente.horario} ({cliente.status})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );

  const estoqueContent = (
    <div className="section-slide-inner" style={S.sectionSlideInner}>
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Estoque</h2>
        <div style={S.card}>
          <ul style={{ margin: 0, paddingLeft: spacing.md }}>
            {estoqueResumo.map((item) => (
              <li key={item.item}>
                <strong>{item.item}</strong> - {item.quantidade} unidades ({item.status})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );

  const inteligenciaContent = (
    <div className="section-slide-inner" style={S.sectionSlideInner}>
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Inteligncia Acionvel (em breve)</h2>
        <div style={S.card}>
          <p>Clientes inativos:</p>
          <ul>
            <li>Eduardo Ramos '?? 64 dias sem visitar ' Ticket mdio R$140</li>
            <li>Paula Vieira '?? 52 dias sem visitar ' Ticket mdio R$220</li>
          </ul>
          <p>Horrios com baixa demanda:</p>
          <ul>
            <li>Amanh 11:00'?o13:00 ' Sugesto: escova + hidratao (15% off)</li>
            <li>Sexta 16:00'?o18:00 ' Sugesto: combo premium</li>
          </ul>
        </div>
      </section>
    </div>
  );

  const ScheduleConfiguration = () => (
    <div className="section-slide-inner" style={S.sectionSlideInner}>
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Configuraes</h2>
        <p style={S.subtitle}>
          Gerenciamento de servios, horarios semanais e bloqueios em breve.
        </p>
      </section>
    </div>
  );

  const sections: Array<{ id: SectionId; label: string; content: React.ReactNode }> = [
    { id: "agenda", label: "Agenda", content: agendaContent },
    { id: "financeiro", label: "Financeiro", content: financeContent },
    { id: "clientes", label: "Clientes (CRM)", content: clientesContent },
    { id: "estoque", label: "Estoque", content: estoqueContent },
    { id: "inteligencia", label: "Inteligencia Acionavel", content: inteligenciaContent },
    { id: "configuracoes", label: "Configuracoes / Integracoes", content: <ScheduleConfiguration /> },
  ];

  const menuItems = sections.map(({ id, label }) => ({ id, label }));
  const effectiveActiveSection = sections.some((section) => section.id === activeSection)
    ? activeSection
    : sections[0]?.id ?? "agenda";
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === effectiveActiveSection)
  );

  // Pequenas interaes visuais (focus/hover) apenas em runtime
  const hoverify = (style: React.CSSProperties) => ({
    ...style,
    // dica: libs como clsx + Tailwind fariam isso melhor; aqui mantemos inline pelos tokens
  });

  return (
    <div style={S.page}>
      {/* CSS global-local para efeitos de hover/focus sem Tailwind */}
      <style>{`
        .btn:hover { transform: translateY(-1px); filter: brightness(1.02); }
        .btn:active { transform: translateY(0); filter: brightness(0.98); }
        .link:hover { opacity: .9; }
        .nav-menu-item:hover { background: rgba(37,99,235,0.12); color: ${primary}; }
        .nav-menu { display: flex; gap: ${spacing.sm}; align-items: center; }
        .grid-indicators { display: grid; grid-template-columns: ${S.gridIndicators.gridTemplateColumns}; gap: ${spacing.md}; }
        .sections-inner { width: 100%; }
        .section-slide-inner { display: flex; flex-direction: column; gap: ${spacing.lg}; }
        @media (max-width: 900px) {
          .page-main { padding: ${spacing.md} ${spacing.sm}; }
          .nav-menu { margin-left: 0; overflow-x: auto; gap: ${spacing.xs}; }
          .nav-menu::-webkit-scrollbar { height: 6px; }
          .nav-menu::-webkit-scrollbar-thumb { background: rgba(31, 41, 55, 0.2); border-radius: 999px; }
          .nav-menu-item { white-space: nowrap; font-size: 0.85rem; padding: ${spacing.xs} ${spacing.xs}; }
          .hero-section { grid-template-columns: 1fr !important; gap: ${spacing.md}; }
          .hero-aside { margin-top: ${spacing.md}; }
          .hero-ctas { flex-direction: column; align-items: stretch; gap: ${spacing.xs}; }
          .hero-ctas .btn { width: 100%; }
          .grid-indicators { grid-template-columns: 1fr; }
          .sections-viewport { min-height: auto; }
          .section-slide { padding-top: ${spacing.md}; padding-bottom: ${spacing.md}; }
          .section-slide-inner { gap: ${spacing.md}; }
        }
      `}</style>

      <div style={S.navWrap}>
        <div style={{ ...S.container, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
          <nav style={S.navbar} aria-label="Principal">
            <div style={S.navLeft}>
              {/* Logo da LP */}
              <img src={layout.header.logo} alt="Logotipo" style={S.logo} />
              <div className="nav-menu" style={S.navMenu}>
                {menuItems.map((item) => {
                  const isActive = item.id === effectiveActiveSection;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="nav-menu-item"
                      aria-current={isActive ? "page" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveSection(item.id);
                      }}
                      style={{ ...S.navMenuItem, ...(isActive ? S.navMenuItemActive : undefined) }}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>

      <main className="page-main" style={S.container}>
        <div className="sections-viewport" style={S.sectionsViewport}>
          <div
            className="sections-inner"
            style={{
              ...S.sectionsInner,
              transform: `translateX(-${activeIndex * 100}%)`,
            }}
          >
            {sections.map(({ id, content }) => (
              <section className="section-slide" key={id} id={id} style={S.sectionSlide}>
                {content}
              </section>
            ))}
          </div>
        </div>

        <footer style={S.footer}>
          <p style={S.subtitle}>Tempo medio de agendamento: &lt; 60s ' SLO: 99.9% ' Web Vitals: Good</p>
        </footer>
      </main>
    </div>
  );
}
