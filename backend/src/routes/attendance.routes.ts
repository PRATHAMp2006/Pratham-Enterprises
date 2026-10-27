import { Router } from 'express';
import { checkIn, checkOut, getAttendance } from '../controllers/attendance.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Technicians can check in and out
router.post('/check-in', authenticateToken, authorizeRole(['TECHNICIAN']), checkIn);
router.post('/check-out', authenticateToken, authorizeRole(['TECHNICIAN']), checkOut);

// Admins and CRM can view all attendance, Technicians can view their own
router.get('/', authenticateToken, getAttendance);

export default router;
