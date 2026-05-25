const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const CONFIG_ERROR_MESSAGE = 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente no .env';

function normalizeEnvValue(value) {
  return String(value || '').trim();
}

const SUPABASE_URL = normalizeEnvValue(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_BUCKET = normalizeEnvValue(process.env.SUPABASE_BUCKET) || 'vehicles';

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_BUCKET = SUPABASE_BUCKET;

function getSupabaseDiagnostics() {
  return {
    hasUrl: Boolean(SUPABASE_URL),
    urlLooksValid: isValidSupabaseUrl(SUPABASE_URL),
    hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    bucket: SUPABASE_BUCKET,
  };
}

function isValidSupabaseUrl(url) {
  if (!url) return false;
  if (!url.startsWith('https://')) return false;
  if (url.includes('/rest/v1')) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co') && parsed.pathname === '/';
  } catch {
    return false;
  }
}

function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(CONFIG_ERROR_MESSAGE);
  }

  if (!isValidSupabaseUrl(SUPABASE_URL)) {
    throw new Error('SUPABASE_URL invalida. Use a Project URL no formato https://SEU_PROJETO.supabase.co, sem /rest/v1');
  }
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && isValidSupabaseUrl(SUPABASE_URL)
  ? createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
  : null;

module.exports = {
  supabase,
  assertSupabaseConfig,
  getSupabaseDiagnostics,
  isValidSupabaseUrl,
  CONFIG_ERROR_MESSAGE,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_BUCKET,
};
