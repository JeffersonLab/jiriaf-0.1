import express from 'express';
import * as userController from '../../controllers/user/user.controller';
// import { ensureAuthenticated } from '../../middleware/auth/auth.middleware';
import { createUser } from '../../controllers/user/user.controller';
import { getUserInfoFromToken } from '../../middleware/jwt/jwt.middleware';
import { Request, Response } from 'express';
import passport from 'passport';

const router = express.Router();

// router.get('/profile', ensureAuthenticated, userController.getUserProfile);
router.post('/users', createUser);

router.get('/users', userController.getAllUsers);

router.get('/user/profile', passport.authenticate('session'), (req, res, next) => {
    console.log('Authenticated user:', req.user);
    next();
  }, userController.getUserProfile);
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

// Middleware to validate access tokens
const authenticateAccessToken = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const authHeader: string | undefined = req.headers['authorization'];
    const token: string | undefined = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.sendStatus(401);
        return;
    }    
    next();    // TODO:  validate the access token
};

export default router;