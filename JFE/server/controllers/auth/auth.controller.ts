// controllers/auth.controller.ts
import { Request, Response } from 'express';
import passport from '../../config/passport.config'; 
import { exchangeCodeForToken, } from '../../middleware/jwt/jwt.middleware';
import { getUserInfoFromToken } from '../../middleware/jwt/jwt.middleware';

import { User } from '../../models/user/user.model';

export const cilogonCallback = (req: any, res: any, next: any) => {
    passport.authenticate('cilogon', {
        successRedirect: '/user/profile',
        failureRedirect: '/login'
    })(req, res, next);
};
export const handleTokenExchange = async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Code is required');
    }
  
    try {
      const tokenData = await exchangeCodeForToken(code as string);
      // console.log('Token Data:', tokenData);
      res.cookie('token', tokenData.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      const {email} = await getUserInfoFromToken(tokenData.access_token);
      const user =  await User.find({email});
      const role = user[0].role;
      if(role === 'PENDING...'){
        res.redirect('http://localhost:4200/register-new-user');
      }
      else if(role === 'admin'){
        res.redirect('http://localhost:4200/dashboard');
      }
      else if(role === 'user'){
        res.redirect('http://localhost:4200/dashboard');
      }
      else{
        res.redirect('http://localhost:4200/login');
      }      
      
    } catch (error) {
      console.error('Token exchange failed:', error);
      res.status(500).send('Failed to exchange code for token');
    }
  };


  