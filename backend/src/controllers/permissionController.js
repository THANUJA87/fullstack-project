const permissionService = require('../services/permissionService');
const { handleServiceError } = require('../utils/errors');

async function listPermissions(req, res) {
  try {
    const permissions = await permissionService.listPermissions();
    res.json(permissions);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function createPermission(req, res) {
  try {
    const key = String(req.body.key || '').trim();
    const label = String(req.body.label || '').trim();
    const permission = await permissionService.createPermission({ key, label });
    res.status(201).json(permission);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function deletePermission(req, res) {
  try {
    await permissionService.deletePermission(req.params.key);
    res.status(204).end();
  } catch (err) {
    handleServiceError(res, err);
  }
}

module.exports = { listPermissions, createPermission, deletePermission };
