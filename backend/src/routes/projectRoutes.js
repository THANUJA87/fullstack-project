const express = require('express');
const projectController = require('../controllers/projectController');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requirePermission('projects.read'),
  asyncHandler(projectController.listProjects)
);
router.get(
  '/:id',
  authenticate,
  requirePermission('projects.read'),
  asyncHandler(projectController.getProject)
);
router.post(
  '/',
  authenticate,
  requirePermission('projects.create'),
  asyncHandler(projectController.createProject)
);
router.put(
  '/:id',
  authenticate,
  requirePermission('projects.update'),
  asyncHandler(projectController.updateProject)
);
router.patch(
  '/:id',
  authenticate,
  requirePermission('projects.update'),
  asyncHandler(projectController.updateProject)
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('projects.delete'),
  asyncHandler(projectController.deleteProject)
);

module.exports = router;
