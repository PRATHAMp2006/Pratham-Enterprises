import { Router } from 'express';
import { createInvoice, generatePdf, getInvoices } from '../controllers/invoice.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Everyone can view invoices (filtered in controller)
router.get('/', authenticateToken, getInvoices);

// Only ADMIN can create invoices
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), createInvoice);

// Generate PDF
router.post('/:id/generate-pdf', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), generatePdf);

export default router;
