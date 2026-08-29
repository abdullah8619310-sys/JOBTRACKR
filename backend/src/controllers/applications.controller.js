const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const {
  createApplicationSchema,
  updateApplicationSchema,
  idParamSchema,
} = require('../validators/applications.validator');

async function createApplication(req, res) {
  const data = createApplicationSchema.parse(req.body);
  const application = await prisma.jobApplication.create({ data });
  res.status(201).json(application);
}

async function listApplications(req, res) {
  const applications = await prisma.jobApplication.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json(applications);
}

async function getApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application) {
    throw new AppError('Job application not found', 404);
  }

  res.status(200).json(application);
}

async function updateApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateApplicationSchema.parse(req.body);

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Job application not found', 404);
  }

  const application = await prisma.jobApplication.update({ where: { id }, data });
  res.status(200).json(application);
}

async function deleteApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Job application not found', 404);
  }

  await prisma.jobApplication.delete({ where: { id } });
  res.status(204).send();
}

module.exports = {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
  deleteApplication,
};
