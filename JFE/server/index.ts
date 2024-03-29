import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
// ------------------- Environment Variables -------------------
import dotenv, { config } from 'dotenv';
// ------------------- Imports -------------------
import MongoStore from 'connect-mongo';
import session from 'express-session';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
// ------------------- Config Imports -------------------
import cors from './config/cors.config';
import { initializePassport } from './config/passport.config';
// import sessionConfig from './config/session/session.config';
// ------------------- Route Imports -------------------
import userRoutes from './routes/user/user.routes';
import workflowRequests from './routes/workflow/workflow.routes';
import jobRequest from './routes/jobs/jobRequest.routes';
import sampleRoutes from './routes/sample/sample.route';
import k8sApi from './routes/k8s/k8sApi.routes';
// ------------------- Controller Imports -------------------
import { createUser } from './controllers/user/user.controller';
// ------------------- Model Imports -------------------
import authRoutes from './routes/auth/auth.routes';
// ------------------- Environment Variables -------------------
dotenv.config();
// Determine the environment mode
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
// For production, secrets are read from Docker secrets using docker swarm
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

// TODO: move function to a separate file
// Function to get configuration either from Docker secrets or environment variables
function getConfigValue(key: string): string {
  if (isProduction) {
    try {
      // Production mode: Try reading the secret from Docker secret file
      return fs.readFileSync(`/run/secrets/${key}`, 'utf8').trim();
    } catch (err) {
      console.warn(`Warning: Could not read the secret "${key}". Falling back to environment variable.`);
    }
  }
  // Fallback for production if secret not found or in development mode
  console.log(`Using environment variable for ${key}`);
  return process.env[key] || '';
}

// ------------------- Config Values -------------------
const port = process.env.PORT || '3000';
const dbUri = getConfigValue('DB_URI');
console.log(`DB_URI: ${dbUri}`);
const sessionSecret = getConfigValue('SESSION_SECRET');
console.log(`SESSION_SECRET: ${sessionSecret}`);
const app = express();
// ------------------- Session -------------------
const sessionConfig = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: dbUri }),
  cookie: {
    secure: isProduction, // Set to true if site is on HTTPS
    maxAge: 1000 * 60 * 60 * 24 // : 24 hours
  }
});
//------------------- MongoDB -------------------
if (!dbUri) {
  throw new Error("DB_URI is not defined");
}
mongoose.connect(dbUri)
  .then(() => console.log('MongoDB connection established successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));
//------------------- Session -------------------
app.use(sessionConfig);
// ------------------- CORS -------------------
app.use(cors);
//------------------- Passport -------------------
initializePassport(app);
//------------------- Middleware -------------------
app.use(express.json()); // For parsing application/json
app.use(cookieParser()); // For parsing cookies
// ------------------- Routes -------------------
app.use('/auth' , authRoutes)
app.use('/api/k8', k8sApi);
app.use('/api', userRoutes);
app.use('/api' , workflowRequests);
app.use('/api', jobRequest);
app.use('/api', authRoutes);
app.post('/users', createUser);
// ------------------- Sample Route -------------------
app.get('/', sampleRoutes );
// ------------------- Error Handling -------------------
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
// ------------------- Server Start -------------------
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});