# CodeLoom web

Browser client for the cloud controller. Sign in with GitHub, register a
repository, start a sandbox session, and speak the engine protocol over a
WebSocket.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`. The controller's
`FRONTEND_ORIGIN` must match this app (`http://localhost:3000`).
