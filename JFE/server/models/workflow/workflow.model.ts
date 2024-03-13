import mongoose from 'mongoose';
import { start } from 'repl';

interface IWorkflow {
  user: string;
  name: string;
  cpu: number;
  memory: number;
  time: string;
  nodeType: string;
  site: string;
  app: string;
  jobType: string;
  status: string;
}

const workflowSchema = new mongoose.Schema<IWorkflow>({
  user: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  cpu: {
    type: Number,
    required: true
  },
  memory: {
    type: Number,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  nodeType: {
    type: String,
    required: true
  },
  site: {
    type: String,
    required: true
  },
  app: {
    type: String,
    required: true
  },
  jobType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending'
  }
});

const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);

export default Workflow;
