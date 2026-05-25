'use strict';

const API_URL = 'http://localhost:5000/api';
const API_ORIGIN = API_URL.replace(/\/api$/, '');
const WA = '5586994133034';

let storeWhatsapp = WA;
let currentVehicle = null;
let images = [];
let currentImage = 0;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initHeader();
  initMobileMenu();
  initReveal();
  await loadSettings();
  loadVehicle();
});

async function loadVehicle() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    location.href = '../estoque/estoque.html';
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_URL}/vehicles/${encodeURIComponent(id)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Veículo não encontrado');

    const vehicle = json.data || json;
    currentVehicle = vehicle;
    renderVehicle(vehicle);
    loadOutros(vehicle);
  } catch (err) {
    console.error('[veiculo] Erro ao carregar veículo:', err);
    setLoading(false);
    document.getElementById('errorState').style.display = '';
  }
}

function setLoading(isLoading) {
  document.getElementById('loadingState').style.display = isLoading ? '' : 'none';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('veiculoContent').style.display = 'none';
}

function renderVehicle(v) {
  const title = v.titulo || buildVehicleName(v);
  document.title = `${title} | JScar`;
  setText('breadcrumbTitle', title);
  setText('veiculoTitulo', title);
  setText('veiculoPreco', formatPreco(v.preco));

  renderBadges(v);
  renderSpecs(v);
  renderOpcionais(v);
  renderDescricao(v);
  renderActions(v);

  images = getVehicleImages(v).map((img) => getImageUrl(img.url)).filter(Boolean);
  currentImage = 0;
  renderGallery(title);
  updateMeta(v);

  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('veiculoContent').style.display = '';
}

function renderBadges(v) {
  const badges = [];
  if (v.status) {
    badges.push(`<span class="badge-status ${escHtml(v.status)}">${escHtml(labelStatus(v.status))}</span>`);
  }
  if (v.categoria) {
    badges.push(`<span class="veiculo-badge badge-categoria">${escHtml(labelCategoria(v.categoria))}</span>`);
  }
  if (v.destaque) {
    badges.push('<span class="veiculo-badge badge-destaque"><i class="bi bi-star-fill"></i>Destaque</span>');
  }
  document.getElementById('veiculoBadges').innerHTML = badges.join('');
}

function renderSpecs(v) {
  const specs = [
    ['bi-calendar3', 'Ano', v.ano],
    ['bi-speedometer2', 'Km', formatKm(v.km)],
    ['bi-fuel-pump', 'Combustível', v.combustivel],
    ['bi-gear', 'Câmbio', v.cambio],
    ['bi-geo-alt', 'Cidade', v.cidade],
    ['bi-palette', 'Cor', v.cor],
    ['bi-tag', 'Status', labelStatus(v.status)],
  ].filter(([, , value]) => value);

  document.getElementById('veiculoChips').innerHTML = specs.map(([icon, label, value]) => `
    <span class="vehicle-chip" role="listitem">
      <i class="bi ${icon}" aria-hidden="true"></i>
      <span>
        <small>${escHtml(label)}</small>
        <strong>${escHtml(value)}</strong>
      </span>
    </span>
  `).join('');
}

function renderOpcionais(v) {
  const block = document.getElementById('opcionaisBlock');
  const list = document.getElementById('veiculoOpcionais');
  const opcionais = Array.isArray(v.opcionais) ? v.opcionais.filter(Boolean) : [];

  if (!opcionais.length) {
    block.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  list.innerHTML = opcionais.map((item) => `
    <span class="opcional-chip">
      <i class="bi bi-check2-circle" aria-hidden="true"></i>${escHtml(item)}
    </span>
  `).join('');
  block.style.display = '';
}

function renderDescricao(v) {
  const block = document.getElementById('descricaoBlock');
  const desc = String(v.descricao || '').trim();
  if (!desc) {
    block.style.display = 'none';
    setText('veiculoDescricao', '');
    return;
  }
  setText('veiculoDescricao', desc);
  block.style.display = '';
}

function renderActions(v) {
  document.getElementById('btnWhatsapp').href = buildWhatsappLink(v);
  document.getElementById('btnShare').onclick = shareVehicle;
}

function renderGallery(title) {
  const thumbs = document.getElementById('galleryThumbs');
  const hasImages = images.length > 0;

  document.getElementById('galleryPrev').hidden = images.length <= 1;
  document.getElementById('galleryNext').hidden = images.length <= 1;
  document.getElementById('galleryPrev').onclick = () => setImage(currentImage - 1, title);
  document.getElementById('galleryNext').onclick = () => setImage(currentImage + 1, title);

  thumbs.innerHTML = hasImages ? images.map((src, index) => `
    <button class="thumb ${index === 0 ? 'active' : ''}" type="button" data-index="${index}" aria-label="Ver foto ${index + 1}" role="listitem">
      <img src="${escHtml(src)}" alt="${escHtml(title)} foto ${index + 1}" loading="lazy">
    </button>
  `).join('') : '';

  thumbs.style.display = images.length > 1 ? '' : 'none';
  thumbs.querySelectorAll('.thumb').forEach((btn) => {
    btn.addEventListener('click', () => setImage(Number(btn.dataset.index), title));
  });

  if (hasImages) setImage(0, title);
  else showGalleryPlaceholder(title);
}

function setImage(index, title) {
  if (!images.length) {
    showGalleryPlaceholder(title);
    return;
  }

  currentImage = (index + images.length) % images.length;
  const main = document.getElementById('mainImage');
  const placeholder = document.getElementById('galleryPlaceholder');

  main.style.display = '';
  placeholder.style.display = 'none';
  main.src = images[currentImage];
  main.alt = `${title} - foto ${currentImage + 1}`;
  main.onerror = () => showGalleryPlaceholder(title);

  document.getElementById('galleryCount').textContent = `${currentImage + 1} / ${images.length}`;
  document.querySelectorAll('.thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === currentImage);
  });
}

function showGalleryPlaceholder(title) {
  const main = document.getElementById('mainImage');
  const placeholder = document.getElementById('galleryPlaceholder');
  main.removeAttribute('src');
  main.alt = `${title} - imagem indisponível`;
  main.style.display = 'none';
  placeholder.style.display = 'flex';
  document.getElementById('galleryCount').textContent = '0 / 0';
}

async function shareVehicle() {
  if (!currentVehicle) return;

  const title = `${currentVehicle.titulo || buildVehicleName(currentVehicle)} | JScar`;
  const text = `Tenho interesse neste veículo: ${currentVehicle.titulo || buildVehicleName(currentVehicle)}`;
  const url = location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  await copyToClipboard(url);
  showFeedback('Link copiado!');
}

async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function showFeedback(message) {
  if (typeof showToast === 'function') {
    showToast(message, 'success');
    return;
  }
  const btn = document.getElementById('btnShare');
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i> Link copiado!';
  setTimeout(() => { btn.innerHTML = original; }, 1800);
}

async function loadOutros(v) {
  const grid = document.getElementById('outrosGrid');
  const vId = String(v.id || v._id || '');

  try {
    const res = await fetch(`${API_URL}/vehicles?limit=10`);
    const json = await res.json();
    const others = (json.data || [])
      .filter((item) => String(item.id || item._id || '') !== vId)
      .slice(0, 3);
    grid.innerHTML = others.length ? others.map(buildCard).join('') : '';
    initCardImages(grid);
  } catch (err) {
    console.error('[veiculo] Erro ao carregar outros veículos:', err);
    grid.innerHTML = '';
  }
}

function buildCard(v) {
  const id = v.id || v._id;
  const whatsappLink = buildWhatsappLink(v);
  const status = v.status && v.status !== 'disponivel'
    ? `<span class="badge-status ${escHtml(v.status)}">${escHtml(labelStatus(v.status))}</span>`
    : '';

  return `<article class="vehicle-card">
    <div class="card-img-link">
      ${status}
      <a href="veiculo.html?id=${escHtml(id)}">
        <img class="card-img" src="${escHtml(getVehicleCoverUrl(v))}" alt="${escHtml(v.titulo)}" loading="lazy">
      </a>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(v.titulo)}</h3>
      <div class="card-specs">
        <span><i class="bi bi-calendar3"></i>${escHtml(v.ano)}</span>
        <span><i class="bi bi-speedometer2"></i>${escHtml(formatKm(v.km))}</span>
        <span><i class="bi bi-fuel-pump"></i>${escHtml(v.combustivel)}</span>
      </div>
      <div class="card-price">${formatPreco(v.preco)}</div>
      <div class="card-actions">
        <a class="btn-wa" href="${escHtml(whatsappLink)}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp"><i class="bi bi-whatsapp"></i></a>
        <a class="btn-details" href="veiculo.html?id=${escHtml(id)}">Ver detalhes</a>
      </div>
    </div>
  </article>`;
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
        document.querySelectorAll('.wa-float, .whatsapp-float, .btn-whatsapp-header').forEach((el) => {
          if (el.tagName === 'A') el.href = `https://wa.me/${phone}?text=${msg}`;
        });
      }
    }
  } catch {
    storeWhatsapp = WA;
  }
}

function initCardImages(scope = document) {
  scope.querySelectorAll('.card-img').forEach((img) => {
    if (img.complete) {
      img.classList.add('loaded');
      return;
    }
    img.addEventListener('load', () => img.classList.add('loaded'));
    img.addEventListener('error', () => {
      img.removeAttribute('src');
      img.classList.add('loaded');
    });
  });
}

function updateMeta(v) {
  const title = v.titulo || buildVehicleName(v);
  const img = images[0] || '';
  const desc = `${title} - ${v.ano || ''} - ${formatPreco(v.preco)}`.replace(/\s+-\s+-/g, ' - ');
  setMeta('meta[property="og:title"]', `${title} | JScar`);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:image"]', img);
  setMeta('meta[property="og:url"]', location.href);
  setMeta('meta[name="twitter:title"]', `${title} | JScar`);
  setMeta('meta[name="twitter:description"]', desc);
  setMeta('meta[name="twitter:image"]', img);
  setMeta('meta[name="description"]', `${title} na JScar Veículos. ${desc}`);
}

function getVehicleImages(v) {
  const imageList = Array.isArray(v.images) && v.images.length ? v.images : v.imagens;
  return (Array.isArray(imageList) ? imageList : [])
    .filter((img) => img?.url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function getVehicleCoverUrl(v) {
  const image = getVehicleImages(v)[0];
  return getImageUrl(image?.url || v.imagem || v.image);
}

function getImageUrl(url) {
  if (!url) return '';
  return String(url).startsWith('http') ? url : `${API_ORIGIN}${url}`;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildVehicleName(v) {
  const title = String(v.titulo || '').trim();
  if (title) return title;
  return [v.marca, v.modelo, v.ano]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' ') || 'veículo';
}

function buildWhatsappLink(v) {
  const phone = normalizePhone(v.whatsapp) || normalizePhone(storeWhatsapp) || WA;
  const message = `Olá! Tenho interesse na ${buildVehicleName(v)}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatPreco(preco) {
  const text = String(preco || '');
  const cents = text.includes(',');
  const n = Number(text.replace(/[^\d]/g, '')) / (cents ? 100 : 1);
  if (!n) return 'Consulte';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatKm(km) {
  const raw = String(km || '').trim();
  if (!raw) return '';
  const n = Number(raw.replace(/[^\d]/g, ''));
  return n ? `${n.toLocaleString('pt-BR')} km` : raw;
}

function labelStatus(s) {
  return {
    disponivel: 'Disponível',
    reservado: 'Reservado',
    vendido: 'Vendido',
  }[String(s || '').toLowerCase()] || s;
}

function labelCategoria(value) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function initTheme() {
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  const apply = (mode) => {
    document.body.classList.toggle('light-mode', mode === 'light');
    if (icon) icon.className = mode === 'light' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    localStorage.setItem('jscar-theme', mode);
  };
  apply(localStorage.getItem('jscar-theme') || 'dark');
  btn?.addEventListener('click', () => apply(document.body.classList.contains('light-mode') ? 'dark' : 'light'));
}

function initHeader() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', scrollY > 60), { passive: true });
}

function initMobileMenu() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  const overlay = document.getElementById('mobileNavOverlay') || document.getElementById('navOverlay');
  if (!btn || !nav || !overlay) return;

  const close = () => {
    btn.classList.remove('open');
    nav.classList.remove('open');
    overlay.classList.remove('visible');
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  btn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    btn.classList.toggle('open', open);
    nav.classList.toggle('open', open);
    overlay.classList.toggle('visible', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });

  overlay.addEventListener('click', close);
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
}

function initReveal() {
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function setMeta(selector, value) {
  document.querySelector(selector)?.setAttribute('content', value || '');
}

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
