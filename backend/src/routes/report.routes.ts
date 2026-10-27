import { Router } from 'express';
import { getDashboardMetrics, submitFeedback } from '../controllers/report.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Only ADMIN, MANAGER, and CRM can view metrics
router.get('/metrics', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), getDashboardMetrics);

// Customers can submit feedback
router.post('/feedback/:id', authenticateToken, authorizeRole(['CUSTOMER']), submitFeedback);

export default router;
