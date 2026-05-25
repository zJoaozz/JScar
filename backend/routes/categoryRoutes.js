const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/categoryUpload');
const ctrl = require('../controllers/categoryController');

router.get('/', (req, res, next) => {
  if (req.query.includeInactive === 'true') return auth(req, res, () => ctrl.getCategories(req, res, next));
  return ctrl.getCategories(req, res, next);
});
router.get('/:slug', ctrl.getCategoryBySlug);
router.post('/', auth, upload.single('image'), ctrl.createCategory);
router.put('/:id', auth, upload.single('image'), ctrl.updateCategory);
router.delete('/:id', auth, ctrl.deleteCategory);
router.patch('/:id/status', auth, ctrl.updateStatus);
router.patch('/reorder', auth, ctrl.reorderCategories);

module.exports = router;
