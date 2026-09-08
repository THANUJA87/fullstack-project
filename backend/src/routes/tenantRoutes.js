const express = require('express');
const tenantController = require('../controllers/tenantController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requirePermission('users.read'),
  asyncHandler(tenantController.listTenants)
);
router.post(
  '/',
  authenticate,
  requirePermission('permissions.manage'),
  asyncHandler(tenantController.createTenant)
);

module.exports = router;
