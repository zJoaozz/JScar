const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  return cb(new Error('Tipo de arquivo nao permitido. Use JPG, JPEG, PNG ou WebP.'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});
