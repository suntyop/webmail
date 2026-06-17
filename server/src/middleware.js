import { getSession } from './sessions.js';

export const COOKIE_NAME = 'wm_session';

/**
 * Middleware: exige une session valide. Attache `req.session` et `req.token`.
 */
export function requireAuth(req, res, next) {
  const token = req.signedCookies?.[COOKIE_NAME] || req.cookies?.[COOKIE_NAME];
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  req.session = session;
  req.token = token;
  next();
}

/**
 * Wrapper pour les handlers async afin de propager les erreurs proprement.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
