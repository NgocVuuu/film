# PChill Streaming Platform - AI Engineering Documentation

This document serves as the primary context file for any AI Coding Agent (Cursor, Deepmind, Claude, etc.) working on the PChill codebase in the future. 
**DO NOT read individual source files line-by-line before reading this.**

## 1. Tech Stack Overview
- **Frontend**: Next.js 14/15 (App Router), React, Tailwind CSS, Lucide Icons, HLS.js. (Located in `./client`)
- **Backend**: Node.js, Express.js, Mongoose/MongoDB, Socket.io, Node-Cache. (Located in `./server`)
- **Infrastructure**: PM2 (Cluster mode, 2 instances), Nginx (Optional reverse proxy).

## 2. Core Frontend Components (`./client/src/components`)
- **`VideoPlayer.tsx`**: (CRITICAL COMPLEXITY)
  - Uses `hls.js` with aggressive memory management (`maxBufferLength: 60`, `maxMaxBufferLength: 120`).
  - **4G Resilience**: Implements Exponential Backoff (`networkRetryCount`) for `Hls.ErrorTypes.NETWORK_ERROR` to survive spotty mobile connections.
  - **iOS Background Wakeup**: Listens to `visibilitychange`. Calls `hls.recoverMediaError()` and `hls.startLoad()` when a suspended tab is revived.
  - **Scrubbing/Seeking**: Seeks are throttled (`handleSeekEnd`) to avoid lagging out the HLS stream while dragging the progress bar.
  - **Input Hotkeys**: Space, Left/Right Arrows, F, M, K. Events are ignored if `event.target` is an `<input>` or `<textarea>`.

- **`AdInterstitial.tsx`**:
  - Sandboxed ad script injector. Uses an `<iframe>` with `sandbox="allow-scripts allow-popups allow-same-origin"` to inject Adsterra code. **Never allow top navigation** to prevent redirect click-hijacking.

- **`MovieCarousel.tsx` & `QuickViewContext.tsx`**:
  - Touch/Hold uses custom hook `useLongPress.ts`.
  - `useLongPress.ts` has built-in `onMouseMove` / `onTouchMove` cancellation (>10px threshold) to prevent swiping from accidentally triggering long-press QuickView modals.
  - `QuickViewContext` automatically closes on `usePathname()` changes to combat BfCache sticky state issues.

## 3. Core Backend Controllers (`./server/controllers`)
- **`progressController.js`**: (HIGH TRAFFIC)
  - **Memory Caching**: Uses `node-cache` (RAM) to throttle DB writes.
  - Limits `trackView` (anonymous users) and `saveProgress` (View logging + Last Login updates) duplicate queries.
  - **Logic**: If an IP or User has recorded a view within the last 1-24 hours, the Node Cache intercepts the request and safely ignores MongoDB `$inc` and `ViewLog.create()` actions.

- **`movieController.js`**:
  - `getHomepage`: Uses `node-cache` for 10 minutes (`stdTTL: 600`) to completely eliminate MongoDB congestion for the heaviest endpoint on the API.

- **`server.js`**:
  - Morgan access logging is deliberately disabled for `/api/progress/track-view` and `/health` to keep the PM2 terminal clean.

## 4. Run Instructions
- Navigate to `./server`: `npm run dev` (or `pm2 start ecosystem.config.cjs --env production`)
- Navigate to `./client`: `npm run dev` (or `npm run build && npm start`)

## 5. Development Constraints
- **NEVER** edit `VideoPlayer.tsx` without preserving the Exponential Backoff and Tab Suspension recovery logic.
- **NEVER** inject Ad scripts directly into the DOM (`layout.tsx`). Always use sandbox iframes.
- Always implement `node-cache` for high loop-rate components like Views, Searches, or Saves before querying MongoDB on the backend.
