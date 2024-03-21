import express from 'express';
import Workflow from '../../models/workflow/workflow.model'; 

const router = express.Router();

// Controller to get job data
export const getJobs = async (req: express.Request, res: express.Response) => {
    try {
        const jobs = await Workflow.find();
        res.json(jobs);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
};

export default router;

