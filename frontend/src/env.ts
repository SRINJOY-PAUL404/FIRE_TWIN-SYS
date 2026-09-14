/**
 * Centralised environment helpers.
 *
 * Every component that needs the API or WebSocket URL should import from here
 * instead of constructing URLs inline. This ensures a single place to update
 * when deploying to Vercel + Render (or any other host).
 */

/** REST API base URL (no trailing slash). */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname || 'localhost'}:8000`;

/**
 * WebSocket URL derived from the API base.
 *   http://…  → ws://…/ws
 *   https://… → wss://…/ws
 */
export const WS_URL = API_BASE_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://') + '/ws';
