require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const {
  supabase,
  assertSupabaseConfig,
  getSupabaseDiagnostics,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = require('./config/supabase');

function printDiagnostics() {
  const diagnostics = getSupabaseDiagnostics();

  console.log(`SUPABASE_URL encontrada: ${diagnostics.hasUrl ? 'sim' : 'nao'}`);
  console.log(`SUPABASE_URL parece valida: ${diagnostics.urlLooksValid ? 'sim' : 'nao'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY encontrada: ${diagnostics.hasServiceRoleKey ? 'sim' : 'nao'}`);
  console.log(`SUPABASE_BUCKET: ${diagnostics.bucket}`);
}

function formatCause(cause) {
  if (!cause) return null;
  if (typeof cause === 'string') return cause;

  const parts = [];
  if (cause.name) parts.push(`name=${cause.name}`);
  if (cause.code) parts.push(`code=${cause.code}`);
  if (cause.errno) parts.push(`errno=${cause.errno}`);
  if (cause.syscall) parts.push(`syscall=${cause.syscall}`);
  if (cause.hostname) parts.push(`hostname=${cause.hostname}`);
  if (cause.message) parts.push(`message=${cause.message}`);

  return parts.length ? parts.join(', ') : JSON.stringify(cause);
}

async function testSupabase() {
  printDiagnostics();

  try {
    assertSupabaseConfig();

    if (!supabase) {
      throw new Error('Cliente Supabase nao foi inicializado.');
    }

    const { error } = await supabase
      .from('settings')
      .select('id')
      .limit(1);

    if (error) throw error;

    console.log('Supabase conectado com sucesso');
  } catch (error) {
    console.error(`error.name: ${error.name || error.constructor?.name || 'Error'}`);
    console.error(`error.message: ${error.message}`);

    const cause = formatCause(error.cause);
    if (cause) console.error(`error.cause: ${cause}`);

    if (String(error.message || '').includes('fetch failed')) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/settings?select=id&limit=1`, {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
      } catch (fetchError) {
        console.error(`fetch.error.name: ${fetchError.name || fetchError.constructor?.name || 'Error'}`);
        console.error(`fetch.error.message: ${fetchError.message}`);
        const fetchCause = formatCause(fetchError.cause);
        if (fetchCause) console.error(`fetch.error.cause: ${fetchCause}`);
      }
    }

    process.exit(1);
  }
}

testSupabase();
