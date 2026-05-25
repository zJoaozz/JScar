const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/settingController');
const auth    = require('../middleware/auth');

router.get('/',  ctrl.getSettings);
router.put('/',  auth, ctrl.updateSettings);

module.exports = router;
