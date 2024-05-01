import { Request, Response } from 'express';
import Workflow from '../../models/workflow/workflow.model'
import { getUserInfoFromToken } from '../../middleware/jwt/jwt.middleware';

export const createWorkflow = async (req: Request, res: Response) => {
  try {
  
    const accessToken  = req.cookies.token;
    let userEmail = '';
    console.log('Access Token:', accessToken);  
    if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
    }
    try {
        const { email } = await getUserInfoFromToken(accessToken as string);
        console.log('Email:', email);
        userEmail = email;
    } catch (error) {
        console.error('Failed to retrieve email:', error);
        res.status(500).json({ error: 'Failed to retrieve email' });
    }


    const workflow = new Workflow({
      user: userEmail,
      name: req.body.jobName,
      cpu: req.body.cpu,
      memory: req.body.memory,
      wallTime: req.body.wallTime,
      nodeType: req.body.nodeType,
      site: req.body.site,
      app: req.body.app,
      jobType: req.body.jobType,
      image: req.body.image,
      status: 'pending', // TODO: update dynamically
    });    await workflow.save();
    res.status(201).send(workflow);
  } catch (error) {
    res.status(400).send(error);
  }
};
export const deleteWorkflowFromDB = async (req: Request, res: Response) => { 
  try { 
    const id  = req.body.workflowID;
    console.log('ID:', id);
    const workflow = await Workflow.findByIdAndDelete(id);
    if (!workflow) {
      res.status(404).send('Workflow not found');
    }
    res.send(workflow);
  }
  catch (error) {
    res.status(500).send(error);
}};
export const deleteAllWorkflowsByUser = async (req: Request, res: Response) => {
  try {
    const { user } = req.body;
    const workflows = await Workflow.deleteMany({ user });
    res.send(workflows);
  } catch (error) {
    res.status
    (500).send
    (error);
}};

