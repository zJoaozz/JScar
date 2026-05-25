'use strict';

const API_URL = "http://localhost:5000/api";
const API_ORIGIN = API_URL.replace(/\/api$/, '');
const WA = '5586994133034';
let storeWhatsapp = WA;

const filters = { busca: '', marca: '', combustivel: '', categoria: '', minPreco: '', maxPreco: '', ordenacao: 'recente', page: 1, limit: 12 };
let appendMode = false;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initHeader();
  initMobileMenu();
  initReveal();
  await loadSettings();
  await populateCategoriaFilter();
  readParams();
  bindFilters();
  fetchVehicles();
});

function readParams() {
  const params = new URLSearchParams(location.search);
  filters.busca = params.get('busca') || '';
  filters.categoria = slugify(params.get('categoria') || '');
  setValue('searchInput', filters.busca);
  setValue('filterCategoria', filters.categoria);
}

async function populateCategoriaFilter() {
  const select = document.getElementById('filterCategoria');
  if (!select) return;
  try {
    const res = await fetch(`${API_URL}/categories`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao carregar categorias');
    const categorias = json.data || [];
    select.innerHTML = '<option value="">Todas as categorias</option>' +
      categorias.map(c => `<option value="${escHtml(c.slug)}">${escHtml(c.name)}</option>`).join('');
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
    select.innerHTML = '<option value="">Todas as categorias</option>';
  }
}

function bindFilters() {
  document.getElementById('searchInput')?.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { filters.busca = event.target.value.trim(); resetFetch(); }, 400);
  });
  const selectFilterKeys = {
    marcaFilter: 'marca',
    combustivelFilter: 'combustivel',
    filterCategoria: 'categoria',
    ordenacaoFilter: 'ordenacao',
  };

  Object.entries(selectFilterKeys).forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener('change', (event) => {
      filters[key] = event.target.value;
      resetFetch();
    });
  });
  document.getElementById('precoFilter')?.addEventListener('change', (event) => {
    const [min = '', max = ''] = event.target.value.split('-');
    filters.minPreco = min;
    filters.maxPreco = max;
    resetFetch();
  });
  document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    filters.page += 1;
    appendMode = true;
    fetchVehicles();
  });
}

function resetFetch() {
  filters.page = 1;
  appendMode = false;
  fetchVehicles();
}

async function fetchVehicles() {
  const grid = document.getElementById('estoqueGrid') || document.getElementById('vehiclesGrid');
  const count = document.getElementById('resultsCount');
  if (!grid) return;
  if (!appendMode) renderSkeletons(6);

  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const res = await fetch(`${API_URL}/vehicles?${params}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao carregar estoque');
    const vehicles = json.data || [];
    if (appendMode) grid.insertAdjacentHTML('beforeend', vehicles.map(buildCard).join(''));
    else grid.innerHTML = vehicles.length ? vehicles.map(buildCard).join('') : emptyState();
    if (count) count.textContent = `${json.total} veículo${json.total === 1 ? '' : 's'} encontrado${json.total === 1 ? '' : 's'}`;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = filters.page < json.totalPages ? 'inline-flex' : 'none';
    document.getElementById('clearFilters')?.classList.toggle('visible', hasActiveFilters());
    initCardImages(grid);
    appendMode = false;
  } catch (err) {
    grid.innerHTML = emptyState(err.message);
  }
}

function renderSkeletons(n) {
  const grid = document.getElementById('estoqueGrid') || document.getElementById('vehiclesGrid');
  grid.innerHTML = Array.from({ length: n }, () => '<div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton-body"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line full"></div></div></div>').join('');
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_URL}/settings`);
    const settings = await res.json();
    if (res.ok && settings.whatsapp) {
      storeWhatsapp = settings.whatsapp;
      const phone = normalizePhone(settings.whatsapp);
      if (phone) {
        const msg = encodeURIComponent('Olá! Quero atendimento da JScar.');
        document.querySelectorAll('.wa-float, .whatsapp-float, .btn-whatsapp-header').forEach(el => {
          if (el.tagName === 'A') el.href = `https://wa.me/${phone}?text=${msg}`;
        });
      }
    }
  } catch {
    storeWhatsapp = WA;
  }
}

function buildCard(v) {
  const id = v.id || v._id;
  const sold = String(v.status || '').toLowerCase() === 'vendido';
  const statusBadge = v.status && v.status !== 'disponivel' ? `<span class="badge-status ${escHtml(v.status)}">${labelStatus(v.status)}</span>` : '';
  const waBtn = sold ? '' : `<a class="btn-wa" href="${escHtml(buildWhatsappLink(v))}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp"><i class="bi bi-whatsapp"></i></a>`;
  return `<article class="vehicle-card">
    <div class="card-img-link">${statusBadge}<a href="../veiculo/veiculo.html?id=${escHtml(id)}"><img class="card-img" src="${escHtml(getImageUrl(v))}" alt="${escHtml(v.titulo)}" loading="lazy"></a></div>
    <div class="card-body"><h3 class="card-title">${escHtml(v.titulo)}</h3><div class="card-specs"><span><i class="bi bi-calendar3"></i>${escHtml(v.ano)}</span><span><i class="bi bi-speedometer2"></i>${escHtml(v.km)}</span><span><i class="bi bi-fuel-pump"></i>${escHtml(v.combustivel)}</span></div><div class="card-price">${formatPreco(v.preco)}</div><div class="card-actions">${waBtn}<a class="btn-details" href="../veiculo/veiculo.html?id=${escHtml(id)}">Ver detalhes</a></div></div>
  </article>`;
}

function clearFilters() {
  Object.assign(filters, { busca: '', marca: '', combustivel: '', categoria: '', minPreco: '', maxPreco: '', ordenacao: 'recente', page: 1 });
  ['searchInput', 'marcaFilter', 'combustivelFilter', 'filterCategoria', 'precoFilter', 'ordenacaoFilter'].forEach((id) => setValue(id, ''));
  history.replaceState(null, '', 'estoque.html');
  resetFetch();
}

function hasActiveFilters() {
  return ['busca', 'marca', 'combustivel', 'categoria', 'minPreco', 'maxPreco'].some((key) => filters[key]);
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function initTheme() { const btn = document.getElementById('themeToggle'); const icon = document.getElementById('themeIcon'); const apply = (m) => { document.body.classList.toggle('light-mode', m === 'light'); if (icon) icon.className = m === 'light' ? 'bi bi-sun-fill' : 'bi bi-moon-fill'; localStorage.setItem('jscar-theme', m); }; apply(localStorage.getItem('jscar-theme') || 'dark'); btn?.addEventListener('click', () => apply(document.body.classList.contains('light-mode') ? 'dark' : 'light')); }
function initHeader() { const h = document.getElementById('header'); window.addEventListener('scroll', () => h?.classList.toggle('scrolled', scrollY > 60), { passive: true }); }
function initMobileMenu() { const b = document.getElementById('hamburger'); const n = document.getElementById('nav'); const o = document.getElementById('mobileNavOverlay') || document.getElementById('navOverlay'); if (!b || !n || !o) return; const c = () => { b.classList.remove('open'); n.classList.remove('open'); o.classList.remove('visible'); b.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }; b.addEventListener('click', () => { const open = !n.classList.contains('open'); b.classList.toggle('open', open); n.classList.toggle('open', open); o.classList.toggle('visible', open); b.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); }); o.addEventListener('click', c); n.querySelectorAll('a').forEach((a) => a.addEventListener('click', c)); }
function initReveal() { const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: .1 }); document.querySelectorAll('.reveal').forEach((el) => io.observe(el)); }
function initCardImages(scope = document) {
  scope.querySelectorAll('.card-img').forEach((img) => {
    if (img.complete) {
      img.classList.add('loaded');
      return;
    }
    img.addEventListener('load', () => img.classList.add('loaded'));
    img.addEventListener('error', () => {
      img.src = 'https://picsum.photos/600/400?random=' + Math.floor(Math.random() * 100);
      img.classList.add('loaded');
    });
  });
}
function getVehicleImages(v) { const images = Array.isArray(v.images) && v.images.length ? v.images : v.imagens; return Array.isArray(images) ? images : []; }
function getImageUrl(v) { const img = getVehicleImages(v)[0]; const url = img?.url || v.imagem || v.image || ''; return url ? (url.startsWith('http') ? url : `${API_ORIGIN}${url}`) : 'https://picsum.photos/600/400?random=9'; }
function normalizePhone(value) { return String(value || '').replace(/\D/g, ''); }
function buildVehicleName(v) { const title = String(v.titulo || '').trim(); if (!title) return [v.marca, v.modelo, v.ano].map((item) => String(item || '').trim()).filter(Boolean).join(' ') || 'veículo'; const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const titleKey = normalize(title); const parts = []; if (v.marca && !titleKey.includes(normalize(v.marca))) parts.push(v.marca); if (v.modelo && !titleKey.includes(normalize(v.modelo))) parts.push(v.modelo); parts.push(title); if (v.ano && !titleKey.includes(normalize(v.ano))) parts.push(v.ano); return parts.map((item) => String(item || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(); }
function buildWhatsappLink(v) { const phone = normalizePhone(v.whatsapp) || normalizePhone(storeWhatsapp) || WA; const message = `Olá! Tenho interesse na ${buildVehicleName(v)}.`; return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`; }
function formatPreco(preco) { const text = String(preco || ''); const cents = text.includes(','); const n = Number(text.replace(/[^\d]/g, '')) / (cents ? 100 : 1); return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function labelStatus(s) { return { disponivel: 'Disponivel', reservado: 'Reservado', vendido: 'Vendido' }[s] || s; }
function emptyState(msg = 'Nenhum veiculo encontrado') { return `<div class="empty-state"><i class="bi bi-car-front-fill"></i><h3>${escHtml(msg)}</h3><p>Tente ajustar os filtros ou fale com a loja.</p></div>`; }
function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }
function escHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
