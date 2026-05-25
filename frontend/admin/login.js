const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = 'jscar_admin_token';

/* Helpers */
function setLoading(btn, on) {
  btn.disabled = on;
  btn.querySelector('.btn-text').style.display    = on ? 'none' : '';
  btn.querySelector('.btn-spinner').style.display = on ? '' : 'none';
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg || '';
  el.style.display = msg ? '' : 'none';
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function showOnly(formId) {
  ['loadingState', 'loginForm', 'setupForm'].forEach(id => {
    document.getElementById(id).style.display = id === formId ? '' : 'none';
  });
}

/* Toggle password visibility */
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.querySelector('i').className = isText ? 'bi bi-eye' : 'bi bi-eye-slash';
  });
});

/* Check if admin exists */
async function init() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { location.href = 'admin.html'; return; }
      localStorage.removeItem(TOKEN_KEY);
    }

    const res  = await fetch(`${API_URL}/auth/setup`);
    const data = await readJson(res);

    if (!res.ok) {
      throw new Error(data.message || 'Não foi possível verificar o cadastro admin.');
    }

    showOnly(data.hasAdmin ? 'loginForm' : 'setupForm');
  } catch {
    document.getElementById('loadingState').innerHTML =
      '<i class="bi bi-exclamation-circle"></i> Não foi possível conectar ao servidor.';
  }
}

/* Setup (first admin) */
document.getElementById('setupBtn').addEventListener('click', async () => {
  const btn      = document.getElementById('setupBtn');
  const nome     = document.getElementById('setupNome').value.trim();
  const email    = document.getElementById('setupEmail').value.trim();
  const password = document.getElementById('setupPassword').value;
  const confirm  = document.getElementById('setupConfirmPassword').value;

  showError('setupError', '');
  if (!email || !password) { showError('setupError', 'Preencha email e senha.'); return; }
  if (password !== confirm) { showError('setupError', 'As senhas não coincidem.'); return; }

  setLoading(btn, true);
  try {
    const res  = await fetch(`${API_URL}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, password }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      showError('setupError', data.message || 'Não foi possível criar a conta admin.');
      if (data.message === 'A conta admin já foi criada. Não é possível criar outro administrador.') {
        showOnly('loginForm');
        showError('loginError', data.message);
      }
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    location.href = 'admin.html';
  } catch {
    showError('setupError', 'Erro de conexão com o servidor.');
  } finally {
    setLoading(btn, false);
  }
});

/* Login */
document.getElementById('loginBtn').addEventListener('click', async () => {
  const btn      = document.getElementById('loginBtn');
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  showError('loginError', '');
  if (!email || !password) { showError('loginError', 'Preencha email e senha.'); return; }

  setLoading(btn, true);
  try {
    const res  = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    if (!res.ok) { showError('loginError', data.message || 'Não foi possível entrar.'); return; }
    localStorage.setItem(TOKEN_KEY, data.token);
    location.href = 'admin.html';
  } catch {
    showError('loginError', 'Erro de conexão com o servidor.');
  } finally {
    setLoading(btn, false);
  }
});

/* Enter key support */
['loginEmail', 'loginPassword'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
});
['setupEmail', 'setupPassword', 'setupConfirmPassword'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('setupBtn').click();
  });
});

init();
