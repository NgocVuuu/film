const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const { validateRequest, schemas } = require('../middleware/validationMiddleware');

// Public routes
router.post('/google', authController.googleLogin);
router.post('/register', validateRequest(schemas.register), authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', validateRequest(schemas.login), authController.login);
router.post('/forgot-password', validateRequest(schemas.forgotPassword), authController.forgotPassword);
router.put('/reset-password/:token', validateRequest(schemas.resetPassword), authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/update-profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
