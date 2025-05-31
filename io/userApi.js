const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
// Import validateSchema and the user-specific schemas
const { validateSchema, userSchemas } = require('../middlewares/validator');

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.get('/me', userController.getMe);
router.put('/me', validateSchema(userSchemas.updateUserSchema), userController.updateMe); // Use validateSchema with Joi schema


router.put('/me/password', validateSchema(userSchemas.changePasswordSchema), userController.changePassword); // Use validateSchema with Joi schema

module.exports = router;