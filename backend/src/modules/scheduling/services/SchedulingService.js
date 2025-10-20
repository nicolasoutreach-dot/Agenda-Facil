import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../../database/prisma.js';
import shouldUseInMemoryStore from '../../../utils/environment.js';

const inMemoryStores = {
  customers: new Map(),
  services: new Map(),
  appointments: new Map(),
  workingHours: new Map(),
  blocks: new Map(),
  payments: new Map(),
};

function createError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function toISODate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeDecimal(decimalValue) {
  if (decimalValue === null || decimalValue === undefined) {
    return null;
  }

  if (typeof decimalValue === 'number') {
    return Number(decimalValue.toFixed(2));
  }

  if (decimalValue instanceof Prisma.Decimal) {
    return Number(decimalValue.toFixed(2));
  }

  const parsed = Number(decimalValue);
  return Number.isNaN(parsed) ? null : Number(parsed.toFixed(2));
}

function normalizeDecimalInput(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    return new Prisma.Decimal(value);
  }

  if (typeof value === 'string') {
    return new Prisma.Decimal(value);
  }

  return null;
}

function ensureProviderStore(map, providerId) {
  if (!map.has(providerId)) {
    map.set(providerId, new Map());
  }

  return map.get(providerId);
}

function timeStringToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map((item) => Number.parseInt(item, 10));
  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const WEEKDAY_ENUM = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function normalizeDayOfWeek(dayOfWeek) {
  if (dayOfWeek === undefined || dayOfWeek === null) {
    return null;
  }

  const normalized = Number(dayOfWeek);

  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 6) {
    return null;
  }

  return WEEKDAY_ENUM[normalized];
}

function resolveDayIndex(dayOfWeek) {
  if (typeof dayOfWeek !== 'string') {
    return null;
  }

  const index = WEEKDAY_ENUM.indexOf(dayOfWeek);
  return index >= 0 ? index : null;
}

function ensureValidTimeRange(startMinutes, endMinutes) {
  if (endMinutes <= startMinutes) {
    throw createError('WORKING_HOUR_INVALID_RANGE', 'O horario final deve ser maior que o inicial.');
  }
}

function normalizeBreakWindows(windows, startMinutes, endMinutes) {
  if (!Array.isArray(windows)) {
    return [];
  }

  return windows
    .map((window) => ({
      start: typeof window.start === 'string' ? window.start : '',
      end: typeof window.end === 'string' ? window.end : '',
    }))
    .filter((window) => {
      if (!window.start || !window.end) {
        return false;
      }

      const start = timeStringToMinutes(window.start);
      const end = timeStringToMinutes(window.end);

      return start >= startMinutes && end <= endMinutes && end > start;
    });
}

function sanitizeCustomer(customer) {
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    providerId: customer.providerId,
    name: customer.name,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    notes: customer.notes ?? null,
    tags: customer.tags ?? [],
    createdAt: toISODate(customer.createdAt),
    updatedAt: toISODate(customer.updatedAt),
  };
}

function sanitizeService(service) {
  if (!service) {
    return null;
  }

  return {
    id: service.id,
    providerId: service.providerId,
    name: service.name,
    description: service.description ?? null,
    durationMinutes: service.durationMinutes,
    price: serializeDecimal(service.price),
    currency: service.currency,
    isActive: service.isActive,
    bufferBefore: service.bufferBefore ?? 0,
    bufferAfter: service.bufferAfter ?? 0,
    createdAt: toISODate(service.createdAt),
    updatedAt: toISODate(service.updatedAt),
  };
}

function sanitizeWorkingHour(entry) {
  if (!entry) {
    return null;
  }

  const dayIndex = resolveDayIndex(entry.dayOfWeek);

  return {
    id: entry.id,
    providerId: entry.providerId,
    dayOfWeek: entry.dayOfWeek,
    startMinutes: entry.startMinutes,
    endMinutes: entry.endMinutes,
    dayIndex: dayIndex ?? undefined,
    startTime: minutesToTimeString(entry.startMinutes),
    endTime: minutesToTimeString(entry.endMinutes),
    breakWindows: clone(entry.breakWindows ?? []),
    timeZone: entry.timeZone ?? null,
    createdAt: toISODate(entry.createdAt),
    updatedAt: toISODate(entry.updatedAt),
  };
}

function sanitizeBlock(block) {
  if (!block) {
    return null;
  }

  return {
    id: block.id,
    providerId: block.providerId,
    startsAt: toISODate(block.startsAt),
    endsAt: toISODate(block.endsAt),
    reason: block.reason ?? null,
    type: block.type,
    metadata: block.metadata ?? null,
    createdAt: toISODate(block.createdAt),
    updatedAt: toISODate(block.updatedAt),
  };
}

function sanitizeAppointment(appointment) {
  if (!appointment) {
    return null;
  }

  return {
    id: appointment.id,
    providerId: appointment.providerId,
    customerId: appointment.customerId ?? null,
    serviceId: appointment.serviceId ?? null,
    startsAt: toISODate(appointment.startsAt),
    endsAt: toISODate(appointment.endsAt),
    status: appointment.status,
    price: serializeDecimal(appointment.price),
    currency: appointment.currency,
    source: appointment.source,
    notes: appointment.notes ?? null,
    metadata: appointment.metadata ?? null,
    createdAt: toISODate(appointment.createdAt),
    updatedAt: toISODate(appointment.updatedAt),
    customer: appointment.customer ? sanitizeCustomer(appointment.customer) : null,
    service: appointment.service ? sanitizeService(appointment.service) : null,
  };
}

function sanitizePayment(payment) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    providerId: payment.providerId,
    appointmentId: payment.appointmentId ?? null,
    customerId: payment.customerId ?? null,
    amount: serializeDecimal(payment.amount),
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    description: payment.description ?? null,
    recordedAt: toISODate(payment.recordedAt),
    receivedAt: toISODate(payment.receivedAt),
    metadata: payment.metadata ?? null,
    createdAt: toISODate(payment.createdAt),
    updatedAt: toISODate(payment.updatedAt),
  };
}

function toPlainOverview({
  customers = [],
  services = [],
  appointments = [],
  workingHours = [],
  blocks = [],
  payments = [],
}) {
  const revenueReceived = payments
    .filter((payment) => payment.status === 'received')
    .reduce((total, payment) => total + (payment.amount ?? 0), 0);

  const upcomingAppointments = appointments.filter((appointment) => {
    const startsAt = appointment.startsAt ? new Date(appointment.startsAt) : null;
    return startsAt && startsAt.getTime() > Date.now();
  }).length;

  return {
    customers,
    services,
    appointments,
    workingHours,
    blocks,
    payments,
    summary: {
      totalCustomers: customers.length,
      totalServices: services.length,
      totalAppointments: appointments.length,
      upcomingAppointments,
      totalRevenueReceived: Number(revenueReceived.toFixed(2)),
    },
  };
}

class SchedulingService {
  async createCustomer(providerId, payload) {
    if (shouldUseInMemoryStore()) {
      const customersStore = ensureProviderStore(inMemoryStores.customers, providerId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const customer = {
        id,
        providerId,
        name: payload.name,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        notes: payload.notes ?? null,
        tags: payload.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };
      customersStore.set(id, clone(customer));
      return customer;
    }

    const customer = await prisma.customer.create({
      data: {
        providerId,
        name: payload.name,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        notes: payload.notes ?? null,
        tags: payload.tags ?? [],
      },
    });

    return sanitizeCustomer(customer);
  }

  async listCustomers(providerId) {
    if (shouldUseInMemoryStore()) {
      const customersStore = ensureProviderStore(inMemoryStores.customers, providerId);
      return Array.from(customersStore.values()).map((customer) => ({
        ...customer,
        tags: customer.tags ?? [],
      }));
    }

    const customers = await prisma.customer.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map(sanitizeCustomer);
  }

  async createService(providerId, payload) {
    if (shouldUseInMemoryStore()) {
      const servicesStore = ensureProviderStore(inMemoryStores.services, providerId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const priceValue =
        payload.price === undefined || payload.price === null
          ? null
          : Number(payload.price.toFixed(2));
      const service = {
        id,
        providerId,
        name: payload.name,
        description: payload.description ?? null,
        durationMinutes: payload.durationMinutes,
        price: priceValue,
        currency: payload.currency ?? 'BRL',
        isActive: payload.isActive ?? true,
        bufferBefore: payload.bufferBefore ?? 0,
        bufferAfter: payload.bufferAfter ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      servicesStore.set(id, clone(service));
      return service;
    }

    const service = await prisma.service.create({
      data: {
        providerId,
        name: payload.name,
        description: payload.description ?? null,
        durationMinutes: payload.durationMinutes,
        price: normalizeDecimalInput(payload.price),
        currency: payload.currency ?? 'BRL',
        isActive: payload.isActive ?? true,
        bufferBefore: payload.bufferBefore ?? 0,
        bufferAfter: payload.bufferAfter ?? 0,
      },
    });

    return sanitizeService(service);
  }

  async listServices(providerId) {
    if (shouldUseInMemoryStore()) {
      const servicesStore = ensureProviderStore(inMemoryStores.services, providerId);
      return Array.from(servicesStore.values()).map((service) => ({
        ...service,
        price: service.price === null || service.price === undefined ? null : Number(service.price),
      }));
    }

    const services = await prisma.service.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });

    return services.map(sanitizeService);
  }

  async getServiceById(providerId, serviceId) {
    if (!serviceId) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const servicesStore = ensureProviderStore(inMemoryStores.services, providerId);
      const service = servicesStore.get(serviceId);
      return service ? sanitizeService(service) : null;
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, providerId },
    });

    return sanitizeService(service);
  }

  async updateService(providerId, serviceId, updates = {}) {
    if (!serviceId) {
      return null;
    }

    const data = {};

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      data.name = typeof updates.name === 'string' ? updates.name.trim() : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      data.description =
        typeof updates.description === 'string' ? updates.description.trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'durationMinutes')) {
      data.durationMinutes = updates.durationMinutes;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'price')) {
      data.price = normalizeDecimalInput(updates.price);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'currency')) {
      data.currency =
        typeof updates.currency === 'string' && updates.currency.trim().length > 0
          ? updates.currency.trim().toUpperCase()
          : 'BRL';
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'bufferBefore')) {
      data.bufferBefore = updates.bufferBefore ?? 0;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'bufferAfter')) {
      data.bufferAfter = updates.bufferAfter ?? 0;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
      data.isActive = updates.isActive;
    }

    if (shouldUseInMemoryStore()) {
      const servicesStore = ensureProviderStore(inMemoryStores.services, providerId);
      const service = servicesStore.get(serviceId);

      if (!service) {
        return null;
      }

      if (data.name !== undefined) {
        service.name = data.name;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'description')) {
        service.description = data.description;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'durationMinutes')) {
        service.durationMinutes = data.durationMinutes;
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'price')) {
        if (updates.price === null || updates.price === undefined) {
          service.price = null;
        } else {
          service.price = Number(Number(updates.price).toFixed(2));
        }
      }

      if (Object.prototype.hasOwnProperty.call(data, 'currency')) {
        service.currency = data.currency;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'bufferBefore')) {
        service.bufferBefore = data.bufferBefore ?? 0;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'bufferAfter')) {
        service.bufferAfter = data.bufferAfter ?? 0;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'isActive')) {
        service.isActive = data.isActive ?? true;
      }

      service.updatedAt = new Date().toISOString();
      servicesStore.set(serviceId, clone(service));
      return sanitizeService(service);
    }

    if (Object.keys(data).length === 0) {
      return this.getServiceById(providerId, serviceId);
    }

    const existing = await prisma.service.findFirst({
      where: { id: serviceId, providerId },
    });

    if (!existing) {
      return null;
    }

    try {
      const updated = await prisma.service.update({
        where: { id: serviceId },
        data,
      });

      return sanitizeService(updated);
    } catch (error) {
      if (error?.code === 'P2025') {
        return null;
      }

      if (error?.code === 'P2002') {
        const conflict = new Error('Unique constraint violation');
        conflict.code = 'SERVICE_UNIQUE_CONSTRAINT';
        throw conflict;
      }

      throw error;
    }
  }

  async deleteService(providerId, serviceId) {
    if (!serviceId) {
      return false;
    }

    if (shouldUseInMemoryStore()) {
      const servicesStore = ensureProviderStore(inMemoryStores.services, providerId);
      if (!servicesStore.has(serviceId)) {
        return false;
      }
      servicesStore.delete(serviceId);
      return true;
    }

    const result = await prisma.service.deleteMany({
      where: { id: serviceId, providerId },
    });

    return result.count > 0;
  }

  async deleteBlock(providerId, blockId) {
    if (!blockId) {
      return false;
    }

    if (shouldUseInMemoryStore()) {
      const blocksStore = ensureProviderStore(inMemoryStores.blocks, providerId);

      if (!blocksStore.has(blockId)) {
        return false;
      }

      blocksStore.delete(blockId);
      return true;
    }

    const result = await prisma.block.deleteMany({
      where: { id: blockId, providerId },
    });

    return result.count > 0;
  }

  }

  async listWorkingHours(providerId) {
    if (shouldUseInMemoryStore()) {
      const workingHoursStore = ensureProviderStore(inMemoryStores.workingHours, providerId);
      return Array.from(workingHoursStore.values()).map(sanitizeWorkingHour);
    }

    const workingHours = await prisma.workingHours.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
    });

    return workingHours.map(sanitizeWorkingHour);
  }

  async createWorkingHour(providerId, payload) {
    const dayOfWeekEnum = normalizeDayOfWeek(payload.dayOfWeek);
    if (!dayOfWeekEnum) {
      throw createError('WORKING_HOUR_INVALID_DAY', 'Dia da semana inválido.');
    }

    const startMinutes = timeStringToMinutes(payload.startTime);
    const endMinutes = timeStringToMinutes(payload.endTime);
    ensureValidTimeRange(startMinutes, endMinutes);

    const breakWindows = normalizeBreakWindows(payload.breakWindows ?? [], startMinutes, endMinutes);
    const timeZone =
      typeof payload.timeZone === 'string' && payload.timeZone.trim().length > 0
        ? payload.timeZone.trim()
        : null;

    if (shouldUseInMemoryStore()) {
      const workingHoursStore = ensureProviderStore(inMemoryStores.workingHours, providerId);
      const hasConflict = Array.from(workingHoursStore.values()).some(
        (record) => record.dayOfWeek === dayOfWeekEnum,
      );

      if (hasConflict) {
        throw createError(
          'WORKING_HOUR_CONFLICT',
          'Já existe um horario cadastrado para este dia.',
          409,
        );
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const record = {
        id,
        providerId,
        dayOfWeek: dayOfWeekEnum,
        startMinutes,
        endMinutes,
        breakWindows,
        timeZone,
        createdAt: now,
        updatedAt: now,
      };
      workingHoursStore.set(id, clone(record));
      return sanitizeWorkingHour(record);
    }

    try {
      const workingHour = await prisma.workingHours.create({
        data: {
          providerId,
          dayOfWeek: dayOfWeekEnum,
          startMinutes,
          endMinutes,
          breakWindows,
          timeZone,
        },
      });

      return sanitizeWorkingHour(workingHour);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw createError(
          'WORKING_HOUR_CONFLICT',
          'Já existe um horario cadastrado para este dia.',
          409,
        );
      }

      throw error;
    }
  }

  async updateWorkingHour(providerId, workingHourId, updates = {}) {
    if (!workingHourId) {
      return null;
    }

    if (shouldUseInMemoryStore()) {
      const workingHoursStore = ensureProviderStore(inMemoryStores.workingHours, providerId);
      const existing = workingHoursStore.get(workingHourId);

      if (!existing) {
        return null;
      }

      let dayOfWeekEnum = existing.dayOfWeek;

      if (updates.dayOfWeek !== undefined) {
        const normalizedDay = normalizeDayOfWeek(updates.dayOfWeek);
        if (!normalizedDay) {
          throw createError('WORKING_HOUR_INVALID_DAY', 'Dia da semana inválido.');
        }

        const hasConflict = Array.from(workingHoursStore.entries()).some(
          ([key, value]) => key !== workingHourId && value.dayOfWeek === normalizedDay,
        );

        if (hasConflict) {
          throw createError(
            'WORKING_HOUR_CONFLICT',
            'Já existe um horario cadastrado para este dia.',
            409,
          );
        }

        dayOfWeekEnum = normalizedDay;
      }

      const startMinutes = updates.startTime
        ? timeStringToMinutes(updates.startTime)
        : existing.startMinutes;
      const endMinutes = updates.endTime
        ? timeStringToMinutes(updates.endTime)
        : existing.endMinutes;
      ensureValidTimeRange(startMinutes, endMinutes);

      const existingBreaks = Array.isArray(existing.breakWindows) ? existing.breakWindows : [];
      const breakWindows =
        updates.breakWindows !== undefined
          ? normalizeBreakWindows(updates.breakWindows, startMinutes, endMinutes)
          : normalizeBreakWindows(existingBreaks, startMinutes, endMinutes);

      const timeZone =
        updates.timeZone !== undefined
          ? typeof updates.timeZone === 'string' && updates.timeZone.trim().length > 0
            ? updates.timeZone.trim()
            : null
          : existing.timeZone ?? null;

      const record = {
        ...existing,
        dayOfWeek: dayOfWeekEnum,
        startMinutes,
        endMinutes,
        breakWindows,
        timeZone,
        updatedAt: new Date().toISOString(),
      };

      workingHoursStore.set(workingHourId, clone(record));
      return sanitizeWorkingHour(record);
    }

    const existing = await prisma.workingHours.findFirst({
      where: { id: workingHourId, providerId },
    });

    if (!existing) {
      return null;
    }

    let dayOfWeekEnum = existing.dayOfWeek;
    if (updates.dayOfWeek !== undefined) {
      const normalizedDay = normalizeDayOfWeek(updates.dayOfWeek);
      if (!normalizedDay) {
        throw createError('WORKING_HOUR_INVALID_DAY', 'Dia da semana inválido.');
      }
      dayOfWeekEnum = normalizedDay;
    }

    const startMinutes = updates.startTime
      ? timeStringToMinutes(updates.startTime)
      : existing.startMinutes;
    const endMinutes = updates.endTime
      ? timeStringToMinutes(updates.endTime)
      : existing.endMinutes;
    ensureValidTimeRange(startMinutes, endMinutes);

    const existingBreaks = Array.isArray(existing.breakWindows) ? existing.breakWindows : [];
    const breakWindows =
      updates.breakWindows !== undefined
        ? normalizeBreakWindows(updates.breakWindows, startMinutes, endMinutes)
        : normalizeBreakWindows(existingBreaks, startMinutes, endMinutes);

    const timeZone =
      updates.timeZone !== undefined
        ? typeof updates.timeZone === 'string' && updates.timeZone.trim().length > 0
          ? updates.timeZone.trim()
          : null
        : existing.timeZone ?? null;

    try {
      const updated = await prisma.workingHours.update({
        where: { id: workingHourId },
        data: {
          dayOfWeek: dayOfWeekEnum,
          startMinutes,
          endMinutes,
          breakWindows,
          timeZone,
        },
      });

      return sanitizeWorkingHour(updated);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw createError(
          'WORKING_HOUR_CONFLICT',
          'Já existe um horario cadastrado para este dia.',
          409,
        );
      }

      throw error;
    }
  }

  async deleteWorkingHour(providerId, workingHourId) {
    if (!workingHourId) {
      return false;
    }

    if (shouldUseInMemoryStore()) {
      const workingHoursStore = ensureProviderStore(inMemoryStores.workingHours, providerId);

      if (!workingHoursStore.has(workingHourId)) {
        return false;
      }

      workingHoursStore.delete(workingHourId);
      return true;
    }

    const result = await prisma.workingHours.deleteMany({
      where: { id: workingHourId, providerId },
    });

    return result.count > 0;
  }

  async createBlock(providerId, payload) {
    const startsAt =
      payload.startsAt instanceof Date ? payload.startsAt : new Date(payload.startsAt ?? '');
    const endsAt = payload.endsAt instanceof Date ? payload.endsAt : new Date(payload.endsAt ?? '');

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw createError('BLOCK_INVALID_RANGE', 'As datas informadas são inválidas.');
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw createError(
        'BLOCK_INVALID_RANGE',
        'A data/hora final do bloqueio deve ser maior que a inicial.',
      );
    }

    const reason =
      typeof payload.reason === 'string' && payload.reason.trim().length > 0
        ? payload.reason.trim()
        : null;
    const metadata = payload.metadata ?? null;
    const type = payload.type ?? 'manual';

    if (shouldUseInMemoryStore()) {
      const blocksStore = ensureProviderStore(inMemoryStores.blocks, providerId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const block = {
        id,
        providerId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason,
        type,
        metadata,
        createdAt: now,
        updatedAt: now,
      };
      blocksStore.set(id, clone(block));
      return block;
    }

    const block = await prisma.block.create({
      data: {
        providerId,
        startsAt,
        endsAt,
        reason,
        type,
        metadata,
      },
    });

    return sanitizeBlock(block);
  }

  async listBlocks(providerId) {
    if (shouldUseInMemoryStore()) {
      const blocksStore = ensureProviderStore(inMemoryStores.blocks, providerId);
      return Array.from(blocksStore.values()).map(sanitizeBlock);
    }

    const blocks = await prisma.block.findMany({
      where: { providerId },
      orderBy: { startsAt: 'desc' },
    });

    return blocks.map(sanitizeBlock);
  }

  async createAppointment(providerId, payload) {
    if (payload.customerId) {
      const customerExists = await this.ensureCustomer(providerId, payload.customerId);
      if (!customerExists) {
        throw createError('CUSTOMER_NOT_FOUND', 'Cliente n�o encontrado.', 404);
      }
    }

    if (payload.serviceId) {
      const serviceExists = await this.ensureService(providerId, payload.serviceId);
      if (!serviceExists) {
        throw createError('SERVICE_NOT_FOUND', 'Servi�o n�o encontrado.', 404);
      }
    }

    const startsAtIso = toISODate(payload.startsAt);
    const endsAtIso = toISODate(payload.endsAt);

    if (shouldUseInMemoryStore()) {
      const appointmentsStore = ensureProviderStore(inMemoryStores.appointments, providerId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const appointment = {
        id,
        providerId,
        customerId: payload.customerId ?? null,
        serviceId: payload.serviceId ?? null,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        status: payload.status ?? 'pending',
        price: payload.price ? Number(payload.price.toFixed(2)) : null,
        currency: payload.currency,
        source: payload.source ?? 'manual',
        notes: payload.notes ?? null,
        metadata: payload.metadata ?? null,
        createdAt: now,
        updatedAt: now,
        customer: payload.customer ?? null,
        service: payload.service ?? null,
      };
      appointmentsStore.set(id, clone(appointment));
      return appointment;
    }

    const appointment = await prisma.appointment.create({
      data: {
        providerId,
        customerId: payload.customerId ?? null,
        serviceId: payload.serviceId ?? null,
        startsAt: startsAtIso ? new Date(startsAtIso) : new Date(payload.startsAt),
        endsAt: endsAtIso ? new Date(endsAtIso) : new Date(payload.endsAt),
        status: payload.status ?? 'pending',
        price: normalizeDecimalInput(payload.price),
        currency: payload.currency,
        source: payload.source ?? 'manual',
        notes: payload.notes ?? null,
        metadata: payload.metadata ?? null,
      },
      include: {
        customer: true,
        service: true,
      },
    });

    return sanitizeAppointment(appointment);
  }

  async listAppointments(providerId) {
    if (shouldUseInMemoryStore()) {
      const appointmentsStore = ensureProviderStore(inMemoryStores.appointments, providerId);
      return Array.from(appointmentsStore.values()).map((appointment) => ({
        ...appointment,
        price: appointment.price ?? null,
      }));
    }

    const appointments = await prisma.appointment.findMany({
      where: { providerId },
      include: {
        customer: true,
        service: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    return appointments.map(sanitizeAppointment);
  }

  async recordPayment(providerId, payload) {
    if (payload.appointmentId) {
      const appointmentExists = await prisma.appointment.findFirst({
        where: { id: payload.appointmentId, providerId },
        select: { id: true },
      });

      if (!appointmentExists) {
        throw createError('APPOINTMENT_NOT_FOUND', 'Agendamento n�o encontrado.', 404);
      }
    }

    if (payload.customerId) {
      const customerExists = await this.ensureCustomer(providerId, payload.customerId);
      if (!customerExists) {
        throw createError('CUSTOMER_NOT_FOUND', 'Cliente n�o encontrado.', 404);
      }
    }

    if (shouldUseInMemoryStore()) {
      const paymentsStore = ensureProviderStore(inMemoryStores.payments, providerId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const payment = {
        id,
        providerId,
        appointmentId: payload.appointmentId ?? null,
        customerId: payload.customerId ?? null,
        amount: Number(payload.amount.toFixed(2)),
        currency: payload.currency,
        method: payload.method,
        status: payload.status ?? 'received',
        description: payload.description ?? null,
        recordedAt: toISODate(payload.recordedAt) ?? now,
        receivedAt: toISODate(payload.receivedAt),
        metadata: payload.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      };
      paymentsStore.set(id, clone(payment));
      return payment;
    }

    const recordedAtIso = toISODate(payload.recordedAt);
    const receivedAtIso = toISODate(payload.receivedAt);

    const payment = await prisma.paymentRecord.create({
      data: {
        providerId,
        appointmentId: payload.appointmentId ?? null,
        customerId: payload.customerId ?? null,
        amount: normalizeDecimalInput(payload.amount),
        currency: payload.currency,
        method: payload.method,
        status: payload.status ?? 'received',
        description: payload.description ?? null,
        recordedAt: recordedAtIso ? new Date(recordedAtIso) : new Date(),
        receivedAt: receivedAtIso ? new Date(receivedAtIso) : null,
        metadata: payload.metadata ?? null,
      },
    });

    return sanitizePayment(payment);
  }

  async listPayments(providerId) {
    if (shouldUseInMemoryStore()) {
      const paymentsStore = ensureProviderStore(inMemoryStores.payments, providerId);
      return Array.from(paymentsStore.values()).map((payment) => ({
        ...payment,
        amount: payment.amount ?? 0,
      }));
    }

    const payments = await prisma.paymentRecord.findMany({
      where: { providerId },
      orderBy: { recordedAt: 'desc' },
    });

    return payments.map(sanitizePayment);
  }

  async getOverview(providerId) {
    const [customers, services, appointments, workingHours, blocks, payments] = await Promise.all([
      this.listCustomers(providerId),
      this.listServices(providerId),
      this.listAppointments(providerId),
      this.listWorkingHours(providerId),
      this.listBlocks(providerId),
      this.listPayments(providerId),
    ]);

    return toPlainOverview({
      customers,
      services,
      appointments,
      workingHours,
      blocks,
      payments,
    });
  }

  async ensureCustomer(providerId, customerId) {
    if (shouldUseInMemoryStore()) {
      const customersStore = ensureProviderStore(inMemoryStores.customers, providerId);
      return customersStore.has(customerId);
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, providerId },
      select: { id: true },
    });

    return Boolean(customer);
  }

  async ensureService(providerId, serviceId) {
    if (shouldUseInMemoryStore()) {
      const servicesStore = ensureProviderStore(inMemoryStores.services, providerId);
      return servicesStore.has(serviceId);
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, providerId },
      select: { id: true },
    });

    return Boolean(service);
  }
}

export default new SchedulingService();
