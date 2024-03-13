import { Request, Response, NextFunction } from 'express';
import WebSocket from 'ws';

export function metricsConnectionMiddleware(req: Request, res: Response, next: NextFunction) {
    const ws = new WebSocket('ws://localhost:8765');

    ws.on('open', () => {
        console.log('[EXPRESS_LOG]: WebSocket connection established');
        // Attach WebSocket to response object to use in controller
        res.locals.ws = ws;
        next();
    });

    ws.on('error', (error: Error) => {
        console.log('WebSocket error: ', error);
        res.status(500).send('WebSocket connection error');
    });

    // Close WebSocket connection when response ends
    res.on('finish', () => {
        console.log('Closing WebSocket connection');
        ws.close();
    });
}
