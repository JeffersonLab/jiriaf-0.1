import express from 'express';
import { createWorkflow } from '../../controllers/workflow/workflow.controller';

const router = express.Router();

router.post('/workflows', createWorkflow);

export default router;
