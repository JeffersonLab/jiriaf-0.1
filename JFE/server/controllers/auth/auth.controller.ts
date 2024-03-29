// controllers/auth.controller.ts
import { Request, Response } from 'express';
import passport from '../../config/passport.config'; 
import { exchangeCodeForToken, } from '../../middleware/jwt/jwt.middleware';
import { get } from 'http';
import { User } from '../../models/user/user.model';

export const login = (req: { logIn: (arg0: any, arg1: (err: any) => any) => void; }, res: { redirect: (arg0: string) => any; }, next: (arg0: any) => any) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }
        req.logIn(user, (err: any) => {
            if (err) { return next(err); }
            return res.redirect('/user/profile');
        });
    })(req, res, next);
};

export const logout = (req: { logout: (arg0: () => void) => void; }, res: { redirect: (arg0: string) => void; }) => {
    req.logout(() => {
        res.redirect('/');
    });
};

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
      console.log('Token Data:', tokenData);
      res.cookie('token', tokenData.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      console.log('Token:', tokenData.access_token);
      
  
      res.redirect('http://localhost:4200/dashboard');
    } catch (error) {
      console.error('Token exchange failed:', error);
      res.status(500).send('Failed to exchange code for token');
    }
  };


  