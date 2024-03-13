import { Request, Response } from 'express';

export const getMetricsTable = (req: Request, res: Response) => {
  const ws = res.locals.ws; 

  ws.on('message', (data: string) => {
    console.log('Data received: ', data);
    res.json(JSON.parse(data));
  });

  ws.send('get_node_metrics'); // Send the request to the WebSocket server

  ws.on('error', (error: Error) => {
    console.error('WebSocket error: ', error);
    res.status(500).send('WebSocket connection error');
  });

};
