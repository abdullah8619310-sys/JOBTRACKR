const { Router } = require('express');
const controller = require('../controllers/applications.controller');

const router = Router();

router.post('/', controller.createApplication);
router.get('/', controller.listApplications);
// Must be registered before GET /:id — otherwise Express would match
// "stale" as the :id parameter and this route would never be reached.
router.get('/stale', controller.listStaleApplications);
router.get('/:id', controller.getApplication);
router.put('/:id', controller.updateApplication);
router.delete('/:id', controller.deleteApplication);
router.post('/:id/analyze', controller.analyzeApplication);
router.post('/:id/follow-up', controller.generateFollowUp);
router.post('/:id/compare-models', controller.compareModels);

module.exports = router;
