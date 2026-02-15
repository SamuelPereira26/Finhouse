export const CONFIG = {
  SPREADSHEET_ID: process.env.SPREADSHEET_ID ?? 'LEGACY_SPREADSHEET_ID',
  DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID ?? 'LEGACY_DRIVE_FOLDER_ID',
  SHEETS: {
    ACCOUNTS: 'Accounts',
    IMPORTS: 'Imports',
    MASTER: 'Master',
    RULES: 'Rules',
    BUDGETS: 'Budgets',
    HEALTH: 'Health'
  }
} as const;

export const ACCOUNTS = {
  BBVA: {
    id: 'BBVA',
    alias: 'BBVA',
    last4: '0000',
    type: 'BANK',
    owner: 'JOINT'
  },
  REVOLUT_JOINT: {
    id: 'REVOLUT_JOINT',
    alias: 'REVOLUT_JOINT',
    last4: '1111',
    type: 'BANK',
    owner: 'JOINT'
  },
  REVOLUT_SAMUEL: {
    id: 'REVOLUT_SAMUEL',
    alias: 'REVOLUT_SAMUEL',
    last4: '2222',
    type: 'BANK',
    owner: 'SAMUEL'
  },
  REVOLUT_ANDREA: {
    id: 'REVOLUT_ANDREA',
    alias: 'REVOLUT_ANDREA',
    last4: '3333',
    type: 'BANK',
    owner: 'ANDREA'
  },
  CASH: {
    id: 'CASH',
    alias: 'CASH',
    last4: 'CASH',
    type: 'CASH',
    owner: 'JOINT'
  }
} as const;

export const TELEGRAM = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? '',
  CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? '',
  API_URL: 'https://api.telegram.org'
} as const;

export const CATEGORIES = {
  SUMINISTROS: {
    name: 'Suministros',
    subcats: ['Luz', 'Agua', 'Gas', 'Internet', 'Telefonia'],
    isLifeExpense: true,
    requiresNote: false
  },
  CASA: {
    name: 'Casa',
    subcats: ['Alquiler', 'Hipoteca', 'Mantenimiento', 'Comunidad', 'Hogar'],
    isLifeExpense: true,
    requiresNote: false
  },
  TRANSPORTE: {
    name: 'Transporte',
    subcats: ['Gasolina', 'Parking', 'Peajes', 'Transporte publico', 'Taxi'],
    isLifeExpense: true,
    requiresNote: false
  },
  SUPERMERCADO: {
    name: 'Supermercado',
    subcats: ['Mercadona', 'Lidl', 'Carrefour', 'Aldi', 'Dia'],
    isLifeExpense: true,
    requiresNote: false
  },
  OCIO: {
    name: 'Ocio',
    subcats: ['Restaurantes', 'Viajes', 'Eventos', 'Regalos', 'Hobbies'],
    isLifeExpense: false,
    requiresNote: false
  },
  SUSCRIPCIONES: {
    name: 'Suscripciones',
    subcats: ['Spotify', 'ChatGPT', 'BasicFit', 'Netflix', 'Otros servicios'],
    isLifeExpense: false,
    requiresNote: false
  },
  CUIDADO_SALUD: {
    name: 'Cuidado y salud',
    subcats: ['Farmacia', 'Medico', 'Seguro salud', 'Gimnasio', 'Cuidado personal'],
    isLifeExpense: true,
    requiresNote: false
  },
  OTROS: {
    name: 'Otros',
    subcats: ['No clasificado', 'Imprevistos', 'Varios'],
    isLifeExpense: false,
    requiresNote: true
  },
  DONACIONES: {
    name: 'Donaciones',
    subcats: ['Iglesia', 'ONG', 'Ayuda familiar'],
    isLifeExpense: false,
    requiresNote: false
  },
  APORTACIONES: {
    name: 'Aportaciones',
    subcats: ['Ahorro', 'Inversion', 'Fondo emergencia'],
    isLifeExpense: false,
    requiresNote: false
  },
  INGRESOS: {
    name: 'Ingresos',
    subcats: ['Nomina', 'Freelance', 'Reembolso', 'Venta', 'Otros ingresos'],
    isLifeExpense: false,
    requiresNote: false
  }
} as const;

export const FIXED_SUBSCRIPTION_RULES = [
  {
    id: 'spotify',
    matchText: 'SPOTIFY',
    matchType: 'INCLUDES',
    dayOfMonth: 1,
    macro: 'Suscripciones',
    subcat: 'Spotify',
    confidence: 0.98
  },
  {
    id: 'chatgpt',
    matchText: 'CHATGPT',
    matchType: 'INCLUDES',
    dayOfMonth: 1,
    macro: 'Suscripciones',
    subcat: 'ChatGPT',
    confidence: 0.98
  },
  {
    id: 'basicfit',
    matchText: 'BASIC-FIT',
    matchType: 'INCLUDES',
    dayOfMonth: 1,
    macro: 'Cuidado y salud',
    subcat: 'Gimnasio',
    confidence: 0.95
  }
] as const;

export const CONFIDENCE_THRESHOLDS = {
  AUTO_OK: 0.9,
  SUGERIDO_MIN: 0.65,
  NEEDS_REVIEW: 0.0
} as const;

export const COLUMN_SIGNATURES = {
  BBVA: {
    required: ['Fecha', 'Concepto', 'Importe'],
    optional: ['Saldo', 'Divisa']
  },
  REVOLUT: {
    required: ['Completed Date', 'Amount', 'Description'],
    optional: ['Type', 'Currency', 'State', 'Reference']
  }
} as const;

export const HEALTH_CONFIG = {
  MAX_DATE_FUTURE_DAYS: 3,
  MAX_DATE_PAST_MONTHS: 24,
  DUPLICATE_WINDOW_DAYS: 120,
  TRANSFER_MATCH_DAYS: 3
} as const;

export const REVIEW_CONFIG = {
  REVIEW_DAYS: [1, 8, 15, 22, 28],
  TRANSFER_REMINDER_DAY: 5,
  TITHE_REMINDER: 10
} as const;

export const AUTHORIZED_EMAILS = (
  process.env.AUTHORIZED_EMAILS ?? ''
)
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);

export const MACRO_ORDER = [
  'Suministros',
  'Casa',
  'Transporte',
  'Supermercado',
  'Ocio',
  'Suscripciones',
  'Cuidado y salud',
  'Otros',
  'Donaciones',
  'Aportaciones',
  'Ingresos'
] as const;
