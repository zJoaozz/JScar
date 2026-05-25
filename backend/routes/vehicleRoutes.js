const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const compressImages = require('../middleware/compressImages');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/vehicleController');

router.get('/', ctrl.getVehicles);
router.get('/stats', auth, ctrl.getStats);
router.get('/:id', ctrl.getVehicleById);
router.post('/', auth, upload.array('imagens', 15), compressImages, ctrl.createVehicle);
router.put('/:id', auth, upload.array('imagens', 15), compressImages, ctrl.updateVehicle);
router.patch('/:id/destaque', auth, ctrl.toggleDestaque);
router.patch('/:id/hero', auth, ctrl.updateHero);
router.patch('/:id/status', auth, ctrl.updateStatus);
router.post('/:id/view', ctrl.incrementViews);
router.delete('/:id', auth, ctrl.deleteVehicle);

module.exports = router;
