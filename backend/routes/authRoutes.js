const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const auth    = require('../middleware/auth');

router.post('/login',           ctrl.login);
router.get('/me',               auth, ctrl.me);
router.get('/setup',            ctrl.setup);
router.post('/setup',           ctrl.setup);
router.put('/change-password',  auth, ctrl.changePassword);

module.exports = router;
