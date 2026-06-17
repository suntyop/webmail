# Webmail

Un client webmail moderne, épuré et **responsive** (ordinateur + téléphone),
conçu pour se connecter à votre propre serveur mail via **IMAP** (lecture) et
**SMTP** (envoi).

Fonctionnalités :

- 🔐 Connexion par page de login (identifiants jamais stockés en dur, session côté serveur)
- 📥 Lecture des mails, dossiers (réception, envoyés, brouillons, corbeille…)
- ✍️ Rédaction, **réponse**, **réponse à tous**, **transfert**
- 📎 Lecture **et** envoi de pièces jointes (images inline affichées)
- 🔍 Recherche, pagination, marquage lu/non-lu et favoris
- 🌗 Thème clair/sombre automatique, interface optimisée mobile

## Architecture

```
webmail/
├── server/   → API Node.js / Express (imapflow + nodemailer + mailparser)
└── client/   → Interface React (Vite + Tailwind CSS)
```

Le navigateur ne pouvant pas dialoguer directement en IMAP/SMTP, le **backend**
fait le pont. Les identifiants saisis à la connexion sont conservés uniquement
en mémoire serveur, associés à un cookie de session `httpOnly`.

## Installation

```bash
# À la racine du projet
npm run install:all
```

## Configuration

Copiez l'exemple et renseignez votre serveur mail :

```bash
cp server/.env.example server/.env
```

Éditez `server/.env` :

```ini
IMAP_HOST=mail.mondomaine.com
IMAP_PORT=993
IMAP_SECURE=true

SMTP_HOST=mail.mondomaine.com
SMTP_PORT=465
SMTP_SECURE=true

SESSION_SECRET=une-longue-chaine-aleatoire
```

> ℹ️ Réglages courants : IMAP en `993` (SSL/TLS), SMTP en `465` (SSL) ou `587`
> (STARTTLS → mettre `SMTP_SECURE=false`).

## Démarrage en développement

```bash
npm run dev
```

- Frontend : http://localhost:5173
- Backend : http://localhost:3001

Le frontend proxifie automatiquement `/api` vers le backend.

## Production

```bash
npm run build      # compile le frontend dans client/dist
npm start          # le serveur sert l'API + le frontend compilé
```

Le serveur Express sert alors l'interface et l'API sur le même port
(`PORT`, par défaut 3001). Placez-le derrière un reverse proxy HTTPS
(Nginx, Caddy…) pour une mise en production.

## Sécurité

- Les identifiants ne sont jamais renvoyés au navigateur.
- Le HTML des emails est nettoyé (DOMPurify) et affiché dans une `iframe`
  isolée (`sandbox`) pour neutraliser tout script malveillant.
- Activez impérativement HTTPS en production et définissez un
  `SESSION_SECRET` fort.
