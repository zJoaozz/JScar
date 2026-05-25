const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const ADMIN_ALREADY_CREATED_MESSAGE =
  'A conta admin já foi criada. Não é possível criar outro administrador.';
const ADMIN_SETUP_EMAIL_NOT_ALLOWED_MESSAGE =
  'Este e-mail não está autorizado para criar a conta admin.';
const ADMIN_LOGIN_EMAIL_NOT_ALLOWED_MESSAGE =
  'Este e-mail não está autorizado como administrador.';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, nome: user.nome },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function safeUser(user) {
  return { id: user.id, _id: user.id, email: user.email, nome: user.nome, role: user.role };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getAllowedAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL);
}

function isAllowedAdminEmail(email) {
  const allowedEmail = getAllowedAdminEmail();
  if (!allowedEmail) return true;
  return normalizeEmail(email) === allowedEmail;
}

async function getAdminCount() {
  const { count, error } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha sao obrigatorios.' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedAdminEmail(normalizedEmail)) {
      return res.status(403).json({
        success: false,
        message: ADMIN_LOGIN_EMAIL_NOT_ALLOWED_MESSAGE,
      });
    }

    const { data: user, error } = await supabase
      .from('app_users')
      .select('id,email,password_hash,nome,role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ message: 'Credenciais invalidas.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Credenciais invalidas.' });

    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id,email,nome,role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });

    res.json(safeUser(user));
  } catch (err) {
    next(err);
  }
};

exports.setup = async (req, res, next) => {
  try {
    const count = await getAdminCount();

    if (req.method === 'GET') {
      return res.json({ hasAdmin: count > 0 });
    }

    if (count > 0) {
      return res.status(403).json({
        success: false,
        message: ADMIN_ALREADY_CREATED_MESSAGE,
      });
    }

    const { email, password, nome } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha sao obrigatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedAdminEmail(normalizedEmail)) {
      return res.status(403).json({
        success: false,
        message: ADMIN_SETUP_EMAIL_NOT_ALLOWED_MESSAGE,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('app_users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        nome: nome?.trim() || 'Admin',
        role: 'admin',
      })
      .select('id,email,nome,role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: ADMIN_ALREADY_CREATED_MESSAGE,
        });
      }
      throw error;
    }

    res.status(201).json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Nova senha deve ter pelo menos 6 caracteres.' });
    }

    const { data: user, error } = await supabase
      .from('app_users')
      .select('id,password_hash')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Senha atual incorreta.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ password_hash: passwordHash })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    next(err);
  }
};
