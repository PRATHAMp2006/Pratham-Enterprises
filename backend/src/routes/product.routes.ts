import { Router } from 'express';
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Everyone (including customers) can view products
router.get('/', authenticateToken, getAllProducts);
router.get('/:id', authenticateToken, getProductById);

// Only ADMIN can manage products
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'MANAGER']), createProduct);
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'MANAGER']), updateProduct);
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteProduct);

export default router;
