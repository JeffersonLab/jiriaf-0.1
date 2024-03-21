// import { Request, Response, NextFunction } from 'express';XMLDocument 
// import passport from 'passport';

// // Middleware to ensure the user is authenticated
// export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
//   if (req.isAuthenticated()) {
//     return next();
//   }
//   res.redirect('/login');
// };

// // async function authenticateAccessToken(req, res, next) {
// //   const accessToken = req.cookies.access_token; // 
// //   if (!accessToken) {
// //     return res.status(401).send('Access Denied: No token provided.');
// //   }

// //   try {
// //     // Validate access token here
// //     // For example, by verifying it against your OAuth provider or using your signature verification if it's a JWT
// //     // This is highly dependent on how your authentication is set up
// //     const user = await verifyAccessToken(accessToken); 
// //     if (!user) {
// //       return res.status(401).send('Access Denied: Invalid token.');
// //     }
// //     req.user = user; // Attach the user to the request object
// //     next();
// //   } catch (error) {
// //     return res.status(401).send('Access Denied: Invalid token.');
// //   }
// // }