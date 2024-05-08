import express from 'express';
import * as userController from '../../controllers/user/user.controller';
// import { ensureAuthenticated } from '../../middleware/auth/auth.middleware';
// import { createUser } from '../../controllers/user/user.controller';
import { getUserInfoFromToken } from '../../middleware/jwt/jwt.middleware';
import { Request, Response } from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/users', userController.getAllUsers);
router.post('/user/role', userController.updateUserRole);
router.post('/user/delete', userController.deleteUser);

router.get('/user/profile', passport.authenticate('session'), (req, res, next) => {
    // console.log('Authenticated user:', req.user);
    next();
  }, userController.getUserRole);
router.get('/user/email', async (req: Request, res: Response) => {
    const accessToken  = req.cookies.token;
    console.log('Access Token:', accessToken);  
    if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
    }
    try {
        const { email } = await getUserInfoFromToken(accessToken as string);
        console.log('Email:', email);
        res.json({ email });
    } catch (error) {
        console.error('Failed to retrieve email:', error);
        res.status(500).json({ error: 'Failed to retrieve email' });
    }
});


export default router;