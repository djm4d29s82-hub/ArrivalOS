# ArrivalOS by NeuLand

Human Arrival Platform — Marketing-Site + 4 Portale (Admin / Company / Greeter / Talent).

## Lokal entwickeln

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Produktion bauen

```bash
npm run build      # erzeugt dist/
npm run preview    # lokal testen
```

## Deploy

### Vercel (empfohlen)

1. Repo in Vercel importieren — Framework wird automatisch erkannt (siehe `vercel.json`).
2. Environment-Variablen aus `.env.example` setzen (Project Settings → Environment Variables).
3. Domain verbinden (z. B. `arrivalos.de`).
4. Push → automatischer Deploy.

### Netlify

1. Repo verbinden — `netlify.toml` wird erkannt.
2. Environment-Variablen setzen.
3. Domain verbinden.

## Environment-Variablen

Siehe [.env.example](./.env.example). Wichtigste:

| Variable                          | Zweck                                                              |
| --------------------------------- | ------------------------------------------------------------------ |
| `VITE_COMPANY_*`                  | Firmenstammdaten (Impressum, Footer, Kontakt)                      |
| `VITE_LEAD_WEBHOOK_URL`           | Kontaktformular → Zapier/Make/HubSpot/CRM                          |
| `VITE_PLAUSIBLE_DOMAIN`           | Cookieless Analytics (Plausible)                                   |
| `VITE_SITE_URL`                   | Kanonische URL für SEO/OG-Tags                                     |

## PWA

Die Site ist als Progressive Web App installierbar:

- **Android/Chrome/Edge**: Install-Prompt wird automatisch via `PWAInstaller`-Komponente angezeigt.
- **iOS Safari**: „Teilen" → „Zum Home-Bildschirm" (Hinweis-Banner blendet sich nach 8 s ein).
- Service Worker (`public/sw.js`) cached die App-Shell für Offline-Zugriff.

## Architektur

```
src/
├── api/base44Client.js          # Mock-Backend (localStorage) — Entities + CRUD
├── components/
│   ├── landing/                 # 18 Landing-Sektionen
│   ├── layout/                  # Navbar, Footer, DashboardLayout
│   └── ui/                      # Toaster etc.
├── lib/
│   ├── siteConfig.js            # Firmen-/Feature-Config (env-driven)
│   ├── AuthContext.jsx          # Mock-Auth + Rollen
│   ├── PlausibleLoader.jsx      # Analytics opt-in
│   ├── PWAInstaller.jsx         # Install-Prompt + SW-Registration
│   └── useDocumentMeta.js       # Per-Page <title>/<meta>
└── pages/
    ├── Landing.jsx
    ├── StaticPage.jsx           # /impressum, /datenschutz, /agb, /karriere, /presse
    ├── admin/                   # 12 Pages
    ├── company/                 # 7 Pages
    ├── greeter/                 # 7 Pages
    └── talent/                  # 5 Pages
```

## Vor dem Produktivstart (Checkliste)

- [ ] Rechtstexte vom Anwalt prüfen lassen (Impressum, Datenschutz, AGB)
- [ ] Echte Firmenstammdaten in `.env` eintragen
- [ ] Testimonials + Kundenlogos einsetzen
- [ ] Domain registrieren + auf Vercel/Netlify mappen
- [ ] Plausible-Account anlegen + Domain in `.env` setzen
- [ ] Lead-Webhook in CRM (Zapier/HubSpot) verbinden
- [ ] AVV mit Pilotkunden unterschreiben
- [ ] Echtes Backend (z. B. Supabase) statt localStorage — `src/api/base44Client.js` ersetzen
