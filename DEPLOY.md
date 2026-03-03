# Deployment Readiness (GitHub -> Railway)

This project is deployment-ready by repository review only. No live deployment should be executed during verification.

## Build and run contract

1. Install dependencies:

```sh
npm ci
```

2. Build production assets:

```sh
npm run build
```

3. Preview the static build:

```sh
npm run preview -- --host 0.0.0.0 --port 4173
```

## Railway wiring

- `railway.json` sets `npm ci && npm run build` as build command.
- Start command serves static output via Vite preview.
- Required runtime variable for live model calls: `VITE_GEMINI_API_KEY` (optional if API key entered in app settings).

## Review checklist

- [ ] `package.json` build and preview scripts exist.
- [ ] `railway.json` references build and start commands coherently.
- [ ] Build output is generated in `dist/`.
- [ ] No deployment commands are executed during DoD verification.
