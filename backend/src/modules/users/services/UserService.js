import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../../database/prisma.js';
import shouldUseInMemoryStore from '../../../utils/environment.js';

const inMemoryUsersByEmail = new Map();
const inMemoryUsersById = new Map();

const DEFAULT_POLITICA_CONFIRMACAO = 'manual';
const DEFAULT_ONBOARDING_INCOMPLETO = true;
const POLITICA_CONFIRMATION_VALUES = new Set(['manual', 'automatica']);
const MAX_NAME_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 6;
const MAX_BUSINESS_NAME_LENGTH = 128;
const MAX_SERVICE_NAME_LENGTH = 64;
const MAX_SERVICOS_ITEMS = 20;
const MIN_PHONE_LENGTH = 6;
const MAX_PHONE_LENGTH = 32;
const MAX_TIMEZONE_LENGTH = 64;
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  nomeDoNegocio: true,
  servicos: true,
  horarios: true,
  politicaConfirmacao: true,
  onboardingIncompleto: true,
  phone: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
};

const autoCreateUserSchema = z.object({
  name: z.string().trim().min(3).max(MAX_NAME_LENGTH),
  email: z.string().trim().toLowerCase().min(5).max(MAX_EMAIL_LENGTH).email(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  nomeDoNegocio: z
    .string()
    .trim()
    .min(3)
    .max(MAX_BUSINESS_NAME_LENGTH)
    .nullable(),
  servicos: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(MAX_SERVICE_NAME_LENGTH),
    )
    .max(MAX_SERVICOS_ITEMS),
  horarios: z.record(z.string().min(1), z.any()),
  politicaConfirmacao: z.enum(['manual', 'automatica']),
  onboardingIncompleto: z.boolean(),
  phone: z
    .union([
      z
        .string()
        .trim()
        .min(MIN_PHONE_LENGTH)
        .max(MAX_PHONE_LENGTH),
      z.null(),
      z.undefined(),
    ])
    .transform((value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return null;
    }),
  timezone: z
    .string()
    .trim()
    .min(3)
    .max(MAX_TIMEZONE_LENGTH)
    .optional()
    .transform((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      return DEFAULT_TIMEZONE;
    }),
});

function cloneJson(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function normalizeNomeDoNegocio(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeServicos(servicos) {
  if (!Array.isArray(servicos)) {
    return [];
  }

  const normalized = servicos
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  return Array.from(new Set(normalized));
}

function normalizePoliticaConfirmacao(value) {
  if (typeof value !== 'string') {
    return DEFAULT_POLITICA_CONFIRMACAO;
  }

  const normalized = value.trim().toLowerCase();
  return POLITICA_CONFIRMATION_VALUES.has(normalized)
    ? normalized
    : DEFAULT_POLITICA_CONFIRMACAO;
}

function normalizeOnboardingIncompleto(value) {
  return typeof value === 'boolean' ? value : DEFAULT_ONBOARDING_INCOMPLETO;
}

function normalizeHorariosInput(horarios) {
  if (!horarios || typeof horarios !== 'object') {
    return {};
  }

  return Object.entries(horarios).reduce((accumulator, [key, value]) => {
    if (!value || typeof value !== 'object') {
      return accumulator;
    }

    const inicio = typeof value.inicio === 'string' ? value.inicio.trim() : '';
    const fim = typeof value.fim === 'string' ? value.fim.trim() : '';

    if (!inicio || !fim) {
      return accumulator;
    }

    accumulator[key] = { inicio, fim };
    return accumulator;
  }, {});
}

function normalizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }

  const trimmed = phone.trim();
  if (trimmed.length < MIN_PHONE_LENGTH || trimmed.length > MAX_PHONE_LENGTH) {
    return null;
  }

  return trimmed;
}

function normalizeTimezone(timezone) {
  if (typeof timezone !== 'string') {
    return DEFAULT_TIMEZONE;
  }

  const trimmed = timezone.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TIMEZONE_LENGTH) {
    return DEFAULT_TIMEZONE;
  }

  return trimmed;
}

function assertUniquePhoneInMemory(phone, ignoreUserId = null) {
  if (!phone) {
    return;
  }

  const hasDuplicate = Array.from(inMemoryUsersById.values()).some(
    (user) => user.phone === phone && user.id !== ignoreUserId,
  );

  if (hasDuplicate) {
    const error = new Error('Phone already in use');
    error.code = 'USER_PHONE_ALREADY_EXISTS';
    throw error;
  }
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password: _password, ...rest } = user;

  return {
    ...rest,
    phone: rest.phone ?? null,
    timezone: rest.timezone ?? DEFAULT_TIMEZONE,
    nomeDoNegocio: normalizeNomeDoNegocio(rest.nomeDoNegocio),
    servicos: normalizeServicos(rest.servicos),
    horarios: cloneJson(rest.horarios, {}),
    politicaConfirmacao: normalizePoliticaConfirmacao(rest.politicaConfirmacao),
    onboardingIncompleto: normalizeOnboardingIncompleto(rest.onboardingIncompleto),
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function generateRandomPassword() {
  return crypto.randomBytes(32).toString('hex');
}

function inferNameFromEmail(email) {
  if (!email) {
    return 'Agenda Facil User';
  }

  const [localPart] = email.split('@');

  if (localPart && localPart.trim().length >= 3) {
    return localPart.trim();
  }

  return 'Agenda Facil User';
}

class UserService {
  async findAll() {
    if (shouldUseInMemoryStore()) {
      return Array.from(inMemoryUsersByEmail.values()).map(sanitizeUser);
    }

    const users = await prisma.user.findMany({
      select: USER_SAFE_SELECT,
    });

    return users.map(sanitizeUser);
  }

  async findByEmail(email) {
    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersByEmail.get(email);
      return user ? sanitizeUser(user) : null;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: USER_SAFE_SELECT,
    });

    return sanitizeUser(user);
  }

  async findById(userId) {
    if (!userId) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersById.get(userId);
      return user ? sanitizeUser(user) : null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SAFE_SELECT,
    });

    return sanitizeUser(user);
  }

  async validateCredentials(email, password) {
    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersByEmail.get(email);

      if (!user) {
        return null;
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      return passwordMatches ? sanitizeUser(user) : null;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return null;
    }

    return sanitizeUser(user);
  }

  async create({
    name,
    email,
    password,
    nomeDoNegocio,
    servicos,
    horarios,
    politicaConfirmacao,
    onboardingIncompleto,
    phone,
    timezone,
  }) {
    const normalizedNomeDoNegocio = normalizeNomeDoNegocio(nomeDoNegocio);
    const normalizedServicos = normalizeServicos(servicos);
    const normalizedHorarios = cloneJson(horarios, {});
    const normalizedPoliticaConfirmacao = normalizePoliticaConfirmacao(politicaConfirmacao);
    const normalizedOnboarding = normalizeOnboardingIncompleto(onboardingIncompleto);
    const normalizedPhone = normalizePhone(phone);
    const normalizedTimezone = normalizeTimezone(timezone);

    const validatedPayload = autoCreateUserSchema.parse({
      name,
      email,
      password,
      nomeDoNegocio: normalizedNomeDoNegocio,
      servicos: normalizedServicos,
      horarios: normalizedHorarios,
      politicaConfirmacao: normalizedPoliticaConfirmacao,
      onboardingIncompleto: normalizedOnboarding,
      phone: normalizedPhone,
      timezone: normalizedTimezone,
    });

    const {
      name: safeName,
      email: safeEmail,
      password: safePassword,
      nomeDoNegocio: safeNomeDoNegocio,
      servicos: safeServicos,
      horarios: safeHorarios,
      politicaConfirmacao: safePoliticaConfirmacao,
      onboardingIncompleto: safeOnboardingIncompleto,
      phone: safePhone,
      timezone: safeTimezone,
    } = validatedPayload;

    if (shouldUseInMemoryStore()) {
      if (inMemoryUsersByEmail.has(safeEmail)) {
        const error = new Error('User already exists');
        error.code = 'USER_ALREADY_EXISTS';
        throw error;
      }

      assertUniquePhoneInMemory(safePhone);

      const hashedPassword = await hashPassword(safePassword);

      const user = {
        id: crypto.randomUUID(),
        email: safeEmail,
        name: safeName,
        password: hashedPassword,
        phone: safePhone,
        timezone: safeTimezone,
        nomeDoNegocio: safeNomeDoNegocio,
        servicos: safeServicos,
        horarios: safeHorarios,
        politicaConfirmacao: safePoliticaConfirmacao,
        onboardingIncompleto: safeOnboardingIncompleto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryUsersByEmail.set(safeEmail, user);
      inMemoryUsersById.set(user.id, user);
      return sanitizeUser(user);
    }

    const hashedPassword = await hashPassword(safePassword);

    try {
      const user = await prisma.user.create({
        data: {
          name: safeName,
          email: safeEmail,
          password: hashedPassword,
          phone: safePhone,
          timezone: safeTimezone,
          nomeDoNegocio: safeNomeDoNegocio,
          servicos: safeServicos,
          horarios: safeHorarios,
          politicaConfirmacao: safePoliticaConfirmacao,
          onboardingIncompleto: safeOnboardingIncompleto,
        },
        select: USER_SAFE_SELECT,
      });

      return sanitizeUser(user);
    } catch (error) {
      if (error?.code === 'P2002') {
        const conflict = new Error('Unique constraint violation');
        conflict.code = 'USER_UNIQUE_CONSTRAINT_VIOLATION';
        throw conflict;
      }

      throw error;
    }
  }

  async ensureUserForEmail(
    email,
    {
      name,
      nomeDoNegocio,
      servicos,
      horarios,
      politicaConfirmacao,
      onboardingIncompleto,
      phone,
      timezone,
    } = {},
  ) {
    const fallbackName = inferNameFromEmail(email);
    const finalName =
      typeof name === 'string' && name.trim().length >= 3 ? name.trim() : fallbackName;
    const provisionalPassword = generateRandomPassword();
    const normalizedNomeDoNegocio = normalizeNomeDoNegocio(nomeDoNegocio);
    const normalizedServicos = normalizeServicos(servicos);
    const normalizedHorarios = cloneJson(horarios, {});
    const normalizedPolitica = normalizePoliticaConfirmacao(politicaConfirmacao);
    const normalizedOnboarding = normalizeOnboardingIncompleto(
      onboardingIncompleto ?? true,
    );
    const normalizedPhone = normalizePhone(phone);
    const normalizedTimezone = normalizeTimezone(timezone);

    const validatedPayload = autoCreateUserSchema.parse({
      name: finalName,
      email,
      password: provisionalPassword,
      nomeDoNegocio: normalizedNomeDoNegocio,
      servicos: normalizedServicos,
      horarios: normalizedHorarios,
      politicaConfirmacao: normalizedPolitica,
      onboardingIncompleto: normalizedOnboarding,
      phone: normalizedPhone,
      timezone: normalizedTimezone,
    });

    const existing = await this.findByEmail(validatedPayload.email);

    if (existing) {
      return existing;
    }

    if (shouldUseInMemoryStore()) {
      try {
        return await this.create({
          name: validatedPayload.name,
          email: validatedPayload.email,
          password: validatedPayload.password,
          nomeDoNegocio: validatedPayload.nomeDoNegocio,
          servicos: validatedPayload.servicos,
          horarios: validatedPayload.horarios,
          politicaConfirmacao: validatedPayload.politicaConfirmacao,
          onboardingIncompleto: validatedPayload.onboardingIncompleto,
          phone: validatedPayload.phone,
          timezone: validatedPayload.timezone,
        });
      } catch (error) {
        if (error?.code === 'USER_ALREADY_EXISTS') {
          return this.findByEmail(validatedPayload.email);
        }

        throw error;
      }
    }

    const hashedPassword = await hashPassword(validatedPayload.password);

    const user = await prisma.user.upsert({
      where: { email: validatedPayload.email },
      update: {},
      create: {
        name: validatedPayload.name,
        email: validatedPayload.email,
        password: hashedPassword,
        nomeDoNegocio: validatedPayload.nomeDoNegocio,
        servicos: validatedPayload.servicos,
        horarios: validatedPayload.horarios,
        politicaConfirmacao: validatedPayload.politicaConfirmacao,
        onboardingIncompleto: validatedPayload.onboardingIncompleto,
        phone: validatedPayload.phone,
        timezone: validatedPayload.timezone,
      },
      select: USER_SAFE_SELECT,
    });

    return sanitizeUser(user);
  }

  async update(userId, updates = {}) {
    if (!userId) {
      return null;
    }

    const data = {};

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      data.name = typeof updates.name === 'string' ? updates.name.trim() : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'nomeDoNegocio')) {
      data.nomeDoNegocio = normalizeNomeDoNegocio(updates.nomeDoNegocio);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'servicos')) {
      data.servicos = normalizeServicos(updates.servicos);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'horarios')) {
      data.horarios = normalizeHorariosInput(updates.horarios);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'politicaConfirmacao')) {
      data.politicaConfirmacao = normalizePoliticaConfirmacao(updates.politicaConfirmacao);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'onboardingIncompleto')) {
      data.onboardingIncompleto = normalizeOnboardingIncompleto(updates.onboardingIncompleto);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
      data.phone = normalizePhone(updates.phone);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'timezone')) {
      data.timezone = normalizeTimezone(updates.timezone);
    }

    let hashedPassword;
    if (Object.prototype.hasOwnProperty.call(updates, 'password')) {
      if (typeof updates.password === 'string' && updates.password.length > 0) {
        hashedPassword = await hashPassword(updates.password);
        data.password = hashedPassword;
      }
    }

    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersById.get(userId);

      if (!user) {
        return null;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'phone')) {
        assertUniquePhoneInMemory(data.phone, userId);
      }

      if (data.name !== undefined) {
        user.name = data.name;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'nomeDoNegocio')) {
        user.nomeDoNegocio = data.nomeDoNegocio;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'servicos')) {
        user.servicos = data.servicos;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'horarios')) {
        user.horarios = data.horarios;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'politicaConfirmacao')) {
        user.politicaConfirmacao = data.politicaConfirmacao;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'onboardingIncompleto')) {
        user.onboardingIncompleto = data.onboardingIncompleto;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'phone')) {
        user.phone = data.phone;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'timezone')) {
        user.timezone = data.timezone ?? DEFAULT_TIMEZONE;
      }

      if (hashedPassword) {
        user.password = hashedPassword;
      }

      user.updatedAt = new Date();
      inMemoryUsersByEmail.set(user.email, user);
      inMemoryUsersById.set(user.id, user);

      return sanitizeUser(user);
    }

    if (Object.keys(data).length === 0) {
      return this.findById(userId);
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: USER_SAFE_SELECT,
      });

      return sanitizeUser(updatedUser);
    } catch (error) {
      if (error?.code === 'P2002') {
        const conflict = new Error('Unique constraint violation');
        conflict.code = 'USER_UNIQUE_CONSTRAINT_VIOLATION';
        throw conflict;
      }

      throw error;
    }
  }

  async delete(userId) {
    if (!userId) {
      return false;
    }

    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersById.get(userId);

      if (!user) {
        return false;
      }

      inMemoryUsersById.delete(userId);
      inMemoryUsersByEmail.delete(user.email);
      return true;
    }

    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return true;
    } catch (error) {
      if (error?.code === 'P2025') {
        return false;
      }

      throw error;
    }
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await hashPassword(newPassword);

    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersById.get(userId);

      if (!user) {
        return null;
      }

      user.password = hashedPassword;
      user.updatedAt = new Date();
      inMemoryUsersByEmail.set(user.email, user);
      inMemoryUsersById.set(user.id, user);
      return sanitizeUser(user);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: USER_SAFE_SELECT,
    });

    return sanitizeUser(updatedUser);
  }

  async updateOnboardingStatus(userId, onboardingIncompleto) {
    const normalizedStatus = normalizeOnboardingIncompleto(onboardingIncompleto);

    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersById.get(userId);

      if (!user) {
        return null;
      }

      user.onboardingIncompleto = normalizedStatus;
      user.updatedAt = new Date();
      inMemoryUsersByEmail.set(user.email, user);
      inMemoryUsersById.set(user.id, user);
      return sanitizeUser(user);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { onboardingIncompleto: normalizedStatus },
      select: USER_SAFE_SELECT,
    });

    return sanitizeUser(updatedUser);
  }

  async markOnboardingComplete(userId) {
    return this.updateOnboardingStatus(userId, false);
  }

  async completeOnboarding(userId, onboardingData) {
    const nomeDoNegocio = normalizeNomeDoNegocio(onboardingData?.nomeDoNegocio);
    const servicos = normalizeServicos(onboardingData?.servicos);
    const horarios = normalizeHorariosInput(onboardingData?.horarios);
    const politicaConfirmacao = normalizePoliticaConfirmacao(onboardingData?.politicaConfirmacao);

    if (shouldUseInMemoryStore()) {
      const user = inMemoryUsersById.get(userId);

      if (!user) {
        return null;
      }

      user.nomeDoNegocio = nomeDoNegocio;
      user.servicos = servicos;
      user.horarios = horarios;
      user.politicaConfirmacao = politicaConfirmacao;
      user.onboardingIncompleto = false;
      user.updatedAt = new Date();

      inMemoryUsersByEmail.set(user.email, user);
      inMemoryUsersById.set(user.id, user);
      return sanitizeUser(user);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        nomeDoNegocio,
        servicos,
        horarios,
        politicaConfirmacao,
        onboardingIncompleto: false,
      },
      select: USER_SAFE_SELECT,
    });

    return sanitizeUser(updatedUser);
  }
}

export default new UserService();
