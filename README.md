# fx-demo

Camera-driven realtime visual FX playground. A small gallery of webcam effects built on **WebGPU / WGSL**, **p5.js** and **MediaPipe**, served as a fully static (SSG) [Next.js](https://nextjs.org/) App Router site deployed to **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare).

🔗 **Live:** https://fx-demo.napochaan.com

## Effects

| #   | Effect           | What it does                                                                                                                  |
| --- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Liquid Mirror** | A WebGPU/WGSL stable-fluids solver turns your webcam into a liquid mirror — drag the pointer to stir silky vortices.        |
| 02  | **JPEG Glitch**   | A real codec on the GPU (YCbCr → 8×8 DCT → quantization). Live-control the coefficient corruption to break the image apart. |
| 03  | **Trace**         | p5.js × WebGPU body-outline tracing — your silhouette becomes a monochrome wireframe layered with afterimages and a HUD.   |

> All effects run entirely client-side; camera frames never leave the browser.

## Tech Stack

- **Framework:** Next.js 15 (App Router, RSC) + React 19
- **Rendering:** WebGPU / WGSL, p5.js, `@mediapipe/tasks-vision`
- **Styling:** Panda CSS + react-aria-components (WCAG 2.1 AA)
- **Deploy:** Next.js build → OpenNext (`@opennextjs/cloudflare`) → Wrangler (Cloudflare Workers), static (SSG) only
- **Tooling:** pnpm, oxlint + oxfmt, `@typescript/native-preview` (tsgo), Vitest

## Development

```bash
pnpm install
pnpm dev          # start the dev server

pnpm lint         # oxlint + oxfmt --check
pnpm typecheck    # tsgo --noEmit
pnpm test         # vitest
```

## Deploy

```bash
pnpm preview      # build + preview the Worker locally
pnpm deploy       # build + deploy to Cloudflare Workers
```

The custom domain `fx-demo.napochaan.com` is configured in `wrangler.toml` (`[[routes]]` with `custom_domain = true`); Cloudflare provisions the DNS record and TLS certificate automatically.
