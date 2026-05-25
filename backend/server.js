require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { assertSupabaseConfig } = require('./config/supabase');

const app = express();
const PORT = String(process.env.PORT || '5000').trim();

const allowedOrigins = [
  String(process.env.FRONTEND_URL || '').trim(),
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Bloqueado pelo CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'JScar API rodando com Supabase' });
});

app.use((err, _req, res, _next) => {
  console.error('Erro:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Rota nao encontrada' });
});

const startServer = async () => {
  try {
    assertSupabaseConfig();
    app.listen(PORT, () => {
      console.log(`JScar API rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(error.message || 'Falha ao iniciar o servidor.');
    process.exit(1);
  }
};

startServer();
