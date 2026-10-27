import { Router } from 'express';
import { getAllUsers, getCustomers, getTechnicians, createTechnician, deleteUser, updateUser } from '../controllers/user.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Only ADMIN and CRM can access user lists
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), getAllUsers);
router.get('/customers', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM', 'TECHNICIAN']), getCustomers);
router.get('/technicians', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), getTechnicians);

// Only ADMIN can create/delete users
router.post('/technician', authenticateToken, authorizeRole(['ADMIN', 'MANAGER']), createTechnician);
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'MANAGER', 'CRM']), updateUser);
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteUser);

export default router;
