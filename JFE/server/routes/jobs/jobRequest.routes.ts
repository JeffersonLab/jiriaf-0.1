import { Express } from "express";  
import { getJobs } from "../../controllers/jobRequests/jobRequest.controller";
import { Router } from "express";

const router = Router();

router.get('/jobRequest', getJobs);

export default router;