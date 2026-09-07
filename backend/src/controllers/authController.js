const authService = require('../services/authService');
const { handleServiceError } = require('../utils/errors');

async function login(req, res) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function getMe(req, res) {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    handleServiceError(res, err);
  }
}

module.exports = { login, getMe };
