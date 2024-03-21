import cors from 'cors';
export const corsOptions = {
    origin: 'http://localhost:4200', // TODO: add production URL
    credentials: true,
    optionsSuccessStatus: 200
  };
  export default cors(corsOptions);