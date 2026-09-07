const express = require('express');
const userController = require('../controllers/userController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { allowRoles } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(userController.listUsers));
router.post('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(userController.createUser));
router.patch('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(userController.updateUser));
router.patch('/:id/status', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(userController.updateUserStatus));
router.put('/:id/permissions', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), asyncHandler(userController.setUserPermissions));

module.exports = router;
