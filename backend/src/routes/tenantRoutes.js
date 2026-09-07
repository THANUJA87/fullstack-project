const express = require('express');
const tenantController = require('../controllers/tenantController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { allowRoles } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(tenantController.listTenants));
router.post('/', authenticate, allowRoles('SUPER_ADMIN'), asyncHandler(tenantController.createTenant));

module.exports = router;
