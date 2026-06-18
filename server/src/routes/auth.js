import { Router } from 'express';
import { config } from '../config.js';
import { verifyCredentials } from '../imap.js';
import { createSession, destroySession, getSession } from '../sessions.js';
import { asyncHandler, COOKIE_NAME } from '../middleware.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: config.sessionTtlMs,
};

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
      await verifyCredentials({ email, password });
    } catch (err) {
      return res
        .status(401)
        .json({ error: "Échec de connexion : identifiants ou serveur invalides" });
    }

    const token = createSession({ email, password });
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ email });
  })
);

router.post('/logout', (req, res) => {
  const token = req.signedCookies?.[COOKIE_NAME];
  if (token) destroySession(token);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.signedCookies?.[COOKIE_NAME];
  const session = getSession(token);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });
  res.json({ email: session.credentials.email });
});

export default router;
