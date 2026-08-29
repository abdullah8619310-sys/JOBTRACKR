const { Router } = require('express');
const controller = require('../controllers/applications.controller');

const router = Router();

router.post('/', controller.createApplication);
router.get('/', controller.listApplications);
router.get('/:id', controller.getApplication);
router.put('/:id', controller.updateApplication);
router.delete('/:id', controller.deleteApplication);

module.exports = router;
