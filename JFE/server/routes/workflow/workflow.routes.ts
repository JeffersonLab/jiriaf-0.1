import express from 'express';
import { createWorkflow, deleteWorkflowFromDB, deleteAllWorkflowsByUser } from '../../controllers/workflow/workflow.controller';

const router = express.Router();

router.post('/workflows', createWorkflow);
router.delete('/workflows', deleteWorkflowFromDB);
router.delete('/workflows/delete-all-by-user', deleteAllWorkflowsByUser);

export default router;
