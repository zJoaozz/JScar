'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function compressImages(req, _res, next) {
  if (!req.files || req.files.length === 0) return next();

  const compressed = [];

  for (const file of req.files) {
    try {
      const finalFilename = file.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
      const finalPath = path.join(path.dirname(file.path), finalFilename);
      const tempPath = finalPath === file.path ? `${file.path}.tmp.webp` : finalPath;

      await sharp(file.path)
        .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(tempPath);

      if (tempPath !== file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (tempPath !== finalPath) fs.renameSync(tempPath, finalPath);

      compressed.push({ ...file, path: finalPath, filename: finalFilename, mimetype: 'image/webp' });
    } catch (err) {
      console.error(`Erro ao comprimir imagem ${file.originalname}:`, err.message);
      compressed.push(file);
    }
  }

  req.files = compressed;
  next();
}

module.exports = compressImages;
