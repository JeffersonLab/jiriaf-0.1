import express from 'express';
import * as authController from '../../controllers/auth/auth.controller'
import passport from 'passport';

const router = express.Router();

router.post('/login', authController.login);
// router.get('/currentUser', authController.currentUser);
// Route for initiating authentication with CILogon
router.get('/cilogon',
passport.authenticate('cilogon', { 
  scope: ['openid', 'email', 'profile']
}));
// Callback route after authentication with CILogon
router.get('/cilogon/callback', authController.handleTokenExchange);
//TODO: move to auth controller
router.post('/logout', (req, res, next) => { 
  req.logout(function(err) {
    if (err) { 
    return next(err);
  }
  req.session.destroy(function(err) {
    if (err) {
      return next(err);
    }
    res.clearCookie('connect.sid',{ path: '/' });
    res.clearCookie('token',{ path: '/' });
    res.status(200).send({ message: 'Logged out successfully' });
  });
});
});

export default router;