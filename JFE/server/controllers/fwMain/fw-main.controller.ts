import { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';

export const runScript = (req: Request, res: Response, callback: Function) => {
    const { nnodes, nodetype, walltime, nodename, site, account } = req.body;
    
    const scriptPath = path.join(__dirname, '../../scripts/launch.sh');
    
    const envVars = {
        nnodes: nnodes || 2,
        nodetype: nodetype || 'cpu',
        walltime: walltime || '00:05:00',
        nodename: nodename || 'vk-nersc-test',
        site: site || 'perlmutter',
        account: account || 'm3792',
        custom_metrics_ports: ''
    };

    const envString = Object.entries(envVars).map(([key, value]) => `${key}=${value}`).join(' ');

    exec(`env ${envString} ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error}`);
            return res.status(500).send(`Error executing script: ${error.message}`);
        }

        if (stderr) {
            console.error(`Script stderr: ${stderr}`);
            return res.status(500).send(`Script stderr: ${stderr}`);
        }

        console.log(`Script stdout: ${stdout}`);
        callback();
    });
};
