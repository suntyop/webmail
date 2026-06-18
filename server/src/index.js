import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { config } from './config.js';
import { requireAuth } from './middleware.js';
import authRoutes from './routes/auth.js';
import mailRoutes from './routes/mail.js';
import scheduleRoutes from './routes/schedule.js';
import { startScheduler } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser(config.sessionSecret));

// Santé
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Authentification
app.use('/api/auth', authRoutes);

// API mail + programmation (protégées)
app.use('/api', requireAuth, mailRoutes);
app.use('/api', requireAuth, scheduleRoutes);

// Sert le frontend compilé en production (client/dist), si présent.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Gestion centralisée des erreurs.
app.use((err, req, res, next) => {
  console.error('[erreur]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

app.listen(config.port, () => {
  console.log(`Webmail server à l'écoute sur http://localhost:${config.port}`);
  startScheduler();
});
