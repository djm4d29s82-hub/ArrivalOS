/**
 * ENV Guard — validates environment at app boot.
 *
 * Three layers of protection:
 *   1. Backend mode lock  — production must use 'supabase', never 'localStorage'
 *   2. Safety checksum    — VITE_BACKEND_MODE must match actual credential presence
 *   3. URL sanity check   — Supabase URL must be HTTPS in production
 *
 * Call validateEnv() once in main.jsx before mounting the React tree.
 */

const ALLOWED_BACKEND_MODES = ['supabase', 'localStorage'] as const;
type BackendMode = typeof ALLOWED_BACKEND_MODES[number];

const IS_PROD =
  import.meta.env.PROD ||
  import.meta.env.VITE_ENV === 'production' ||
  import.meta.env.MODE === 'production';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const USE_SUPABASE  = !!(SUPABASE_URL && SUPABASE_KEY);

// Explicit override via VITE_BACKEND_MODE — if set, it must match reality.
const DECLARED_MODE = import.meta.env.VITE_BACKEND_MODE as string | undefined;

export const BACKEND_MODE: BackendMode = USE_SUPABASE ? 'supabase' : 'localStorage';

export class EnvError extends Error {
  constructor(message: string) {
    super(`[ArrivalOS ENV] ${message}`);
    this.name = 'EnvError';
  }
}

/**
 * Validates that the runtime environment is safe to start.
 * Throws EnvError with a clear, actionable message if not.
 */
export function validateEnv(): void {
  // ── Layer 1: mode must be a known value ──────────────────────────────────
  if (!ALLOWED_BACKEND_MODES.includes(BACKEND_MODE)) {
    throw new EnvError(
      `Unknown backend mode: '${BACKEND_MODE}'. ` +
      `Allowed values: ${ALLOWED_BACKEND_MODES.join(', ')}.`
    );
  }

  // ── Layer 2: production must use Supabase ────────────────────────────────
  if (IS_PROD && !USE_SUPABASE) {
    throw new EnvError(
      'Production mode detected but VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are missing. ' +
      'The app must never run on localStorage in production. ' +
      'Set the required environment variables before deploying.'
    );
  }

  // ── Layer 3: safety checksum — VITE_BACKEND_MODE must match reality ───────
  // If a deploy pipeline sets VITE_BACKEND_MODE='supabase' but forgets to
  // also set the credentials, this catches the mismatch at boot time.
  if (DECLARED_MODE && DECLARED_MODE !== BACKEND_MODE) {
    throw new EnvError(
      `VITE_BACKEND_MODE is set to '${DECLARED_MODE}' but the detected mode is '${BACKEND_MODE}'. ` +
      `Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.`
    );
  }

  // ── Layer 4: Supabase URL must use HTTPS ─────────────────────────────────
  if (IS_PROD && SUPABASE_URL && !SUPABASE_URL.startsWith('https://')) {
    throw new EnvError(
      `VITE_SUPABASE_URL must use HTTPS in production. Got: ${SUPABASE_URL}`
    );
  }
}

/**
 * Returns a snapshot of the current env for structured logging.
 * Never throws — safe to call from error boundaries.
 */
export function getEnvSummary(): Record<string, string | boolean> {
  return {
    mode: import.meta.env.MODE,
    backendMode: BACKEND_MODE,
    isProd: IS_PROD,
    useSupabase: USE_SUPABASE,
    supabaseUrl: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 30)}…` : '(not set)',
    declaredMode: DECLARED_MODE ?? '(not set)',
  };
}
