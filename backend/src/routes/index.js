const express = require('express');
const healthController = require('../controllers/healthController');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const authRoutes = require('./authRoutes');
const tenantRoutes = require('./tenantRoutes');
const projectRoutes = require('./projectRoutes');
const userRoutes = require('./userRoutes');
const permissionRoutes = require('./permissionRoutes');

const router = express.Router();

router.get('/health', healthController.healthCheck);
router.get('/me', authenticate, asyncHandler(authController.getMe));
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/projects', projectRoutes);
router.use('/users', userRoutes);
router.use('/permissions', permissionRoutes);

module.exports = router;
