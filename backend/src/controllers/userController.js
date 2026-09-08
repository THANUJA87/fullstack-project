const userService = require('../services/userService');
const { handleServiceError } = require('../utils/errors');

async function listUsers(req, res) {
  try {
    const users = await userService.listUsers(req.user);
    res.json(users);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.user, req.body);
    res.status(201).json(user);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.user, req.params.id, req.body);
    res.json(user);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function updateUserStatus(req, res) {
  try {
    const user = await userService.updateUserStatus(req.user, req.params.id, req.body.isActive);
    res.json(user);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function setUserPermissions(req, res) {
  try {
    const result = await userService.setUserPermissions(
      req.user,
      req.params.id,
      req.body.permissions
    );
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function assignTenant(req, res) {
  try {
    const user = await userService.assignTenant(req.user, req.params.id, req.body.tenantId);
    res.json(user);
  } catch (err) {
    handleServiceError(res, err);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  setUserPermissions,
  assignTenant,
};
