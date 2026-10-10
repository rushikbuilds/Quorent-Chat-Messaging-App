const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const passport = require('../config/passport');
const jwtService = require('../services/jwt.service');

const isAllowedOrigin = (url) => {
    if (!url) return false;
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    if (allowedOrigins.includes(url)) return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) return true;
    if (url.includes('.trycloudflare.com') || url.includes('.github.io') || url.includes('quorent.xyz')) return true;
    return false;
};

async function oauthCallback(req, res) {
    // The returnUrl is passed as base64-encoded state param through the OAuth flow
    const requestedUrl = req.query.returnUrl
        ? decodeURIComponent(req.query.returnUrl)
        : (req.query.state ? Buffer.from(req.query.state, 'base64').toString() : null);

    const frontendUrl = requestedUrl && isAllowedOrigin(requestedUrl)
        ? requestedUrl
        : (process.env.FRONTEND_URL || 'http://localhost:3000');

    if (!req.user) return res.redirect(`${frontendUrl}/login?error=oauth_failed`);

    try {
        const { accessToken, refreshToken } = await jwtService.generateTokens(req.user);
        res.redirect(`${frontendUrl}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
        console.error('OAuth token generation error:', error);
        res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
}

// Google
router.get('/google', (req, res, next) => {
    const state = req.query.returnUrl
        ? Buffer.from(decodeURIComponent(req.query.returnUrl)).toString('base64')
        : undefined;
    passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }), oauthCallback);



router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyLoginOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/refresh-token', authController.refreshToken);
router.post('/register', authController.register);
router.post('/verify-registration-otp', authController.verifyRegistrationOTP);
router.post('/resend-registration-otp', authController.resendRegistrationOTP);
router.post('/cancel-registration', authController.cancelRegistration);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;