import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const HTML_SANITIZER_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
};

const MAX_NAME_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MAX_URL_LENGTH = 2048;
const MAX_BUSINESS_NAME_LENGTH = 128;
const MAX_SERVICE_NAME_LENGTH = 64;
const MAX_SERVICOS_ITEMS = 20;
const MIN_PASSWORD_LENGTH = 6;
const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 1024;
const MIN_OTP_LENGTH = 4;
const MAX_OTP_LENGTH = 12;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_PHONE_LENGTH = 6;
const MAX_PHONE_LENGTH = 32;
const MAX_TIMEZONE_LENGTH = 64;
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

function stripHtml(value) {
  return sanitizeHtml(value, HTML_SANITIZER_OPTIONS);
}

function assertNoHtml(field) {
  return (value, ctx) => {
    const sanitized = stripHtml(value);
    if (sanitized !== value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${friendlyFieldLabel(field)} não pode conter HTML ou scripts.`,
      });
    }
  };
}

function friendlyFieldLabel(field) {
  switch (field) {
    case 'email':
      return 'E-mail';
    case 'password':
      return 'Senha';
    case 'name':
      return 'Nome';
    case 'nomeDoNegocio':
      return 'Nome do negocio';
    case 'servicos':
      return 'Servicos';
    case 'horarios':
      return 'Horarios';
    case 'politicaConfirmacao':
      return 'Politica de confirmacao';
    case 'onboardingIncompleto':
      return 'Onboarding incompleto';
    case 'phone':
      return 'Telefone';
    case 'timezone':
      return 'Fuso horario';
    case 'token':
      return 'Token';
    case 'redirectTo':
      return 'URL de redirecionamento';
    case 'refreshToken':
      return 'Refresh token';
    case 'otp':
      return 'Codigo OTP';
    default:
      return field.charAt(0).toUpperCase() + field.slice(1);
  }
}

const nameSchema = z
  .string({
    required_error: 'Informe um nome.',
    invalid_type_error: 'O nome deve ser uma string.',
  })
  .trim()
  .min(3, 'O nome deve ter pelo menos 3 caracteres.')
  .max(MAX_NAME_LENGTH, `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`)
  .superRefine(assertNoHtml('name'))
  .transform((value) => stripHtml(value));

const emailSchema = z
  .string({
    required_error: 'Informe um e-mail.',
    invalid_type_error: 'O e-mail deve ser uma string.',
  })
  .trim()
  .toLowerCase()
  .min(5, 'O e-mail deve ter pelo menos 5 caracteres.')
  .max(MAX_EMAIL_LENGTH, `O e-mail deve ter no máximo ${MAX_EMAIL_LENGTH} caracteres.`)
  .email('Informe um e-mail válido.')
  .superRefine(assertNoHtml('email'))
  .transform((value) => stripHtml(value));

const passwordSchema = z
  .string({
    required_error: 'Informe uma senha.',
    invalid_type_error: 'A senha deve ser uma string.',
  })
  .min(MIN_PASSWORD_LENGTH, `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  .max(MAX_PASSWORD_LENGTH, `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`)
  .refine((value) => value === value.trim(), {
    message: 'A senha não pode começar ou terminar com espaços.',
  })
  .refine((value) => !/[\s\r\n\t]/.test(value), {
    message: 'A senha não pode conter espaços em branco.',
  });

const businessNameSchema = z
  .string({
    invalid_type_error: 'O nome do negocio deve ser uma string.',
  })
  .trim()
  .min(3, 'O nome do negocio deve ter pelo menos 3 caracteres.')
  .max(
    MAX_BUSINESS_NAME_LENGTH,
    `O nome do negocio deve ter no maximo ${MAX_BUSINESS_NAME_LENGTH} caracteres.`,
  )
  .superRefine(assertNoHtml('nomeDoNegocio'))
  .transform((value) => stripHtml(value));

const optionalBusinessNameSchema = z
  .union([businessNameSchema, z.null()])
  .optional()
  .transform((value) => (typeof value === 'string' ? value : null));

const optionalBusinessNameUpdateSchema = z
  .union([businessNameSchema, z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return typeof value === 'string' ? value : null;
  });

const phoneSchema = z
  .string({
    invalid_type_error: 'O telefone deve ser uma string.',
  })
  .trim()
  .min(MIN_PHONE_LENGTH, `O telefone deve ter pelo menos ${MIN_PHONE_LENGTH} caracteres.`)
  .max(MAX_PHONE_LENGTH, `O telefone deve ter no maximo ${MAX_PHONE_LENGTH} caracteres.`)
  .superRefine(assertNoHtml('phone'))
  .transform((value) => stripHtml(value));

const registerPhoneSchema = z
  .union([phoneSchema, z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return null;
  });

const updatePhoneSchema = z
  .union([phoneSchema, z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    return null;
  });

const timezoneSchema = z
  .string({
    invalid_type_error: 'O fuso horario deve ser uma string.',
  })
  .trim()
  .min(3, 'Informe um fuso horario valido.')
  .max(MAX_TIMEZONE_LENGTH, `O fuso horario deve ter no maximo ${MAX_TIMEZONE_LENGTH} caracteres.`)
  .superRefine(assertNoHtml('timezone'))
  .transform((value) => stripHtml(value));

const registerTimezoneSchema = timezoneSchema
  .optional()
  .transform((value) => (typeof value === 'string' && value.length > 0 ? value : DEFAULT_TIMEZONE));

const updateTimezoneSchema = timezoneSchema.optional();

const serviceItemSchema = z
  .string({
    invalid_type_error: 'Cada servico deve ser uma string.',
  })
  .trim()
  .min(1, 'Cada servico deve ter pelo menos 1 caractere.')
  .max(
    MAX_SERVICE_NAME_LENGTH,
    `Cada servico deve ter no maximo ${MAX_SERVICE_NAME_LENGTH} caracteres.`,
  )
  .superRefine(assertNoHtml('servicos'))
  .transform((value) => stripHtml(value));

const servicesSchema = z
  .array(serviceItemSchema)
  .max(MAX_SERVICOS_ITEMS, `Voce pode informar no maximo ${MAX_SERVICOS_ITEMS} servicos.`)
  .optional()
  .transform((value) => value ?? []);

const servicesUpdateSchema = z
  .array(serviceItemSchema)
  .max(MAX_SERVICOS_ITEMS, `Voce pode informar no maximo ${MAX_SERVICOS_ITEMS} servicos.`)
  .optional();

const serviceNameSchema = z
  .string({
    required_error: 'Informe o nome do servico.',
    invalid_type_error: 'O nome do servico deve ser uma string.',
  })
  .trim()
  .min(3, 'O nome do servico deve ter pelo menos 3 caracteres.')
  .max(MAX_SERVICE_NAME_LENGTH, `O nome do servico deve ter no maximo ${MAX_SERVICE_NAME_LENGTH} caracteres.`)
  .superRefine(assertNoHtml('name'))
  .transform((value) => stripHtml(value));

const rawServiceDescriptionSchema = z
  .string({
    invalid_type_error: 'A descricao deve ser uma string.',
  })
  .trim()
  .max(1000, 'A descricao deve ter no maximo 1000 caracteres.')
  .superRefine(assertNoHtml('description'))
  .transform((value) => stripHtml(value));

const optionalServiceDescriptionCreateSchema = rawServiceDescriptionSchema
  .optional()
  .transform((value) => (typeof value === 'string' && value.trim().length > 0 ? value : null));

const optionalServiceDescriptionUpdateSchema = rawServiceDescriptionSchema
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value.trim().length > 0 ? value : null;
  });

const optionalBooleanSchema = z
  .union([
    z.boolean(),
    z
      .string()
      .trim()
      .transform((value) => value.toLowerCase())
      .pipe(z.enum(['true', 'false'])),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value === 'true';
  });

const onboardingServicesSchema = z
  .array(serviceItemSchema)
  .min(1, 'Informe pelo menos um servico oferecido.')
  .max(MAX_SERVICOS_ITEMS, `Voce pode informar no maximo ${MAX_SERVICOS_ITEMS} servicos.`);

const horariosSchema = z
  .union([z.record(z.string().min(1), z.any()), z.null()])
  .optional()
  .transform((value) => (value ?? {}));

const horariosUpdateSchema = z
  .union([z.record(z.string().min(1), z.any()), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return value ?? {};
  });

const POLITICA_CONFIRMATION_VALUES = ['manual', 'automatica'];

const politicaConfirmacaoSchema = z
  .string({
    invalid_type_error: 'politicaConfirmacao deve ser uma string.',
  })
  .trim()
  .superRefine(assertNoHtml('politicaConfirmacao'))
  .transform((value) => stripHtml(value))
  .transform((value) => value.toLowerCase())
  .refine((value) => POLITICA_CONFIRMATION_VALUES.includes(value), {
    message: 'politicaConfirmacao deve ser manual ou automatica.',
  })
  .optional();

const onboardingIncompletoSchema = z
  .boolean({
    invalid_type_error: 'onboardingIncompleto deve ser um booleano.',
  })
  .optional();

const optionalUrlSchema = z
  .string({
    invalid_type_error: 'A URL de redirecionamento deve ser uma string.',
  })
  .trim()
  .max(MAX_URL_LENGTH, `A URL de redirecionamento deve ter no máximo ${MAX_URL_LENGTH} caracteres.`)
  .url('Informe uma URL de redirecionamento válida.')
  .superRefine(assertNoHtml('redirectTo'))
  .transform((value) => stripHtml(value))
  .optional();

const otpSchema = z
  .string({
    required_error: 'Informe o codigo recebido.',
    invalid_type_error: 'O codigo deve ser uma string.',
  })
  .trim()
  .min(MIN_OTP_LENGTH, `O codigo deve ter pelo menos ${MIN_OTP_LENGTH} caracteres.`)
  .max(MAX_OTP_LENGTH, `O codigo deve ter no maximo ${MAX_OTP_LENGTH} caracteres.`)
  .regex(/^\d+$/, 'O codigo informado e invalido.');

const tokenSchema = (field = 'token') =>
  z
    .string({
      required_error: `Informe um ${friendlyFieldLabel(field)}.`,
      invalid_type_error: `${friendlyFieldLabel(field)} deve ser uma string.`,
    })
    .trim()
    .min(MIN_TOKEN_LENGTH, `${friendlyFieldLabel(field)} deve ter pelo menos ${MIN_TOKEN_LENGTH} caracteres.`)
    .max(MAX_TOKEN_LENGTH, `${friendlyFieldLabel(field)} deve ter no máximo ${MAX_TOKEN_LENGTH} caracteres.`)
    .refine((value) => /^\S+$/.test(value), {
      message: `${friendlyFieldLabel(field)} não pode conter espaços ou quebras de linha.`,
    })
    .refine((value) => !/[<>{}]/.test(value), {
      message: `${friendlyFieldLabel(field)} contém caracteres inválidos.`,
    });

const optionalTokenSchema = (field = 'token') =>
  tokenSchema(field)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    nomeDoNegocio: optionalBusinessNameSchema,
    servicos: servicesSchema,
    horarios: horariosSchema,
    politicaConfirmacao: politicaConfirmacaoSchema,
    onboardingIncompleto: onboardingIncompletoSchema,
    phone: registerPhoneSchema,
    timezone: registerTimezoneSchema,
  })
  .strict();

const userIdSchema = z
  .string({
    required_error: 'Informe o identificador do usuario.',
    invalid_type_error: 'O identificador do usuario deve ser uma string.',
  })
  .trim()
  .min(1, 'Informe o identificador do usuario.')
  .max(128, 'O identificador do usuario deve ter no maximo 128 caracteres.')
  .superRefine(assertNoHtml('id'))
  .transform((value) => stripHtml(value));

export const userIdParamSchema = z
  .object({
    id: userIdSchema,
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    nomeDoNegocio: optionalBusinessNameUpdateSchema,
    servicos: servicesUpdateSchema,
    horarios: horariosUpdateSchema,
    politicaConfirmacao: politicaConfirmacaoSchema,
    onboardingIncompleto: onboardingIncompletoSchema,
    password: passwordSchema.optional(),
    phone: updatePhoneSchema,
    timezone: updateTimezoneSchema,
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: 'Informe pelo menos um campo para atualizar.',
      path: ['_root'],
    },
  );

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const requestOtpSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: optionalTokenSchema('refreshToken'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: tokenSchema('token'),
    password: passwordSchema,
  })
  .strict();

const verifyOtpWithEmailSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
  })
  .strict();

const verifyOtpWithTokenSchema = z
  .object({
    token: tokenSchema('token'),
  })
  .strict();

export const verifyOtpSchema = z.union([verifyOtpWithEmailSchema, verifyOtpWithTokenSchema]);

const horarioIntervalSchema = z
  .object({
    inicio: z
      .string({
        required_error: 'Informe um horario de inicio.',
        invalid_type_error: 'O horario inicial deve ser uma string.',
      })
      .trim()
      .regex(TIME_PATTERN, 'Horario inicial invalido (use HH:MM).'),
    fim: z
      .string({
        required_error: 'Informe um horario de termino.',
        invalid_type_error: 'O horario final deve ser uma string.',
      })
      .trim()
      .regex(TIME_PATTERN, 'Horario final invalido (use HH:MM).'),
  })
  .superRefine((value, ctx) => {
    const [inicioHora, inicioMinuto] = value.inicio.split(':').map(Number);
    const [fimHora, fimMinuto] = value.fim.split(':').map(Number);
    const inicioTotal = inicioHora * 60 + inicioMinuto;
    const fimTotal = fimHora * 60 + fimMinuto;

    if (fimTotal <= inicioTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O horario final deve ser maior que o horario inicial.',
        path: ['fim'],
      });
    }
  });

const onboardingHorariosSchema = z
  .record(z.string().trim().min(1), horarioIntervalSchema)
  .superRefine((value, ctx) => {
    if (!value || Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe pelo menos um horario disponivel.',
      });
    }
  });

const optionalEmailFieldSchema = emailSchema.optional().transform((value) => value ?? null);

const optionalPhoneSchema = z
  .string({
    invalid_type_error: 'O telefone deve ser uma string.',
  })
  .trim()
  .min(6, 'Informe um telefone com pelo menos 6 caracteres.')
  .max(32, 'O telefone deve ter no maximo 32 caracteres.')
  .superRefine(assertNoHtml('phone'))
  .transform((value) => stripHtml(value))
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalNoteSchema = z
  .string({
    invalid_type_error: 'As notas devem ser uma string.',
  })
  .trim()
  .max(500, 'As notas devem ter no maximo 500 caracteres.')
  .superRefine(assertNoHtml('notes'))
  .transform((value) => stripHtml(value))
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const tagsSchema = z
  .array(
    z
      .string({
        invalid_type_error: 'Cada tag deve ser uma string.',
      })
      .trim()
      .min(1, 'As tags devem ter pelo menos 1 caractere.')
      .max(32, 'As tags devem ter no maximo 32 caracteres.')
      .superRefine(assertNoHtml('tags'))
      .transform((value) => stripHtml(value)),
  )
  .max(20, 'Voce pode informar no maximo 20 tags.')
  .optional()
  .default([]);

const currencySchema = z
  .string({
    invalid_type_error: 'A moeda deve ser uma string.',
  })
  .trim()
  .toUpperCase()
  .min(3, 'Informe um codigo de moeda valido.')
  .max(3, 'Informe um codigo de moeda valido.')
  .superRefine(assertNoHtml('currency'))
  .transform((value) => stripHtml(value));

const monetaryValueSchema = z.coerce
  .number({
    invalid_type_error: 'Informe um valor numerico.',
  })
  .refine((value) => Number.isFinite(value), {
    message: 'Informe um valor numerico valido.',
  })
  .refine((value) => value >= 0, {
    message: 'O valor n\u00e3o pode ser negativo.',
  });

const integerMinutesSchema = z.coerce
  .number({
    invalid_type_error: 'Informe um numero inteiro.',
  })
  .int('Informe um numero inteiro valido.')
  .min(1, 'Informe uma duracao minima de 1 minuto.')
  .max(24 * 60, 'A duracao n\u00e3o pode ultrapassar 1440 minutos.');

const bufferMinutesSchema = z.coerce
  .number({
    invalid_type_error: 'Informe um numero valido.',
  })
  .int('Informe um numero inteiro valido.')
  .min(0, 'O buffer deve ser maior ou igual a 0.')
  .max(12 * 60, 'O buffer n\u00e3o pode ultrapassar 720 minutos.');

const weekdayNumberSchema = z.coerce
  .number({
    invalid_type_error: 'O dia da semana deve ser um numero.',
  })
  .int('O dia da semana deve ser um numero inteiro.')
  .min(0, 'O dia da semana deve estar entre 0 (domingo) e 6 (sabado).')
  .max(6, 'O dia da semana deve estar entre 0 (domingo) e 6 (sabado).');

const dayOfWeekSchema = z.enum([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);

const timeStringSchema = z
  .string({
    invalid_type_error: 'Informe um horario no formato HH:MM.',
  })
  .trim()
  .regex(TIME_PATTERN, 'Informe um horario valido no formato HH:MM.');

const optionalTimeZoneStringSchema = z
  .string({
    invalid_type_error: 'O fuso horario deve ser uma string.',
  })
  .trim()
  .max(64, 'O fuso horario deve ter no maximo 64 caracteres.')
  .superRefine(assertNoHtml('timeZone'))
  .transform((value) => stripHtml(value))
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const breakWindowSchema = z
  .object({
    start: timeStringSchema,
    end: timeStringSchema,
  })
  .superRefine((value, ctx) => {
    const start = value.start.split(':').map(Number);
    const end = value.end.split(':').map(Number);
    const startTotal = start[0] * 60 + start[1];
    const endTotal = end[0] * 60 + end[1];

    if (endTotal <= startTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end'],
        message: 'O horario final do intervalo deve ser maior que o inicial.',
      });
    }
  });

const workingHourEntrySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    breaks: z.array(breakWindowSchema).max(5, 'Voce pode informar no maximo 5 intervalos.').optional().default([]),
    timeZone: optionalTimeZoneStringSchema,
  })
  .superRefine((value, ctx) => {
    const [startHour, startMinute] = value.startTime.split(':').map(Number);
    const [endHour, endMinute] = value.endTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    if (endTotal <= startTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'O horario final deve ser maior que o inicial.',
      });
    }

    (value.breaks ?? []).forEach((intervalo, index) => {
      const [intervalStartHour, intervalStartMinute] = intervalo.start.split(':').map(Number);
      const [intervalEndHour, intervalEndMinute] = intervalo.end.split(':').map(Number);
      const intervaloStartTotal = intervalStartHour * 60 + intervalStartMinute;
      const intervaloEndTotal = intervalEndHour * 60 + intervalEndMinute;

      if (intervaloStartTotal < startTotal || intervaloEndTotal > endTotal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['breaks', index],
          message: 'O intervalo deve estar dentro do horario informado.',
        });
      }
    });
  });

const metadataSchema = z
  .union([z.record(z.any()), z.array(z.any())])
  .optional()
  .transform((value) => (value === undefined ? null : value));

const isoDateSchema = z
  .string({
    invalid_type_error: 'Informe uma data/hora valida.',
  })
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Informe uma data/hora valida.',
  })
  .transform((value) => new Date(value));

const optionalIsoDateSchema = isoDateSchema.optional().transform((value) => (value instanceof Date ? value : null));

const nullableIdSchema = z
  .string({
    invalid_type_error: 'O identificador deve ser uma string.',
  })
  .trim()
  .min(1, 'Informe um identificador valido.')
  .max(128, 'O identificador deve ter no maximo 128 caracteres.')
  .transform((value) => stripHtml(value))
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']);
const appointmentSourceSchema = z.enum(['manual', 'online', 'imported', 'integration']);
const blockTypeSchema = z.enum(['manual', 'lunch', 'maintenance', 'holiday', 'other']);
const paymentMethodSchema = z.enum(['pix', 'cash', 'credit_card', 'debit_card', 'transfer', 'voucher', 'other']);
const paymentStatusSchema = z.enum(['pending', 'received', 'refunded', 'cancelled']);

export const createSchedulingCustomerSchema = z
  .object({
    name: nameSchema,
    email: optionalEmailFieldSchema,
    phone: optionalPhoneSchema,
    notes: optionalNoteSchema,
    tags: tagsSchema,
  })
  .strict();

export const createSchedulingServiceSchema = z
  .object({
    name: serviceNameSchema,
    description: optionalServiceDescriptionCreateSchema,
    durationMinutes: integerMinutesSchema,
    price: monetaryValueSchema.optional(),
    currency: currencySchema.default('BRL'),
    isActive: optionalBooleanSchema,
    bufferBefore: bufferMinutesSchema.optional(),
    bufferAfter: bufferMinutesSchema.optional(),
  })
  .strict();

const serviceIdSchema = z
  .string({
    required_error: 'Informe o identificador do servico.',
    invalid_type_error: 'O identificador do servico deve ser uma string.',
  })
  .trim()
  .min(1, 'Informe o identificador do servico.')
  .max(128, 'O identificador do servico deve ter no maximo 128 caracteres.')
  .superRefine(assertNoHtml('id'))
  .transform((value) => stripHtml(value));

const optionalPriceUpdateSchema = monetaryValueSchema
  .optional()
  .or(z.null())
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value === null ? null : value;
  });

export const serviceIdParamSchema = z
  .object({
    id: serviceIdSchema,
  })
  .strict();

export const createServiceSchema = createSchedulingServiceSchema;

export const updateServiceSchema = z
  .object({
    name: serviceNameSchema.optional(),
    description: optionalServiceDescriptionUpdateSchema,
    durationMinutes: integerMinutesSchema.optional(),
    price: optionalPriceUpdateSchema,
    currency: currencySchema.optional(),
    isActive: optionalBooleanSchema,
    bufferBefore: bufferMinutesSchema.optional(),
    bufferAfter: bufferMinutesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Informe pelo menos um campo para atualizar.',
  });

const workingHourCreateSchema = z
  .object({
    dayOfWeek: weekdayNumberSchema,
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    breakWindows: z.array(breakWindowSchema).max(5, 'Voce pode informar no maximo 5 intervalos.').optional(),
    timeZone: optionalTimeZoneStringSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const [startHour, startMinute] = value.startTime.split(':').map(Number);
    const [endHour, endMinute] = value.endTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    if (endTotal <= startTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'O horario final deve ser maior que o inicial.',
      });
    }
  });

const workingHourUpdateSchema = z
  .object({
    dayOfWeek: weekdayNumberSchema.optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    breakWindows: z.array(breakWindowSchema).max(5, 'Voce pode informar no maximo 5 intervalos.').optional(),
    timeZone: optionalTimeZoneStringSchema,
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Informe pelo menos um campo para atualizar.',
  })
  .superRefine((value, ctx) => {
    if (!value.startTime || !value.endTime) {
      return;
    }

    const [startHour, startMinute] = value.startTime.split(':').map(Number);
    const [endHour, endMinute] = value.endTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    if (endTotal <= startTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'O horario final deve ser maior que o inicial.',
      });
    }
  });

const workingHourIdSchema = z
  .string({
    required_error: 'Informe o identificador do horario.',
    invalid_type_error: 'O identificador do horario deve ser uma string.',
  })
  .trim()
  .min(1, 'Informe o identificador do horario.')
  .max(128, 'O identificador do horario deve ter no maximo 128 caracteres.')
  .superRefine(assertNoHtml('id'))
  .transform((value) => stripHtml(value));

const blockIdSchema = z
  .string({
    required_error: 'Informe o identificador do bloqueio.',
    invalid_type_error: 'O identificador do bloqueio deve ser uma string.',
  })
  .trim()
  .min(1, 'Informe o identificador do bloqueio.')
  .max(128, 'O identificador do bloqueio deve ter no maximo 128 caracteres.')
  .superRefine(assertNoHtml('id'))
  .transform((value) => stripHtml(value));

export const createWorkingHourSchema = workingHourCreateSchema;
export const updateWorkingHourSchema = workingHourUpdateSchema;
export const workingHourIdParamSchema = z.object({ id: workingHourIdSchema }).strict();
export const blockIdParamSchema = z.object({ id: blockIdSchema }).strict();

export const createSchedulingAppointmentSchema = z
  .object({
    customerId: nullableIdSchema,
    serviceId: nullableIdSchema,
    startsAt: isoDateSchema,
    endsAt: isoDateSchema,
    status: appointmentStatusSchema.default('pending'),
    price: monetaryValueSchema.optional().transform((value) => (value === undefined ? null : value)),
    currency: currencySchema.default('BRL'),
    source: appointmentSourceSchema.default('manual'),
    notes: optionalNoteSchema,
    metadata: metadataSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!(value.startsAt instanceof Date) || !(value.endsAt instanceof Date)) {
      return;
    }

    if (value.endsAt.getTime() <= value.startsAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'A data/hora final deve ser maior que a inicial.',
      });
    }
  });

export const createSchedulingBlockSchema = z
  .object({
    startsAt: isoDateSchema,
    endsAt: isoDateSchema,
    reason: optionalNoteSchema,
    type: blockTypeSchema.default('manual'),
    metadata: metadataSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!(value.startsAt instanceof Date) || !(value.endsAt instanceof Date)) {
      return;
    }

    if (value.endsAt.getTime() <= value.startsAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'A data/hora final deve ser maior que a inicial.',
      });
    }
  });

export const createSchedulingPaymentSchema = z
  .object({
    appointmentId: nullableIdSchema,
    customerId: nullableIdSchema,
    amount: monetaryValueSchema,
    currency: currencySchema.default('BRL'),
    method: paymentMethodSchema.default('pix'),
    status: paymentStatusSchema.default('received'),
    description: optionalNoteSchema,
    recordedAt: optionalIsoDateSchema,
    receivedAt: optionalIsoDateSchema,
    metadata: metadataSchema,
  })
  .strict();

export const completeOnboardingSchema = z
  .object({
    nomeDoNegocio: businessNameSchema,
    servicos: onboardingServicesSchema,
    horarios: onboardingHorariosSchema,
    politicaConfirmacao: politicaConfirmacaoSchema.default('manual'),
  })
  .strict();

export const requestMagicLinkSchema = z
  .object({
    email: emailSchema,
    redirectTo: optionalUrlSchema,
  })
  .strict();

export const verifyMagicLinkSchema = z
  .object({
    token: tokenSchema('token'),
  })
  .strict();

export const emptyObjectSchema = z.object({}).strict();

export function formatValidationError(zodError) {
  const { fieldErrors, formErrors } = zodError.flatten();
  const details = {};

  Object.entries(fieldErrors).forEach(([field, errors]) => {
    if (errors && errors.length > 0) {
      details[field] = errors;
    }
  });

  if (formErrors.length > 0) {
    details._form = formErrors;
  }

  const unexpectedFields = zodError.issues
    .filter((issue) => issue.code === 'unrecognized_keys')
    .flatMap((issue) => issue.keys ?? []);

  if (unexpectedFields.length > 0) {
    details._unexpected = unexpectedFields.map((field) => friendlyFieldLabel(field));
  }

  return {
    message: 'Não foi possível validar os dados informados. Verifique os campos e tente novamente.',
    details,
  };
}

export function createValidationMiddleware(schema, { target = 'body' } = {}) {
  return (req, res, next) => {
    const payload = (() => {
      switch (target) {
        case 'params':
          return req.params ?? {};
        case 'query':
          return req.query ?? {};
        case 'body':
        default:
          return req.body ?? {};
      }
    })();

    const result = schema.safeParse(payload);

    if (!result.success) {
      const formatted = formatValidationError(result.error);
      return res.status(400).json(formatted);
    }

    if (!req.validated) {
      req.validated = {};
    }

    req.validated[target] = result.data;

    if (target === 'body') {
      req.body = result.data;
    } else if (target === 'query') {
      req.query = result.data;
    } else if (target === 'params') {
      req.params = result.data;
    }

    return next();
  };
}

export function validate(schema, payload) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    const formatted = formatValidationError(result.error);
    const error = new Error(formatted.message);
    error.code = 'VALIDATION_ERROR';
    error.details = formatted.details;
    throw error;
  }

  return result.data;
}
