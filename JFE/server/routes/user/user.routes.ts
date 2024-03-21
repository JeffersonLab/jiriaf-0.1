import express from 'express';
import * as userController from '../../controllers/user/user.controller';
// import { ensureAuthenticated } from '../../middleware/auth/auth.middleware';
import { createUser } from '../../controllers/user/user.controller';
import { getUserInfoFromToken } from '../../middleware/jwt/jwt.middleware';
import { Request, Response } from 'express';

const router = express.Router();

// router.get('/profile', ensureAuthenticated, userController.getUserProfile);
router.post('/users', createUser);
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
// router.get('/user/details', authenticateAccessToken, (req, res) => {
//     // Assuming the user's session has the id_token
//     if (!req.session || !req.session.passport || !req.session.passport.user) {
//         return res.status(404).json({ message: 'User not found' });
//     }
    
//     const user = req.session.passport.user;
//     res.json({ email: user.profile.email, name: user.profile.displayName });
// });
export default router;