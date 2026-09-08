const projectService = require('../services/projectService');
const { handleServiceError } = require('../utils/errors');

async function listProjects(req, res) {
  try {
    const projects = await projectService.listProjects(req.user);
    res.json(projects);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function getProject(req, res) {
  try {
    const project = await projectService.getProject(req.user, req.params.id);
    res.json(project);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function createProject(req, res) {
  try {
    const project = await projectService.createProject(req.user, req.body);
    res.status(201).json(project);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function updateProject(req, res) {
  try {
    const project = await projectService.updateProject(
      req.user,
      req.params.id,
      req.body,
      req.method !== 'PUT'
    );
    res.json(project);
  } catch (err) {
    handleServiceError(res, err);
  }
}

async function deleteProject(req, res) {
  try {
    await projectService.deleteProject(req.user, req.params.id);
    res.status(204).end();
  } catch (err) {
    handleServiceError(res, err);
  }
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
