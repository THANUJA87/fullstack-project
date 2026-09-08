const express = require('express');
const permissionController = require('../controllers/permissionController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, requirePermission('users.read'), asyncHandler(permissionController.listPermissions));
router.post('/', authenticate, requirePermission('permissions.manage'), asyncHandler(permissionController.createPermission));
router.delete('/:key', authenticate, requirePermission('permissions.manage'), asyncHandler(permissionController.deletePermission));
router.get('/roles/:role/permissions', authenticate, requirePermission('permissions.manage'), asyncHandler(permissionController.getRolePermissions));
router.put('/roles/:role/permissions', authenticate, requirePermission('permissions.manage'), asyncHandler(permissionController.updateRolePermissions));

module.exports = router;
