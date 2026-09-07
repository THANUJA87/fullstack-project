const tenantService = require('../services/tenantService');
const { handleServiceError } = require('../utils/errors');

async function listTenants(req, res) {
  try {
    const tenants = await tenantService.listTenants(req.user);
    res.json(tenants);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function createTenant(req, res) {
  try {
    const name = String(req.body.name || '').trim();
    const slug = String(req.body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const tenant = await tenantService.createTenant({ name, slug });
    res.status(201).json(tenant);
  } catch (err) {
    handleServiceError(res, err);
  }
}

module.exports = { listTenants, createTenant };
