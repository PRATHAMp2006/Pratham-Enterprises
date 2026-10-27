import { Router } from 'express';
import { createServiceRequest, getServiceRequests, assignTechnician, updateServiceStatus } from '../controllers/service.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Everyone can view their service requests (logic handled in controller)
router.get('/', authenticateToken, getServiceRequests);

// Customers and Admins can create requests
router.post('/', authenticateToken, authorizeRole(['CUSTOMER', 'ADMIN', 'MANAGER', 'CRM']), createServiceRequest);

// Only Admins can assign technicians
router.put('/:id/assign', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), assignTechnician);

// Technicians and Admins can update status and upload reports
router.put('/:id/status', authenticateToken, authorizeRole(['TECHNICIAN', 'ADMIN', 'MANAGER']), updateServiceStatus);

export default router;
