const { Router } = require('express');
const healthRoutes = require('./health.routes');
const applicationsRoutes = require('./applications.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/applications', applicationsRoutes);

module.exports = router;
