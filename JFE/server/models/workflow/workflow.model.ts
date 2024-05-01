import mongoose from 'mongoose';
import { start } from 'repl';

interface IWorkflow {
  user: string;
  name: string;
  cpu: number;
  memory: number;
  wallTime: string;
  nodeType: string;
  site: string;
  app: string;
  jobType: string;
  status: string;
  image: string;
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
    required: false
  },
  memory: {
    type: Number,
    required: false
  },
  wallTime: {
    type: String,
    required: true
  },
  nodeType: {
    type: String,
    required: false
  },
  site: {
    type: String,
    required: true
  },
  app: {
    type: String,
    required: false
  },
  jobType: {
    type: String,
    required: false
  },
  image: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending'
  }
});
workflowSchema.pre('save', function(next) {
  // When site is 'jlab'
  if (this.site === 'jlab') {
    const requiredFields: Array<keyof IWorkflow> = ['user', 'name', 'cpu', 'memory', 'wallTime', 'nodeType', 'app', 'jobType', 'status', 'image'];
    for (const field of requiredFields) {
      if (!this[field as keyof IWorkflow]) {
        return next(new Error(`Field ${field} is required for site jlab`));
      }
    }
  }
  
  // When site is 'nersc'
  if (this.site === 'nersc') {
    const requiredFields: Array<keyof IWorkflow> = ['user', 'name', 'site', 'wallTime','status', 'image' ];
    for (const field of requiredFields) {
      if (!this[field as keyof IWorkflow]) {
        return next(new Error(`Field ${field} is required for site nersc`));
      }
    }
  }

  next();
});

const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);

export default Workflow;
