import exp from 'constants';
import  { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (req: Request, res: Response) => {
    res.send('Welcome to the Express & TypeScript Server');
  });
  export default router;