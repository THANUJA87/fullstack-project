const express = require('express');
const userController = require('../controllers/userController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { allowRoles, requirePermission } = require('../middleware/authorize');

const router = express.Router();

const manageUsers = allowRoles('SUPER_ADMIN', 'ADMIN');

router.get('/', authenticate, manageUsers, requirePermission('users.read'), asyncHandler(userController.listUsers));
router.post('/', authenticate, manageUsers, requirePermission('users.create'), asyncHandler(userController.createUser));
router.put('/:id', authenticate, manageUsers, requirePermission('users.update'), asyncHandler(userController.updateUser));
router.patch('/:id', authenticate, manageUsers, requirePermission('users.update'), asyncHandler(userController.updateUser));
router.patch('/:id/disable', authenticate, manageUsers, requirePermission('users.disable'), asyncHandler(userController.updateUserStatus));
router.patch('/:id/status', authenticate, manageUsers, requirePermission('users.disable'), asyncHandler(userController.updateUserStatus));
router.patch('/:id/tenant', authenticate, manageUsers, requirePermission('users.update'), asyncHandler(userController.assignTenant));
router.put('/:id/permissions', authenticate, manageUsers, requirePermission('users.update'), asyncHandler(userController.setUserPermissions));

module.exports = router;
