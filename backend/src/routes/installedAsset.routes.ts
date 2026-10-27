import { Router } from 'express';
import {
  createInstalledAsset,
  getInstalledAssets,
  getInstalledAssetById,
  updateInstalledAsset,
  deleteInstalledAsset,
} from '../controllers/installedAsset.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// List assets (scoped by role: customer sees theirs, tech sees authorized, admin/crm sees all)
router.get('/', authenticateToken, getInstalledAssets);

// Asset detail with warranty, AMC contracts and full service history
router.get('/:id', authenticateToken, getInstalledAssetById);

// Register a new asset (Admins, Managers, CRM and Customers for themselves)
router.post(
  '/',
  authenticateToken,
  authorizeRole(['ADMIN', 'MANAGER', 'CRM', 'CUSTOMER']),
  createInstalledAsset
);

// Update an asset (Admins, Managers, CRM)
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['ADMIN', 'MANAGER', 'CRM']),
  updateInstalledAsset
);

// Delete an asset (Admin only, safety-checked)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['ADMIN']),
  deleteInstalledAsset
);

export default router;
