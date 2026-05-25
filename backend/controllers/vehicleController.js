const fs = require('fs/promises');
const path = require('path');
const { supabase } = require('../config/supabase');

const STATUS = ['disponivel', 'reservado', 'vendido'];
const CATEGORIAS = ['hatch', 'sedan', 'suv', 'picape'];
const BUCKET = process.env.SUPABASE_BUCKET || 'vehicles';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseMoney(value) {
  return Number(String(value || '0').replace(/[^\d]/g, '')) || 0;
}

function parseKm(value) {
  return Number(String(value || '0').replace(/[^\d]/g, '')) || 0;
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function normalizeBody(body) {
  const data = {};
  const fields = [
    'titulo', 'marca', 'modelo', 'ano', 'combustivel', 'cambio', 'km', 'preco',
    'cidade', 'cor', 'descricao', 'categoria', 'whatsapp', 'status',
  ];

  fields.forEach((key) => {
    if (body[key] !== undefined) data[key] = String(body[key]).trim();
  });

  if (typeof body.opcionais === 'string') {
    data.opcionais = body.opcionais.split(',').map((item) => item.trim()).filter(Boolean);
  } else if (Array.isArray(body.opcionais)) {
    data.opcionais = body.opcionais;
  }

  if (body.destaque !== undefined) data.destaque = normalizeBoolean(body.destaque);
  if (body.hero !== undefined) data.hero = normalizeBoolean(body.hero);
  if (data.categoria) data.categoria = slugify(data.categoria);
  if (data.status) data.status = data.status.toLowerCase();
  if (!data.status) delete data.status;

  return data;
}

function mapImage(image) {
  return {
    id: image.id,
    _id: image.id,
    url: image.url,
    filename: image.filename,
    position: image.position ?? 0,
    createdAt: image.created_at,
  };
}

function mapVehicle(vehicle) {
  const images = [...(vehicle.vehicle_images || vehicle.imagens || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(mapImage);
  const { vehicle_images: _vehicleImages, imagens: _legacyImages, ...data } = vehicle;

  return {
    ...data,
    _id: vehicle.id,
    images,
    imagens: images,
    image: images[0]?.url || vehicle.image || vehicle.imagem || '',
    imagem: images[0]?.url || vehicle.imagem || vehicle.image || '',
    createdAt: vehicle.created_at,
    updatedAt: vehicle.updated_at,
  };
}

function sortVehicles(vehicles, ordenacao = 'recente') {
  const list = [...vehicles];
  if (ordenacao === 'preco_asc') list.sort((a, b) => parseMoney(a.preco) - parseMoney(b.preco));
  else if (ordenacao === 'preco_desc') list.sort((a, b) => parseMoney(b.preco) - parseMoney(a.preco));
  else if (ordenacao === 'km_asc') list.sort((a, b) => parseKm(a.km) - parseKm(b.km));
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return list;
}

async function removeLocalFiles(files = []) {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
}

async function uploadImages(files = []) {
  const uploaded = [];

  for (const file of files) {
    const ext = path.extname(file.filename || file.originalname || '.webp') || '.webp';
    const storagePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const buffer = await fs.readFile(file.path);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.mimetype || 'image/webp',
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    uploaded.push({
      filename: storagePath,
      url: data.publicUrl,
    });
  }

  return uploaded;
}

async function insertImages(vehicleId, images) {
  if (!images.length) return [];

  const payload = images.map((image, index) => ({
    vehicle_id: vehicleId,
    url: image.url,
    filename: image.filename,
    position: image.position ?? index,
  }));

  const { data, error } = await supabase
    .from('vehicle_images')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return data || [];
}

async function replaceImages(vehicleId, images) {
  const { error: deleteError } = await supabase
    .from('vehicle_images')
    .delete()
    .eq('vehicle_id', vehicleId);

  if (deleteError) throw deleteError;
  return insertImages(vehicleId, images);
}

async function getVehicleRow(id) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, vehicle_images(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function parseImageOrder(value) {
  if (value === undefined) return null;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

exports.getVehicles = async (req, res, next) => {
  try {
    const {
      busca, marca, combustivel, categoria, destaque, hero, status,
      minPreco, maxPreco, ordenacao = 'recente', page = 1, limit = 12,
    } = req.query;

    let query = supabase.from('vehicles').select('*, vehicle_images(*)');

    if (busca) {
      const term = String(busca).replace(/[%]/g, '');
      query = query.or(`titulo.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%`);
    }
    if (marca) query = query.ilike('marca', String(marca));
    if (combustivel) query = query.ilike('combustivel', String(combustivel));
    // Categoria e filtrada em memoria para manter compatibilidade com valores antigos
    // como "SUV", "suv", "Elétrico" e "eletrico".
    if (status) query = query.eq('status', String(status).toLowerCase());
    if (destaque === 'true') query = query.eq('destaque', true);
    if (destaque === 'false') query = query.eq('destaque', false);
    if (hero === 'true') query = query.eq('hero', true);
    if (hero === 'false') query = query.eq('hero', false);

    const { data, error } = await query;
    if (error) throw error;

    let vehicles = data || [];

    if (categoria) {
      const categorySlug = slugify(categoria);
      vehicles = vehicles.filter((vehicle) => slugify(vehicle.categoria) === categorySlug);
    }

    if (minPreco || maxPreco) {
      const min = Number(minPreco || 0);
      const max = Number(maxPreco || Number.MAX_SAFE_INTEGER);
      vehicles = vehicles.filter((vehicle) => {
        const price = parseMoney(vehicle.preco);
        return price >= min && price <= max;
      });
    }

    vehicles = sortVehicles(vehicles, ordenacao);

    const total = vehicles.length;
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 12, 1);
    const totalPages = Math.max(Math.ceil(total / limitNum), 1);
    const start = (pageNum - 1) * limitNum;
    const pageData = vehicles.slice(start, start + limitNum).map(mapVehicle);

    res.json({ data: pageData, total, page: pageNum, limit: limitNum, totalPages });
  } catch (err) {
    next(err);
  }
};

exports.getVehicleById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID do veiculo nao informado.' });
  }

  try {
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (vehicleError) {
      if (vehicleError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Veiculo nao encontrado.' });
      }
      console.error(`[getVehicleById] vehicleError id=${id} | ${vehicleError.message}`);
      return res.status(500).json({ success: false, message: 'Erro ao buscar veiculo.' });
    }

    const { data: images, error: imagesError } = await supabase
      .from('vehicle_images')
      .select('id, vehicle_id, url, filename, position, created_at')
      .eq('vehicle_id', id)
      .order('position', { ascending: true });

    if (imagesError) {
      console.error(`[getVehicleById] imagesError id=${id} | ${imagesError.message}`);
    }

    const mappedImages = (images || []).map(mapImage);
    return res.json({
      success: true,
      data: {
        ...vehicle,
        _id: vehicle.id,
        images: mappedImages,
        imagens: mappedImages,
        image: mappedImages[0]?.url || '',
        imagem: mappedImages[0]?.url || '',
        createdAt: vehicle.created_at,
        updatedAt: vehicle.updated_at,
      },
    });
  } catch (err) {
    console.error(`[getVehicleById] id=${id} | ${err.name}: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao buscar veiculo.' });
  }
};

exports.createVehicle = async (req, res, next) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.titulo || !data.marca || !data.modelo || !data.ano) {
      return res.status(400).json({ message: 'Titulo, marca, modelo e ano sao obrigatorios.' });
    }

    if (data.status && !STATUS.includes(data.status)) {
      return res.status(400).json({ message: 'Status invalido.' });
    }

    if (data.hero) {
      const { error: heroError } = await supabase.from('vehicles').update({ hero: false }).eq('hero', true);
      if (heroError) throw heroError;
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;

    const uploadedImages = await uploadImages(req.files || []);
    const order = parseImageOrder(req.body.imageOrder);

    if (order) {
      const orderedImages = [];
      order.forEach((ref) => {
        if (ref.type === 'new' && uploadedImages[ref.idx]) {
          orderedImages.push(uploadedImages[ref.idx]);
        }
      });
      await insertImages(vehicle.id, orderedImages.length ? orderedImages : uploadedImages);
    } else {
      await insertImages(vehicle.id, uploadedImages);
    }
    await removeLocalFiles(req.files || []);

    const created = await getVehicleRow(vehicle.id);
    res.status(201).json(mapVehicle(created));
  } catch (err) {
    await removeLocalFiles(req.files || []);
    err.status = err.status || 400;
    next(err);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const existing = await getVehicleRow(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Veiculo nao encontrado.' });

    const data = normalizeBody(req.body);
    if (data.status && !STATUS.includes(data.status)) {
      return res.status(400).json({ message: 'Status invalido.' });
    }

    if (data.hero) {
      const { error: heroError } = await supabase
        .from('vehicles')
        .update({ hero: false })
        .neq('id', req.params.id)
        .eq('hero', true);
      if (heroError) throw heroError;
    }

    delete data.imageOrder;

    const { error } = await supabase
      .from('vehicles')
      .update(data)
      .eq('id', req.params.id);

    if (error) throw error;

    const order = parseImageOrder(req.body.imageOrder);
    if (order) {
      const existingImages = existing.vehicle_images || [];
      const existingById = new Map(existingImages.map((image) => [String(image.id), image]));
      const existingByFilename = new Map(existingImages.map((image) => [image.filename, image]));
      const existingByUrl = new Map(existingImages.map((image) => [image.url, image]));
      const uploaded = await uploadImages(req.files || []);
      const nextImages = [];
      const seenImages = new Set();

      order.forEach((ref) => {
        if (ref.type === 'existing') {
          const image = existingById.get(String(ref.id)) || existingByFilename.get(ref.filename) || existingByUrl.get(ref.url);
          const key = image?.id || image?.filename || image?.url;
          if (image && !seenImages.has(key)) {
            seenImages.add(key);
            nextImages.push({ url: image.url, filename: image.filename });
          }
        }
        if (ref.type === 'new' && uploaded[ref.idx]) {
          nextImages.push(uploaded[ref.idx]);
        }
      });

      await replaceImages(req.params.id, nextImages.length ? nextImages : existingImages);
    } else if (req.files?.length) {
      const uploaded = await uploadImages(req.files);
      const currentCount = existing.vehicle_images?.length || 0;
      await insertImages(req.params.id, uploaded.map((image, index) => ({ ...image, position: currentCount + index })));
    }

    await removeLocalFiles(req.files || []);

    const updated = await getVehicleRow(req.params.id);
    res.json(mapVehicle(updated));
  } catch (err) {
    await removeLocalFiles(req.files || []);
    err.status = err.status || 400;
    next(err);
  }
};

exports.deleteVehicle = async (req, res, next) => {
  try {
    const existing = await getVehicleRow(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Veiculo nao encontrado.' });

    const { error } = await supabase.from('vehicles').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ message: 'Veiculo removido com sucesso.' });
  } catch (err) {
    next(err);
  }
};

exports.toggleDestaque = async (req, res, next) => {
  try {
    const existing = await getVehicleRow(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Veiculo nao encontrado.' });

    const destaque = req.body.destaque === undefined ? !existing.destaque : normalizeBoolean(req.body.destaque);
    const { data, error } = await supabase
      .from('vehicles')
      .update({ destaque })
      .eq('id', req.params.id)
      .select('id,destaque')
      .single();

    if (error) throw error;
    res.json({ _id: data.id, id: data.id, destaque: data.destaque });
  } catch (err) {
    next(err);
  }
};

exports.updateHero = async (req, res, next) => {
  try {
    const hero = req.body.hero === undefined ? true : normalizeBoolean(req.body.hero);
    const existing = await getVehicleRow(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Veiculo nao encontrado.' });

    if (hero) {
      const { error: clearError } = await supabase
        .from('vehicles')
        .update({ hero: false })
        .neq('id', req.params.id)
        .eq('hero', true);
      if (clearError) throw clearError;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update({ hero })
      .eq('id', req.params.id)
      .select('id,hero')
      .single();

    if (error) throw error;
    res.json({ _id: data.id, id: data.id, hero: data.hero });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const status = String(req.body.status || '').toLowerCase();
    if (!STATUS.includes(status)) return res.status(400).json({ message: 'Status invalido.' });

    const { data, error } = await supabase
      .from('vehicles')
      .update({ status })
      .eq('id', req.params.id)
      .select('id,status')
      .single();

    if (error) throw error;
    res.json({ _id: data.id, id: data.id, status: data.status });
  } catch (err) {
    next(err);
  }
};

exports.incrementViews = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, visualizacoes')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Veiculo nao encontrado.' });
      }
      throw fetchError;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update({ visualizacoes: (existing.visualizacoes || 0) + 1 })
      .eq('id', id)
      .select('id, visualizacoes')
      .single();

    if (error) throw error;
    res.json({ success: true, _id: data.id, id: data.id, visualizacoes: data.visualizacoes });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('categoria,status,destaque');

    if (error) throw error;

    const all = data || [];
    const categorias = [...new Set([...CATEGORIAS, ...all.map((vehicle) => vehicle.categoria).filter(Boolean)])];
    const porCategoria = Object.fromEntries(categorias.map((key) => [key, 0]));
    const porStatus = Object.fromEntries(STATUS.map((key) => [key, 0]));

    all.forEach((vehicle) => {
      if (porCategoria[vehicle.categoria] !== undefined) porCategoria[vehicle.categoria] += 1;
      if (porStatus[vehicle.status] !== undefined) porStatus[vehicle.status] += 1;
    });

    res.json({
      total: all.length,
      destaques: all.filter((vehicle) => vehicle.destaque).length,
      porCategoria,
      porStatus,
    });
  } catch (err) {
    next(err);
  }
};

exports.patchDestaque = exports.toggleDestaque;
