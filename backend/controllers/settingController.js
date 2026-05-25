const { supabase } = require('../config/supabase');

function mapSetting(setting) {
  if (!setting) return setting;
  return {
    ...setting,
    _id: setting.id,
    createdAt: setting.created_at,
    updatedAt: setting.updated_at,
  };
}

async function getOrCreateSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('settings')
    .insert({})
    .select('*')
    .single();

  if (createError) throw createError;
  return created;
}

exports.getSettings = async (_req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(mapSetting(settings));
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const allowed = ['nome', 'whatsapp', 'instagram', 'endereco', 'cidade', 'maps_url'];
    const data = {};

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) data[key] = String(req.body[key]).trim();
    });

    const settings = await getOrCreateSettings();
    const { data: updated, error } = await supabase
      .from('settings')
      .update(data)
      .eq('id', settings.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json(mapSetting(updated));
  } catch (err) {
    next(err);
  }
};
