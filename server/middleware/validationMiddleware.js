const Joi = require('joi');

const validateRequest = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const schemas = {
    register: Joi.object({
        displayName: Joi.string().min(3).required().messages({
            'string.base': 'Tên hiển thị phải là chuỗi',
            'string.min': 'Tên hiển thị phải có ít nhất 3 ký tự',
            'any.required': 'Vui lòng nhập tên hiển thị'
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Email không hợp lệ',
            'any.required': 'Vui lòng nhập email'
        }),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
            'any.required': 'Vui lòng nhập mật khẩu'
        })
    }),
    login: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email không hợp lệ',
            'any.required': 'Vui lòng nhập email'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Vui lòng nhập mật khẩu'
        })
    }),
    forgotPassword: Joi.object({
        email: Joi.string().email().required()
    }),
    resetPassword: Joi.object({
        password: Joi.string().min(6).required()
    })
};

module.exports = { validateRequest, schemas };
