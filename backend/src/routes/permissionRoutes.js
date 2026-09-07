const express = require('express');
const permissionController = require('../controllers/permissionController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { allowRoles } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(permissionController.listPermissions));
router.post('/', authenticate, allowRoles('SUPER_ADMIN'), asyncHandler(permissionController.createPermission));
router.delete('/:key', authenticate, allowRoles('SUPER_ADMIN'), asyncHandler(permissionController.deletePermission));

module.exports = router;
