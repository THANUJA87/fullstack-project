const express = require('express');
const userController = require('../controllers/userController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, requirePermission('users.read'), asyncHandler(userController.listUsers));
router.post('/', authenticate, requirePermission('users.create'), asyncHandler(userController.createUser));
router.put('/:id', authenticate, requirePermission('users.update'), asyncHandler(userController.updateUser));
router.patch('/:id', authenticate, requirePermission('users.update'), asyncHandler(userController.updateUser));
router.patch('/:id/disable', authenticate, requirePermission('users.disable'), asyncHandler(userController.updateUserStatus));
router.patch('/:id/status', authenticate, requirePermission('users.disable'), asyncHandler(userController.updateUserStatus));
router.patch('/:id/tenant', authenticate, requirePermission('users.update'), asyncHandler(userController.assignTenant));
router.put('/:id/permissions', authenticate, requirePermission('permissions.manage'), asyncHandler(userController.setUserPermissions));

module.exports = router;
