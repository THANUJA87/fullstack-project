const express = require('express');
const permissionController = require('../controllers/permissionController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { allowRoles, requirePermission } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, requirePermission('users.update'), asyncHandler(permissionController.listPermissions));
router.post('/', authenticate, requirePermission('permissions.manage'), allowRoles('SUPER_ADMIN'), asyncHandler(permissionController.createPermission));
router.delete('/:key', authenticate, requirePermission('permissions.manage'), allowRoles('SUPER_ADMIN'), asyncHandler(permissionController.deletePermission));
router.get('/roles/:role/permissions', authenticate, requirePermission('permissions.manage'), allowRoles('SUPER_ADMIN'), asyncHandler(permissionController.getRolePermissions));
router.put('/roles/:role/permissions', authenticate, requirePermission('permissions.manage'), allowRoles('SUPER_ADMIN'), asyncHandler(permissionController.updateRolePermissions));

module.exports = router;
