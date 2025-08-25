const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rolController');

router.get('/', rolController.getAll);
router.get('/:id/permisos', rolController.getPermisos);
router.put('/:id/permisos', rolController.updatePermisos);

module.exports = router;