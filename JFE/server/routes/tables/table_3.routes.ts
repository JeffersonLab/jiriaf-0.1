import  Router  from 'express';
import { metricsConnectionMiddleware } from '../../middleware/table_3/table_3.middleware';
import { getMetricsTable } from '../../controllers/tables/table_3.controller';

const router = Router();

router.get('/table_3', metricsConnectionMiddleware, getMetricsTable);

export = router;
