import passport from 'passport';
import { Strategy as OpenIDStrategy, VerifyCallback } from 'passport-openidconnect';
import fs from 'fs';

function getConfigValue(key: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    try {
      return fs.readFileSync(`/run/secrets/${key}`, 'utf8').trim();
    } catch (err) {
      console.warn(`Warning: Could not read the secret "${key}". Falling back to environment variable.`);
    }
  }
  return process.env[key] || '';
}

export const initializePassport = (app: any) => {
  passport.use('cilogon', new OpenIDStrategy({
      issuer: 'https://cilogon.org',
      authorizationURL: 'https://cilogon.org/authorize',
      tokenURL: 'https://cilogon.org/oauth2/token',
      userInfoURL: 'https://cilogon.org/oauth2/userinfo',
      clientID: getConfigValue('CILOGON_CLIENT_ID'),
      clientSecret: getConfigValue('CILOGON_CLIENT_SECRET'),
      callbackURL: 'http://localhost:3000/auth/cilogon/callback',
      scope: ['openid', 'email', 'profile']
    },
    (issuer: string, profile: any, done: VerifyCallback) => { 
      const user = { issuer, profile}; 
      return done(null, user);
    }
  ));

  // Session serialization
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj: object, done) => {
    done(null, obj);
  });

  app.use(passport.initialize());
  app.use(passport.session());
};
export default passport;
