const express = require('express');
const authController = require('../controllers/authController');
// Import validateSchema and the auth-specific schemas
const { validateSchema, authSchemas } = require('../middlewares/validator');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Use validateSchema with the appropriate Joi schema
router.post('/register', validateSchema(authSchemas.registerSchema), authController.register);
router.post('/login', validateSchema(authSchemas.loginSchema), authController.login);
router.post('/refresh', protect, validateSchema(authSchemas.refreshTokenSchema), authController.refresh);
router.post('/logout', protect, authController.logout);

module.exports = router;