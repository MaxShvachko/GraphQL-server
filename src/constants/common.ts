export const __prod__ =  process.env.NODE_ENV === 'production';

export const FRONT_HOST = process.env.FRONT_HOST || 'http://localhost:3000';

export const FORGOT_PASSWORD_PREFIX = 'forgot-password:';

export const THREE_DAYS = 1000 * 60 * 60 * 24 * 3;