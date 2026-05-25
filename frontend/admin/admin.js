/* =====================================================
   JScar — Admin Panel JS
   ===================================================== */

const API_URL = "http://localhost:5000/api";
const API_ORIGIN = API_URL.replace(/\/api$/, '');
const TOKEN_KEY = 'jscar_admin_token';

/* ══════════════════════════════════════════
   Utils
══════════════════════════════════════════ */
function getToken() { return localStorage.getItem(TOKEN_KEY); }

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  location.href = 'login.html';
}

async function api(path, opts = {}) {
  const headers = { ...authHeaders() };
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts = { ...opts, body: JSON.stringify(opts.json) };
    delete opts.json;
  }
  const res = await fetch(API_URL + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (res.status === 401) { logout(); return null; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
  return data;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function imageUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
}

function vehicleId(vehicle) {
  return vehicle?.id || vehicle?._id || '';
}

/* ══════════════════════════════════════════
   Toast
══════════════════════════════════════════ */
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'}"></i><span>${escHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function showToast(msg, type = 'success') {
  toast(msg, type);
}

/* ══════════════════════════════════════════
   Confirm Modal
══════════════════════════════════════════ */
function confirmDialog(msg, title = 'Confirmar exclusão') {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmMessage').textContent = msg;
    overlay.style.display = 'flex';

    const yes = document.getElementById('confirmYes');
    const no  = document.getElementById('confirmNo');
    const cls = document.getElementById('confirmClose');

    function done(val) {
      overlay.style.display = 'none';
      yes.replaceWith(yes.cloneNode(true));
      no.replaceWith(no.cloneNode(true));
      cls.replaceWith(cls.cloneNode(true));
      resolve(val);
    }

    document.getElementById('confirmYes').addEventListener('click',   () => done(true),  { once: true });
    document.getElementById('confirmNo').addEventListener('click',    () => done(false), { once: true });
    document.getElementById('confirmClose').addEventListener('click', () => done(false), { once: true });
  });
}

/* ══════════════════════════════════════════
   Navigation
══════════════════════════════════════════ */
const SECTION_TITLES = {
  dashboard: 'Dashboard',
  veiculos:  'Veículos',
  categorias: 'Categorias',
  config:    'Configurações',
};

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-link[data-section]').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });
  const sec = document.getElementById(`sec-${name}`);
  if (sec) sec.classList.add('active');
  document.getElementById('topbarTitle').textContent = SECTION_TITLES[name] || name;
  closeSidebar();
}

function setupNavigation() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.section;
      showSection(sec);
      if (sec === 'veiculos')  loadVehicles();
      if (sec === 'categorias') loadAdminCategories();
      if (sec === 'config')    loadConfig();
      if (sec === 'dashboard') loadDashboard();
    });
  });

  document.getElementById('sidebarAddBtn').addEventListener('click', () => {
    closeSidebar();
    openVehicleModal(null);
  });

  document.getElementById('topbarAddBtn').addEventListener('click', () => {
    openVehicleModal(null);
  });

  document.getElementById('tblAddBtn').addEventListener('click', () => {
    openVehicleModal(null);
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);
}

/* ── Sidebar mobile ── */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function setupSidebar() {
  document.getElementById('topbarToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
}

/* ── Toggle password visibility ── */
function setupTogglePw() {
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.querySelector('i').className = isText ? 'bi bi-eye' : 'bi bi-eye-slash';
    });
  });
}

/* ══════════════════════════════════════════
   Dashboard
══════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const [stats, recentRes] = await Promise.all([
      api('/vehicles/stats'),
      api('/vehicles?limit=5&ordenacao=recente'),
    ]);

    document.getElementById('statTotal').textContent = stats.total ?? 0;
    document.getElementById('statDestaques').textContent = stats.destaques ?? 0;
    document.getElementById('statDisponiveis').textContent = stats.porStatus?.disponivel ?? 0;
    document.getElementById('statVendidos').textContent = stats.porStatus?.vendido ?? 0;
    renderDashRecent(recentRes.data || []);
  } catch (err) {
    console.error(err);
  }
}

function renderDashRecent(list) {
  const tbody = document.getElementById('dashRecentBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum veículo cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(v => {
    const id = vehicleId(v);
    const coverImg = (v.images || v.imagens)?.[0];
    const thumb = coverImg?.url
      ? `<img class="tbl-thumb" src="${escHtml(imageUrl(coverImg.url))}" alt="${escHtml(v.titulo)}" loading="lazy">`
      : `<div class="tbl-thumb-placeholder"><i class="bi bi-image"></i></div>`;
    return `<tr>
      <td>${thumb}</td>
      <td>${escHtml(v.titulo)}</td>
      <td>${escHtml(v.marca)}</td>
      <td>${escHtml(v.preco)}</td>
      <td>${v.destaque ? '<span style="color:var(--primary);font-weight:700">Sim</span>' : '<span style="color:var(--muted)">Não</span>'}</td>
      <td>${fmtDate(v.createdAt)}</td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════
   Vehicles Table
══════════════════════════════════════════ */
let vehiclesPage    = 1;
const PER_PAGE      = 10;
let vehiclesTotal   = 0;
let vehiclesFilters = { busca: '', marca: '', categoria: '' };
let filterTimer     = null;
let adminCategories = [];

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryName(slug) {
  const key = slugify(slug);
  return adminCategories.find((cat) => cat.slug === key)?.name || slug || '—';
}

async function loadVehicles() {
  const tbody = document.getElementById('vehiclesBody');
  tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Carregando...</td></tr>';

  try {
    const params = new URLSearchParams({
      page:  vehiclesPage,
      limit: PER_PAGE,
      ...Object.fromEntries(Object.entries(vehiclesFilters).filter(([, v]) => v)),
    });

    const res = await api(`/vehicles?${params}`);
    if (!res) return;

    const list  = res.data ?? res;
    vehiclesTotal = res.total ?? list.length;

    renderVehiclesTable(Array.isArray(list) ? list : []);
    renderPagination();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Erro: ${escHtml(err.message)}</td></tr>`;
  }
}

function renderVehiclesTable(list) {
  const tbody = document.getElementById('vehiclesBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhum veículo encontrado.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(v => {
    const id = vehicleId(v);
    const coverImg = (v.images || v.imagens)?.[0];
    const thumb = coverImg?.url
      ? `<img class="tbl-thumb" src="${escHtml(imageUrl(coverImg.url))}" alt="${escHtml(v.titulo)}" loading="lazy">`
      : `<div class="tbl-thumb-placeholder"><i class="bi bi-image"></i></div>`;
    const catBadge = v.categoria
      ? `<span class="badge-cat">${escHtml(categoryName(v.categoria))}</span>`
      : '—';
    return `<tr>
      <td>${thumb}</td>
      <td>
        <div style="font-weight:600;line-height:1.3">${escHtml(v.titulo)}</div>
        <div style="font-size:.78rem;color:var(--muted)">${escHtml(v.marca)} ${escHtml(v.ano)}</div>
      </td>
      <td>${escHtml(v.ano)}</td>
      <td style="font-weight:600;color:var(--primary)">${escHtml(v.preco)}</td>
      <td>${catBadge}</td>
      <td>
        <select class="status-select badge-status ${escHtml(v.status || 'disponivel')}" data-id="${escHtml(id)}">
          <option value="disponivel" ${v.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
          <option value="reservado" ${v.status === 'reservado' ? 'selected' : ''}>Reservado</option>
          <option value="vendido" ${v.status === 'vendido' ? 'selected' : ''}>Vendido</option>
        </select>
      </td>
      <td>
        <label class="toggle-switch" title="${v.destaque ? 'Remover destaque' : 'Marcar como destaque'}">
          <input type="checkbox" class="destaque-toggle" data-id="${escHtml(id)}" ${v.destaque ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
      </td>
      <td>
        <div class="tbl-actions">
          <button class="btn-tbl btn-tbl-edit" data-id="${escHtml(id)}" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-tbl btn-tbl-del" data-id="${escHtml(id)}" data-titulo="${escHtml(v.titulo)}" title="Excluir">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
  // listeners are handled via event delegation in setupVehicleFilters
}

function renderPagination() {
  const container  = document.getElementById('tablePagination');
  const totalPages = Math.ceil(vehiclesTotal / PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${vehiclesPage === 1 ? 'disabled' : ''} data-page="${vehiclesPage - 1}">
    <i class="bi bi-chevron-left"></i>
  </button>`;

  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && Math.abs(p - vehiclesPage) > 2 && p !== 1 && p !== totalPages) {
      if (p === 2 || p === totalPages - 1) html += '<span style="color:var(--muted);padding:0 .2rem">...</span>';
      continue;
    }
    html += `<button class="page-btn${p === vehiclesPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
  }

  html += `<button class="page-btn" ${vehiclesPage === totalPages ? 'disabled' : ''} data-page="${vehiclesPage + 1}">
    <i class="bi bi-chevron-right"></i>
  </button>`;

  container.innerHTML = html;
  container.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      vehiclesPage = parseInt(btn.dataset.page);
      loadVehicles();
    });
  });
}

/* ── Filters ── */
function setupVehicleFilters() {
  const search = document.getElementById('tblSearch');
  const marca  = document.getElementById('tblMarca');
  const cat    = document.getElementById('tblCategoria');

  const debounce = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => { vehiclesPage = 1; loadVehicles(); }, 400);
  };

  search.addEventListener('input', () => { vehiclesFilters.busca = search.value; debounce(); });
  marca.addEventListener('change',  () => { vehiclesFilters.marca = marca.value; vehiclesPage = 1; loadVehicles(); });
  cat.addEventListener('change',    () => { vehiclesFilters.categoria = cat.value; vehiclesPage = 1; loadVehicles(); });

  /* Event delegation — a única forma de garantir zero listeners duplicados
     independentemente de quantas vezes renderVehiclesTable redesenha o tbody */
  const tbody = document.getElementById('vehiclesBody');

  tbody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-tbl-edit');
    const delBtn  = e.target.closest('.btn-tbl-del');
    if (editBtn && !editBtn.disabled) loadAndEditVehicle(editBtn.dataset.id, editBtn);
    if (delBtn  && !delBtn.disabled)  deleteVehicle(delBtn.dataset.id, delBtn.dataset.titulo);
  });

  tbody.addEventListener('change', (e) => {
    const statusSel   = e.target.closest('.status-select');
    const destaqueChk = e.target.closest('.destaque-toggle');
    if (statusSel)   updateStatus(statusSel.dataset.id, statusSel.value);
    if (destaqueChk) toggleDestaque(destaqueChk.dataset.id, destaqueChk.checked);
  });
}

function renderCategoryOptions(select, includeAllLabel = null) {
  if (!select) return;
  const active = adminCategories.filter((cat) => cat.active !== false);
  select.innerHTML = (includeAllLabel !== null ? `<option value="">${escHtml(includeAllLabel)}</option>` : '<option value="">Selecione...</option>') +
    active.map((cat) => `<option value="${escHtml(cat.slug)}">${escHtml(cat.name)}</option>`).join('');
}

/* ── Toggle Destaque ── */
async function toggleDestaque(id, value) {
  try {
    await api(`/vehicles/${id}/destaque`, { method: 'PATCH', json: { destaque: value } });
    toast(`Destaque ${value ? 'ativado' : 'removido'}.`);
  } catch (err) {
    toast(err.message, 'error');
    loadVehicles();
  }
}

async function updateStatus(id, status) {
  try {
    await api(`/vehicles/${id}/status`, { method: 'PATCH', json: { status } });
    toast('Status atualizado.');
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
    loadVehicles();
  }
}

/* ── Delete Vehicle ── */
async function deleteVehicle(id, titulo) {
  const ok = await confirmDialog(`Tem certeza que deseja excluir "${titulo}"? Esta ação não pode ser desfeita.`);
  if (!ok) return;
  try {
    await api(`/vehicles/${id}`, { method: 'DELETE' });
    toast('Veículo excluído com sucesso.');
    loadVehicles();
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ══════════════════════════════════════════
   Vehicle Modal — Image Management
══════════════════════════════════════════ */
let imgItems     = []; // [{type:'existing'|'new', url, filename?, file?}]
let dragSrcIdx   = null;

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function addFiles(files) {
  for (const file of files) {
    if (imgItems.length >= 15) { toast('Máximo de 15 fotos permitidas.', 'error'); break; }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast(`"${file.name}" — tipo inválido. Use JPG, PNG ou WebP.`, 'error');
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast(`"${file.name}" — máximo 15 MB por imagem.`, 'error');
      continue;
    }
    imgItems.push({ type: 'new', url: URL.createObjectURL(file), file });
  }
  renderImgPreviews();
}

function removeImg(idx) {
  const item = imgItems[idx];
  if (item.type === 'new') URL.revokeObjectURL(item.url);
  imgItems.splice(idx, 1);
  renderImgPreviews();
}

function setCoverImg(idx) {
  if (idx <= 0 || idx >= imgItems.length) return;
  const [cover] = imgItems.splice(idx, 1);
  imgItems.unshift(cover);
  renderImgPreviews();
}

function renderImgPreviews() {
  const grid = document.getElementById('imgPreviewGrid');
  grid.innerHTML = '';

  imgItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'img-preview-item';
    div.draggable = true;
    div.innerHTML = `
      <img src="${escHtml(item.url)}" alt="Foto ${idx + 1}">
      <button type="button" class="img-remove" aria-label="Remover foto">×</button>
      ${idx === 0 ? '<span class="img-badge-capa">CAPA</span>' : `<button type="button" class="img-set-cover">Definir capa</button>`}
    `;

    div.addEventListener('dragstart', () => { dragSrcIdx = idx; div.classList.add('dragging'); });
    div.addEventListener('dragend',   () => { div.classList.remove('dragging'); dragSrcIdx = null; });
    div.addEventListener('dragover',  e => { e.preventDefault(); div.classList.add('drag-over'); });
    div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('drag-over');
      if (dragSrcIdx !== null && dragSrcIdx !== idx) {
        const [moved] = imgItems.splice(dragSrcIdx, 1);
        imgItems.splice(idx, 0, moved);
        renderImgPreviews();
      }
    });

    div.querySelector('.img-remove').addEventListener('click', () => removeImg(idx));
    div.querySelector('.img-set-cover')?.addEventListener('click', () => setCoverImg(idx));
    grid.appendChild(div);
  });
}

function setupImageUpload() {
  const zone  = document.getElementById('imgDropZone');
  const input = document.getElementById('imgFileInput');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-active'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-active');
    addFiles([...e.dataTransfer.files]);
  });

  input.addEventListener('change', () => {
    addFiles([...input.files]);
    input.value = '';
  });
}

/* ══════════════════════════════════════════
   Vehicle Modal — Open / Close / Save
══════════════════════════════════════════ */
let opcionaisArray = [];
let tagsInputReady = false;

function initTagsInput() {
  if (tagsInputReady) return;
  const input = document.getElementById('opcionaisInput');
  const container = document.getElementById('opcionaisContainer');
  if (!input || !container) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '');
      if (val && !opcionaisArray.includes(val)) {
        opcionaisArray.push(val);
        renderTags();
      }
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && opcionaisArray.length > 0) {
      opcionaisArray.pop();
      renderTags();
    }
  });

  input.addEventListener('blur', () => {
    const val = input.value.trim().replace(/,$/, '');
    if (val && !opcionaisArray.includes(val)) {
      opcionaisArray.push(val);
      renderTags();
      input.value = '';
    }
  });

  container.addEventListener('click', () => input.focus());
  tagsInputReady = true;
}

function renderTags() {
  const list = document.getElementById('opcionaisTags');
  if (!list) return;
  list.innerHTML = opcionaisArray.map((tag, i) => `
    <span class="tag-item">
      ${escHtml(tag)}
      <button type="button" class="tag-remove" onclick="removeTag(${i})">x</button>
    </span>
  `).join('');
}

function removeTag(index) {
  opcionaisArray.splice(index, 1);
  renderTags();
}

function setOpcionais(arr) {
  opcionaisArray = Array.isArray(arr) ? [...arr] : [];
  renderTags();
}

function getOpcionais() {
  return [...opcionaisArray];
}

const DEFAULT_CATEGORIAS = ['Hatch', 'Sedan', 'SUV', 'Picape'];
let categoriasArray = [];
let categoriasConfigReady = false;

function getCategorias() {
  try {
    const saved = localStorage.getItem('jscar_categorias');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIAS;
  } catch {
    return DEFAULT_CATEGORIAS;
  }
}

function initCategoriasConfig() {
  const saved = localStorage.getItem('jscar_categorias');
  try {
    categoriasArray = saved ? JSON.parse(saved) : ['Hatch', 'Sedan', 'SUV', 'Picape'];
  } catch {
    categoriasArray = ['Hatch', 'Sedan', 'SUV', 'Picape'];
  }
  renderCategoriasTags();

  if (categoriasConfigReady) return;
  const input = document.getElementById('categoriasInput');
  const btnAdd = document.getElementById('btnAddCategoria');
  if (!input) return;

  function addCategoria() {
    const val = input.value.trim();
    if (!val) return;
    if (categoriasArray.map(c => c.toLowerCase()).includes(val.toLowerCase())) {
      showToast('Categoria já existe!', 'error');
      return;
    }
    const nome = val.charAt(0).toUpperCase() + val.slice(1);
    categoriasArray.push(nome);
    renderCategoriasTags();
    input.value = '';
    input.focus();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategoria();
    }
  });

  if (btnAdd) btnAdd.addEventListener('click', addCategoria);

  const btnSalvar = document.getElementById('btnSalvarCategorias');
  if (btnSalvar) {
    btnSalvar.addEventListener('click', () => {
      localStorage.setItem('jscar_categorias', JSON.stringify(categoriasArray));
      window.dispatchEvent(new CustomEvent('jscar:categorias-updated'));
      populateCategoriaSelect();
      showToast('Categorias salvas com sucesso!', 'success');
    });
  }

  categoriasConfigReady = true;
}

function renderCategoriasTags() {
  const lista = document.getElementById('categoriasLista');
  if (!lista) return;

  lista.innerHTML = categoriasArray.map((cat, i) => `
    <div class="categoria-tag">
      <span class="categoria-tag-dot"></span>
      <span class="categoria-tag-nome">${escHtml(cat)}</span>
      <button type="button" class="categoria-tag-remove" onclick="removeCategoriaTag(${i})" title="Remover">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `).join('');
}

function removeCategoriaTag(index) {
  categoriasArray.splice(index, 1);
  renderCategoriasTags();
}

function populateCategoriaSelect() {
  const select = document.getElementById('f-categoria');
  renderCategoryOptions(select);
  renderCategoryOptions(document.getElementById('tblCategoria'), 'Todas as categorias');
}

let mapsConfigReady = false;

function initMapsConfig() {
  const defaultUrl = "https://www.openstreetmap.org/export/embed.html?bbox=-42.8201%2C-5.1134%2C-42.8001%2C-5.0934&layer=mapnik&marker=-5.1034%2C-42.8101";
  if (!localStorage.getItem('jscar_maps_url')) {
    localStorage.setItem('jscar_maps_url', defaultUrl);
  }
  const input = document.getElementById('mapsEmbedUrl');
  if (!input) return;
  const saved = localStorage.getItem('jscar_maps_url');
  if (saved) input.value = saved;
  if (mapsConfigReady) return;

  document.getElementById('btnPreviewMaps')?.addEventListener('click', () => {
    const url = input.value.trim();
    if (!url) { showToast('Cole uma URL valida primeiro', 'error'); return; }
    const preview = document.getElementById('mapsPreview');
    const frame = document.getElementById('mapsPreviewFrame');
    frame.src = url;
    preview.style.display = 'block';
  });

  document.getElementById('btnSalvarMaps')?.addEventListener('click', () => {
    const url = input.value.trim();
    if (!url) { showToast('Cole uma URL valida', 'error'); return; }
    localStorage.setItem('jscar_maps_url', url);
    showToast('URL do mapa salva com sucesso!', 'success');
  });

  mapsConfigReady = true;
}

let editingCategoryId = null;
let categoryImageFile = null;

async function loadAdminCategories() {
  const grid = document.getElementById('categoryAdminGrid');
  if (grid) grid.innerHTML = '<div class="table-empty">Carregando categorias...</div>';

  try {
    const res = await api('/categories?includeInactive=true');
    adminCategories = res?.data || [];
    populateCategoriaSelect();
    renderAdminCategories();
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
    if (grid) grid.innerHTML = `<div class="table-empty">Erro: ${escHtml(err.message)}</div>`;
  }
}

function renderAdminCategories() {
  const grid = document.getElementById('categoryAdminGrid');
  if (!grid) return;

  if (!adminCategories.length) {
    grid.innerHTML = '<div class="table-empty">Nenhuma categoria cadastrada.</div>';
    return;
  }

  grid.innerHTML = adminCategories.map((cat) => `
    <article class="category-admin-card ${cat.active ? '' : 'is-inactive'}">
      <div class="category-admin-cover">
        ${cat.image_url ? `<img src="${escHtml(imageUrl(cat.image_url))}" alt="${escHtml(cat.name)}">` : `<div class="category-admin-fallback"><i class="bi ${escHtml(cat.icon || 'bi-car-front-fill')}"></i></div>`}
        <span class="category-admin-status ${cat.active ? 'active' : 'inactive'}">${cat.active ? 'Ativa' : 'Inativa'}</span>
      </div>
      <div class="category-admin-body">
        <div class="category-admin-meta">
          <strong>${escHtml(cat.name)}</strong>
          <span>${escHtml(cat.slug)}</span>
        </div>
        <p>${escHtml(cat.description || 'Sem descrição.')}</p>
        <div class="category-admin-foot">
          <span>Ordem ${Number(cat.sort_order ?? cat.sortOrder ?? 0)}</span>
          <div class="category-admin-actions">
            <button class="btn-tbl" type="button" title="${cat.active ? 'Desativar' : 'Ativar'}" onclick="toggleCategoryStatus('${escHtml(cat.id)}', ${cat.active ? 'false' : 'true'})"><i class="bi ${cat.active ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
            <button class="btn-tbl btn-tbl-edit" type="button" title="Editar" onclick="openCategoryModal('${escHtml(cat.id)}')"><i class="bi bi-pencil"></i></button>
            <button class="btn-tbl btn-tbl-del" type="button" title="Excluir" onclick="deleteCategory('${escHtml(cat.id)}')"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

function openCategoryModal(id = null) {
  const category = id ? adminCategories.find((cat) => cat.id === id) : null;
  editingCategoryId = id;
  categoryImageFile = null;

  document.getElementById('categoryModalHeading').textContent = id ? 'Editar categoria' : 'Adicionar categoria';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryFormError').style.display = 'none';
  document.getElementById('cat-active').checked = true;

  if (category) {
    document.getElementById('cat-name').value = category.name || '';
    document.getElementById('cat-slug').value = category.slug || '';
    document.getElementById('cat-description').value = category.description || '';
    document.getElementById('cat-icon').value = category.icon || '';
    document.getElementById('cat-sort').value = category.sort_order ?? category.sortOrder ?? 0;
    document.getElementById('cat-active').checked = category.active !== false;
    updateCategoryPreview(category.image_url);
  } else {
    updateCategoryPreview('');
  }

  document.getElementById('categoryModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
  document.body.style.overflow = '';
  editingCategoryId = null;
  categoryImageFile = null;
  document.getElementById('cat-image').value = '';
}

function updateCategoryPreview(url) {
  const preview = document.getElementById('cat-preview');
  if (!url) {
    preview.innerHTML = '<i class="bi bi-image"></i><span>Prévia</span>';
    return;
  }
  const src = String(url).startsWith('blob:') ? url : imageUrl(url);
  preview.innerHTML = `<img src="${escHtml(src)}" alt="Prévia da categoria">`;
}

function setCategorySaving(on) {
  const btn = document.getElementById('categorySaveBtn');
  btn.disabled = on;
  btn.querySelector('.btn-text').style.display = on ? 'none' : '';
  btn.querySelector('.btn-spinner').style.display = on ? '' : 'none';
}

async function saveCategory() {
  const errEl = document.getElementById('categoryFormError');
  errEl.style.display = 'none';

  const name = document.getElementById('cat-name').value.trim();
  const slug = slugify(document.getElementById('cat-slug').value || name);
  if (!name || !slug) {
    errEl.textContent = 'Nome e slug são obrigatórios.';
    errEl.style.display = '';
    return;
  }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('slug', slug);
  fd.append('description', document.getElementById('cat-description').value.trim());
  fd.append('icon', document.getElementById('cat-icon').value.trim());
  fd.append('sort_order', document.getElementById('cat-sort').value || '0');
  fd.append('active', document.getElementById('cat-active').checked ? 'true' : 'false');
  if (categoryImageFile) fd.append('image', categoryImageFile);

  setCategorySaving(true);
  try {
    const method = editingCategoryId ? 'PUT' : 'POST';
    const url = editingCategoryId ? `/categories/${editingCategoryId}` : '/categories';
    await api(url, { method, body: fd });
    toast(editingCategoryId ? 'Categoria atualizada.' : 'Categoria criada.');
    closeCategoryModal();
    await loadAdminCategories();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = '';
  } finally {
    setCategorySaving(false);
  }
}

async function toggleCategoryStatus(id, active) {
  try {
    await api(`/categories/${id}/status`, { method: 'PATCH', json: { active } });
    toast(active ? 'Categoria ativada.' : 'Categoria desativada.');
    await loadAdminCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  const category = adminCategories.find((cat) => cat.id === id);
  const ok = await confirmDialog(`Excluir a categoria "${category?.name || ''}"? Esta ação só será permitida se ela não estiver em uso.`);
  if (!ok) return;
  try {
    await api(`/categories/${id}`, { method: 'DELETE' });
    toast('Categoria excluída.');
    await loadAdminCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function setupCategoryAdmin() {
  document.getElementById('categoryAddBtn')?.addEventListener('click', () => openCategoryModal());
  document.getElementById('categoryModalClose')?.addEventListener('click', closeCategoryModal);
  document.getElementById('categoryCancelBtn')?.addEventListener('click', closeCategoryModal);
  document.getElementById('categorySaveBtn')?.addEventListener('click', saveCategory);
  document.getElementById('categoryModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeCategoryModal();
  });

  document.getElementById('cat-name')?.addEventListener('input', (event) => {
    const slugInput = document.getElementById('cat-slug');
    if (!editingCategoryId || !slugInput.value.trim()) slugInput.value = slugify(event.target.value);
  });

  document.getElementById('cat-slug')?.addEventListener('blur', (event) => {
    event.target.value = slugify(event.target.value);
  });

  document.getElementById('cat-image')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    categoryImageFile = file;
    updateCategoryPreview(URL.createObjectURL(file));
  });
}

let editingId = null;

function openVehicleModal(vehicle) {
  editingId = vehicleId(vehicle) || null;

  const modal = document.getElementById('vehicleModal');
  document.getElementById('modalHeading').textContent =
    editingId ? 'Editar Veículo' : 'Adicionar Veículo';

  /* Reset form */
  document.getElementById('vehicleForm').reset();
  document.getElementById('vehicleFormError').style.display = 'none';
  initTagsInput();
  populateCategoriaSelect();
  setOpcionais([]);
  document.getElementById('vehicleDestaque').checked = false;
  document.getElementById('vehicleHero').checked = false;

  /* Clear images */
  imgItems.forEach(i => { if (i.type === 'new') URL.revokeObjectURL(i.url); });
  imgItems = [];
  renderImgPreviews();

  /* Populate if editing */
  if (vehicle) {
    const fields = ['titulo', 'marca', 'modelo', 'ano', 'combustivel', 'cambio',
                    'km', 'preco', 'cidade', 'cor', 'categoria', 'status', 'descricao'];
    fields.forEach(f => {
      const el = document.getElementById(`f-${f}`);
      if (el) el.value = vehicle[f] ?? '';
    });

    document.getElementById('vehicleDestaque').checked = !!vehicle.destaque;
    document.getElementById('vehicleHero').checked = !!vehicle.hero;

    setOpcionais(vehicle.opcionais || []);

    /* Existing images */
    const existingImages = [...(vehicle.images || vehicle.imagens || [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const seenImages = new Set();
    existingImages.forEach(img => {
      const key = img.id || img._id || img.url || img.filename;
      if (!key || seenImages.has(key)) return;
      seenImages.add(key);
      imgItems.push({
        type: 'existing',
        id: img.id || img._id,
        url: imageUrl(img.url),
        filename: img.filename,
        dbUrl: img.url,
      });
    });
    renderImgPreviews();
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeVehicleModal() {
  document.getElementById('vehicleModal').style.display = 'none';
  document.body.style.overflow = '';
  imgItems.forEach(i => { if (i.type === 'new') URL.revokeObjectURL(i.url); });
  imgItems  = [];
  editingId = null;
}

function setModalSaving(on) {
  const btn = document.getElementById('modalSaveBtn');
  btn.disabled = on;
  btn.querySelector('.btn-text').style.display    = on ? 'none' : '';
  btn.querySelector('.btn-spinner').style.display = on ? '' : 'none';
}

async function saveVehicle() {
  const errEl = document.getElementById('vehicleFormError');
  errEl.style.display = 'none';

  /* Validate */
  const required = { titulo: 'Título', marca: 'Marca', modelo: 'Modelo', ano: 'Ano', combustivel: 'Combustível', km: 'Quilometragem', preco: 'Preço' };
  for (const [id, label] of Object.entries(required)) {
    if (!document.getElementById(`f-${id}`).value.trim()) {
      errEl.textContent = `O campo "${label}" é obrigatório.`;
      errEl.style.display = '';
      return;
    }
  }

  if (!imgItems.length) {
    errEl.textContent = 'Adicione pelo menos 1 imagem.';
    errEl.style.display = '';
    return;
  }

  setModalSaving(true);
  try {
    const fd = new FormData();

    /* Text fields */
    ['titulo','marca','modelo','ano','combustivel','cambio','km','preco','cidade','cor','categoria','status','descricao'].forEach(f => {
      const el = document.getElementById(`f-${f}`);
      if (el) fd.append(f, el.value.trim());
    });

    fd.append('destaque', document.getElementById('vehicleDestaque').checked ? 'true' : 'false');
    fd.append('hero', document.getElementById('vehicleHero').checked ? 'true' : 'false');

    const opcionais = getOpcionais();
    fd.append('opcionais', opcionais.join(','));

    /* Image order: build imageOrder array + append new files in index order */
    const imageOrder = [];
    let newFileIdx = 0;
    imgItems.forEach(item => {
      if (item.type === 'existing') {
        imageOrder.push({ type: 'existing', id: item.id, url: item.dbUrl, filename: item.filename });
      } else {
        imageOrder.push({ type: 'new', idx: newFileIdx++ });
        fd.append('imagens', item.file);
      }
    });

    fd.append('imageOrder', JSON.stringify(imageOrder));

    const method = editingId ? 'PUT' : 'POST';
    const url    = editingId ? `/vehicles/${editingId}` : '/vehicles';

    await api(url, { method, body: fd });

    toast(editingId ? 'Veículo atualizado com sucesso!' : 'Veículo adicionado com sucesso!');
    closeVehicleModal();
    showSection('veiculos');
    loadVehicles();
    loadDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = '';
  } finally {
    setModalSaving(false);
  }
}

async function loadAndEditVehicle(id, btnEl = null) {
  if (btnEl) btnEl.disabled = true;
  try {
    const res = await api(`/vehicles/${id}`);
    const vehicle = res?.data || res;
    if (!vehicleId(vehicle)) throw new Error('Resposta sem identificador do veículo.');
    openVehicleModal(vehicle);
  } catch (err) {
    console.error('[admin] Erro ao carregar veículo para edição:', err);
    toast('Não foi possível carregar os dados do veículo para edição.', 'error');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

function setupVehicleModal() {
  document.getElementById('modalClose').addEventListener('click', closeVehicleModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeVehicleModal);
  document.getElementById('modalSaveBtn').addEventListener('click', saveVehicle);

  document.getElementById('vehicleModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeVehicleModal();
  });

  /* Price mask */
  const precoInput = document.getElementById('f-preco');
  precoInput.addEventListener('input', () => {
    let raw = precoInput.value.replace(/\D/g, '');
    if (!raw) { precoInput.value = ''; return; }
    while (raw.length < 3) raw = '0' + raw;
    const intPart = raw.slice(0, -2).replace(/^0+/, '') || '0';
    const decPart = raw.slice(-2);
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    precoInput.value = 'R$ ' + formatted + ',' + decPart;
  });

  setupImageUpload();
}

/* ══════════════════════════════════════════
   Config
══════════════════════════════════════════ */
async function loadConfig() {
  try {
    const settings = await api('/settings');
    if (!settings) return;
    document.getElementById('cfgNome').value      = settings.nome      || '';
    document.getElementById('cfgWhatsapp').value  = settings.whatsapp  || '';
    document.getElementById('cfgInstagram').value = settings.instagram || '';
    document.getElementById('cfgEndereco').value  = settings.endereco  || '';
    document.getElementById('cfgCidade').value    = settings.cidade    || '';
  } catch (err) {
    console.error(err);
  }
}

function setConfigSaving(btnId, on) {
  const btn = document.getElementById(btnId);
  btn.disabled = on;
  btn.querySelector('.btn-text').style.display    = on ? 'none' : '';
  btn.querySelector('.btn-spinner').style.display = on ? '' : 'none';
}

function setupConfig() {
  /* Save store data */
  document.getElementById('cfgSaveBtn').addEventListener('click', async () => {
    const errEl = document.getElementById('configError');
    const okEl  = document.getElementById('configSuccess');
    errEl.style.display = 'none';
    okEl.style.display  = 'none';
    setConfigSaving('cfgSaveBtn', true);
    try {
      await api('/settings', {
        method: 'PUT',
        json: {
          nome:      document.getElementById('cfgNome').value,
          whatsapp:  document.getElementById('cfgWhatsapp').value,
          instagram: document.getElementById('cfgInstagram').value,
          endereco:  document.getElementById('cfgEndereco').value,
          cidade:    document.getElementById('cfgCidade').value,
        },
      });
      okEl.textContent    = 'Dados salvos com sucesso.';
      okEl.style.display  = '';
      toast('Dados da loja atualizados.');
    } catch (err) {
      errEl.textContent   = err.message;
      errEl.style.display = '';
    } finally {
      setConfigSaving('cfgSaveBtn', false);
    }
  });

  /* Change password */
  document.getElementById('pwSaveBtn').addEventListener('click', async () => {
    const errEl = document.getElementById('pwError');
    const okEl  = document.getElementById('pwSuccess');
    errEl.style.display = 'none';
    okEl.style.display  = 'none';

    const current  = document.getElementById('pwCurrent').value;
    const newPw    = document.getElementById('pwNew').value;
    const confirm  = document.getElementById('pwConfirm').value;

    if (!current || !newPw || !confirm) {
      errEl.textContent = 'Preencha todos os campos.';
      errEl.style.display = ''; return;
    }
    if (newPw !== confirm) {
      errEl.textContent = 'As senhas não coincidem.';
      errEl.style.display = ''; return;
    }

    setConfigSaving('pwSaveBtn', true);
    try {
      await api('/auth/change-password', { method: 'PUT', json: { currentPassword: current, newPassword: newPw } });
      okEl.textContent   = 'Senha alterada com sucesso.';
      okEl.style.display = '';
      document.getElementById('pwCurrent').value = '';
      document.getElementById('pwNew').value     = '';
      document.getElementById('pwConfirm').value = '';
      toast('Senha alterada com sucesso.');
    } catch (err) {
      errEl.textContent   = err.message;
      errEl.style.display = '';
    } finally {
      setConfigSaving('pwSaveBtn', false);
    }
  });
}

/* ══════════════════════════════════════════
   Auth Check
══════════════════════════════════════════ */
async function checkAuth() {
  try {
    const user = await api('/auth/me');
    if (!user) return;
    document.getElementById('sidebarUserName').textContent = user.nome || user.email || 'Admin';
  } catch {
    logout();
  }
}

/* ══════════════════════════════════════════
   Init
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupNavigation();
  setupSidebar();
  setupTogglePw();
  setupVehicleModal();
  setupVehicleFilters();
  setupCategoryAdmin();
  setupConfig();
  initCategoriasConfig();
  initMapsConfig();
  await loadAdminCategories();
  loadDashboard();
});
