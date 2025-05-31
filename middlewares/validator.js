const Joi = require('joi'); // Import Joi
const { BadRequestError } = require('../utils/appError'); // Ensure this is imported

// Your provided validateSchema middleware, adapted to throw AppError
const validateSchema = (schema, property = 'body') => (req, res, next) => {
    // { abortEarly: false } collects all validation errors
    // { allowUnknown: true } allows properties not defined in the schema (useful for other middleware adding data)
    const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: false }); // Changed allowUnknown to false for stricter validation

    if (error) {
        const details = {};
        error.details.forEach(detail => {
            // Joi's detail.message often includes quotes, like ""email" is required"
            // detail.context.key is the field name
            details[detail.context.key] = detail.message.replace(/"(.*?)"/g, '$1').trim(); // Remove quotes around field names
        });
        // Throw a BadRequestError, which our global errorHandler will catch and format
        return next(new BadRequestError('Validation failed', details));
    }
    next();
};

// --- Joi Validation Schemas ---

const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Valid email is required',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
    }),
    username: Joi.string().min(3).required().messages({
        'string.min': 'Username must be at least 3 characters long',
        'any.required': 'Username is required',
    }),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Valid email is required',
        'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required',
    }),
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Refresh token is required',
    }),
});

const updateUserSchema = Joi.object({
    username: Joi.string().min(3).messages({
        'string.min': 'Username must be at least 3 characters long',
    }),
    email: Joi.string().email().messages({
        'string.email': 'Valid email is required',
    }),
}).min(1).messages({ // Ensure at least one field is provided for update
    'object.min': 'At least one field (username or email) is required for update.',
});


const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'New password must be at least 6 characters long',
        'any.required': 'New password is required',
    }),
});

module.exports = {
    validateSchema,
    // Export schemas grouped for cleaner import in routes
    authSchemas: {
        registerSchema,
        loginSchema,
        refreshTokenSchema,
    },
    userSchemas: {
        updateUserSchema,
        changePasswordSchema,
    }
};