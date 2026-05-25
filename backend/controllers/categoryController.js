const fs = require('fs/promises');
const path = require('path');
const { supabase } = require('../config/supabase');

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

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    image_url: row.image_url || '',
    imageUrl: row.image_url || '',
    icon: row.icon || '',
    sort_order: row.sort_order ?? 0,
    sortOrder: row.sort_order ?? 0,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function removeLocalFile(file) {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
}

async function uploadCategoryImage(file, slug) {
  if (!file) return null;

  const ext = path.extname(file.filename || file.originalname || '.webp').toLowerCase() || '.webp';
  const storagePath = `categories/${slug || 'categoria'}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const buffer = await fs.readFile(file.path);

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.mimetype || 'image/webp',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function normalizeBody(body) {
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);

  return {
    name,
    slug,
    description: body.description !== undefined ? String(body.description || '').trim() : undefined,
    icon: body.icon !== undefined ? String(body.icon || '').trim() : undefined,
    sort_order: body.sort_order !== undefined ? Number(body.sort_order) || 0 : undefined,
    active: body.active !== undefined ? normalizeBoolean(body.active) : undefined,
  };
}

exports.getCategories = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    if (includeInactive && !req.user) return res.status(401).json({ success: false, message: 'Token de autenticacao nao fornecido.' });

    let query = supabase
      .from('vehicle_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (!includeInactive) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: (data || []).map(mapCategory) });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('slug', slugify(req.params.slug))
      .maybeSingle();

    if (error) throw error;
    if (!data || data.active === false) return res.status(404).json({ success: false, message: 'Categoria nao encontrada.' });
    res.json({ success: true, data: mapCategory(data) });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const payload = normalizeBody(req.body);
    if (!payload.name || !payload.slug) return res.status(400).json({ success: false, message: 'Nome e slug sao obrigatorios.' });

    const imageUrl = await uploadCategoryImage(req.file, payload.slug);
    if (imageUrl) payload.image_url = imageUrl;

    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from('vehicle_categories')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: mapCategory(data) });
  } catch (err) {
    err.status = err.status || 400;
    next(err);
  } finally {
    await removeLocalFile(req.file);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const payload = normalizeBody(req.body);
    if (!payload.name) delete payload.name;
    if (!payload.slug) delete payload.slug;

    const imageUrl = await uploadCategoryImage(req.file, payload.slug || req.body.currentSlug);
    if (imageUrl) payload.image_url = imageUrl;

    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from('vehicle_categories')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, data: mapCategory(data) });
  } catch (err) {
    err.status = err.status || 400;
    next(err);
  } finally {
    await removeLocalFile(req.file);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { data: category, error: catError } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (catError) throw catError;
    if (!category) return res.status(404).json({ success: false, message: 'Categoria nao encontrada.' });

    const { data: vehicles, error: vehicleError } = await supabase.from('vehicles').select('id,categoria');
    if (vehicleError) throw vehicleError;

    const inUse = (vehicles || []).some((vehicle) => slugify(vehicle.categoria) === category.slug);
    if (inUse) {
      return res.status(409).json({
        success: false,
        message: 'Esta categoria está em uso por veículos cadastrados.',
      });
    }

    const { error } = await supabase.from('vehicle_categories').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Categoria removida com sucesso.' });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const active = normalizeBoolean(req.body.active);
    const { data, error } = await supabase
      .from('vehicle_categories')
      .update({ active })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, data: mapCategory(data) });
  } catch (err) {
    next(err);
  }
};

exports.reorderCategories = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    for (const [index, item] of items.entries()) {
      const { error } = await supabase
        .from('vehicle_categories')
        .update({ sort_order: Number(item.sort_order ?? item.sortOrder ?? index) || 0 })
        .eq('id', item.id);
      if (error) throw error;
    }

    res.json({ success: true, message: 'Ordem atualizada.' });
  } catch (err) {
    next(err);
  }
};

exports.slugify = slugify;
