//TODO: move sessionConfig back to session.config.ts
// import session from 'express-session';
// // import fs from 'fs';

// // Assuming getConfigValue is defined here or imported
// // function getConfigValue(key: string): string {
// //   const isProduction = process.env.NODE_ENV === 'production';
// //   if (isProduction) {
// //     try {
// //       return fs.readFileSync(`/run/secrets/${key}`, 'utf8').trim();
// //     } catch (err) {
// //       console.warn(`Warning: Could not read the secret "${key}". Falling back to environment variable.`);
// //     }
// //   }
// //   return process.env[key] || '';
// // }

// // const sessionSecret = getConfigValue('SESSION_SECRET');
// // // if (!sessionSecret) {
// // //   throw new Error("SESSION_SECRET is not defined");
// // // }
// const sessionSecret = process.env.SESSION_SECRET;
// // if (!sessionSecret) {
// //   throw new Error("SESSION_SECRET is not defined");
// // }


// export default sessionConfig;
