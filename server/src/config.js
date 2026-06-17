import dotenv from 'dotenv';

dotenv.config();

const bool = (v, fallback = false) =>
  v === undefined ? fallback : /^(1|true|yes|on)$/i.test(String(v));

export const config = {
  port: Number(process.env.PORT || 3001),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
  sessionTtlMs: Number(process.env.SESSION_TTL_MINUTES || 120) * 60 * 1000,

  imap: {
    host: process.env.IMAP_HOST || 'localhost',
    port: Number(process.env.IMAP_PORT || 993),
    secure: bool(process.env.IMAP_SECURE, true),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 465),
    secure: bool(process.env.SMTP_SECURE, true),
  },

  isProd: process.env.NODE_ENV === 'production',
};
