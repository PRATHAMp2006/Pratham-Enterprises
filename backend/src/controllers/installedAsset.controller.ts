import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

const createAssetSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  productId: z.string().optional().nullable(),
  modelName: z.string().min(1, 'Model name is required'),
  serialNumber: z.string().trim().optional().nullable(),
  installationDate: z.string().or(z.date()).optional(),
  warrantyStartDate: z.string().or(z.date()).optional().nullable(),
  warrantyEndDate: z.string().or(z.date()).optional().nullable(),
  installationAddress: z.string().min(1, 'Installation address is required'),
  installationNotes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']).default('ACTIVE'),
  installedByTechId: z.string().optional().nullable(),
});

const updateAssetSchema = z.object({
  customerId: z.string().optional(),
  productId: z.string().optional().nullable(),
  modelName: z.string().min(1).optional(),
  serialNumber: z.string().trim().optional().nullable(),
  installationDate: z.string().or(z.date()).optional(),
  warrantyStartDate: z.string().or(z.date()).optional().nullable(),
  warrantyEndDate: z.string().or(z.date()).optional().nullable(),
  installationAddress: z.string().min(1).optional(),
  installationNotes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']).optional(),
  installedByTechId: z.string().optional().nullable(),
});

/**
 * Register a new installed asset
 */
export const createInstalledAsset = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parseResult = createAssetSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const data = parseResult.data;

    // Resolve Customer
    let customer = await prisma.customerProfile.findUnique({
      where: { customerId: data.customerId },
    });
    if (!customer) {
      customer = await prisma.customerProfile.findUnique({
        where: { id: data.customerId },
      });
    }
    if (!customer) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }

    // Role check for customer
    if (user.role === 'CUSTOMER') {
      const selfProfile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
      if (!selfProfile || selfProfile.customerId !== customer.customerId) {
        return res.status(403).json({ message: 'Customers can only register assets for their own account' });
      }
    }

    // Resolve Product if provided
    let productIdToUse: string | null = null;
    if (data.productId && data.productId.trim() !== '') {
      const product = await prisma.product.findUnique({ where: { id: data.productId } });
      if (!product) {
        return res.status(404).json({ message: 'Selected product not found in inventory catalog' });
      }
      productIdToUse = product.id;
    }

    // Resolve Technician if provided
    let technicianIdToUse: string | null = null;
    if (data.installedByTechId && data.installedByTechId.trim() !== '') {
      let tech = await prisma.technicianProfile.findUnique({ where: { technicianId: data.installedByTechId } });
      if (!tech) {
        tech = await prisma.technicianProfile.findUnique({ where: { id: data.installedByTechId } });
      }
      if (tech) {
        technicianIdToUse = tech.technicianId;
      }
    }

    // Check duplicate serial number
    const trimmedSerial = data.serialNumber ? data.serialNumber.trim() : null;
    if (trimmedSerial && trimmedSerial !== '') {
      const existing = await prisma.installedAsset.findUnique({
        where: { serialNumber: trimmedSerial },
      });
      if (existing) {
        return res.status(400).json({
          message: `An installed asset with serial number '${trimmedSerial}' already exists`,
          field: 'serialNumber',
        });
      }
    }

    const installationDate = data.installationDate ? new Date(data.installationDate) : new Date();
    const warrantyStartDate = data.warrantyStartDate ? new Date(data.warrantyStartDate) : null;
    const warrantyEndDate = data.warrantyEndDate ? new Date(data.warrantyEndDate) : null;

    if (warrantyStartDate && warrantyEndDate && warrantyEndDate < warrantyStartDate) {
      return res.status(400).json({
        message: 'Warranty end date cannot be earlier than warranty start date',
        field: 'warrantyEndDate',
      });
    }

    const asset = await prisma.installedAsset.create({
      data: {
        customerId: customer.customerId,
        productId: productIdToUse,
        modelName: data.modelName,
        serialNumber: trimmedSerial && trimmedSerial !== '' ? trimmedSerial : null,
        installationDate,
        warrantyStartDate,
        warrantyEndDate,
        installationAddress: data.installationAddress,
        installationNotes: data.installationNotes || null,
        status: data.status,
        installedByTechId: technicianIdToUse,
      },
      include: {
        customer: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        product: true,
        installedBy: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    res.status(201).json(asset);
  } catch (error: any) {
    console.error('Error creating installed asset:', error);
    res.status(500).json({ message: 'Internal server error while creating asset' });
  }
};

/**
 * List installed assets with search, filters, pagination and role isolation
 */
export const getInstalledAssets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { search, status, warrantyStatus, customerId, productId, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const andConditions: any[] = [];

    // Role-based scoping
    if (user.role === 'CUSTOMER') {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
      if (!profile) return res.status(404).json({ message: 'Customer profile not found' });
      andConditions.push({ customerId: profile.customerId });
    } else if (user.role === 'TECHNICIAN') {
      const profile = await prisma.technicianProfile.findUnique({ where: { userId: user.id } });
      if (!profile) return res.status(404).json({ message: 'Technician profile not found' });
      // Technicians can only access assets they installed OR have an assigned service request for
      andConditions.push({
        OR: [
          { installedByTechId: profile.technicianId },
          { serviceRequests: { some: { assignedTechId: profile.technicianId } } },
        ],
      });
    }

    // Direct filters
    if (customerId) {
      andConditions.push({ customerId: String(customerId) });
    }

    if (productId) {
      andConditions.push({ productId: String(productId) });
    }

    if (status && status !== 'ALL') {
      andConditions.push({ status: String(status) });
    }

    const now = new Date();
    if (warrantyStatus === 'ACTIVE') {
      andConditions.push({ warrantyEndDate: { gte: now } });
    } else if (warrantyStatus === 'EXPIRED') {
      andConditions.push({ warrantyEndDate: { lt: now } });
    }

    // Free text search
    if (search && String(search).trim() !== '') {
      const query = String(search).trim();
      andConditions.push({
        OR: [
          { serialNumber: { contains: query } },
          { modelName: { contains: query } },
          { installationAddress: { contains: query } },
          { customer: { user: { name: { contains: query } } } },
          { customer: { user: { phone: { contains: query } } } },
          { product: { name: { contains: query } } },
        ],
      });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, assets] = await Promise.all([
      prisma.installedAsset.count({ where: whereClause }),
      prisma.installedAsset.findMany({
        where: whereClause,
        include: {
          customer: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
          product: true,
          installedBy: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
          _count: {
            select: {
              amcContracts: true,
              serviceRequests: true,
              serviceSchedules: true,
            },
          },
        },
        orderBy: { installationDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    // Attach computed warranty indicator
    const enrichedAssets = assets.map((asset) => {
      let computedWarranty = 'NO_WARRANTY';
      let daysRemaining: number | null = null;
      if (asset.warrantyEndDate) {
        const end = new Date(asset.warrantyEndDate);
        daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        computedWarranty = daysRemaining >= 0 ? 'ACTIVE' : 'EXPIRED';
      }
      return {
        ...asset,
        computedWarranty: {
          status: computedWarranty,
          daysRemaining,
        },
      };
    });

    res.json({
      data: enrichedAssets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching installed assets:', error);
    res.status(500).json({ message: 'Internal server error while fetching assets' });
  }
};

/**
 * Get single asset with complete installation info, warranty, AMC contracts and service history
 */
export const getInstalledAssetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const asset = await prisma.installedAsset.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        product: true,
        installedBy: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
        amcContracts: {
          orderBy: { startDate: 'desc' },
          include: {
            serviceSchedules: true,
          },
        },
        serviceSchedules: {
          orderBy: { dueDate: 'asc' },
        },
        serviceRequests: {
          include: {
            serviceReport: true,
            technician: {
              include: {
                user: { select: { name: true, phone: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ message: 'Installed asset not found' });
    }

    // Role-based permission check
    if (user.role === 'CUSTOMER') {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
      if (!profile || asset.customerId !== profile.customerId) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized to view this asset' });
      }
    } else if (user.role === 'TECHNICIAN') {
      const profile = await prisma.technicianProfile.findUnique({ where: { userId: user.id } });
      const isInstaller = asset.installedByTechId === profile?.technicianId;
      const isAssigned = asset.serviceRequests.some((r) => r.assignedTechId === profile?.technicianId);
      if (!isInstaller && !isAssigned) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized to view this asset' });
      }
    }

    const now = new Date();
    let warrantyStatus = 'NO_WARRANTY';
    let daysRemaining: number | null = null;
    if (asset.warrantyEndDate) {
      const end = new Date(asset.warrantyEndDate);
      daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      warrantyStatus = daysRemaining >= 0 ? 'ACTIVE' : 'EXPIRED';
    }

    res.json({
      ...asset,
      computedWarranty: {
        status: warrantyStatus,
        daysRemaining,
      },
    });
  } catch (error: any) {
    console.error('Error fetching asset detail:', error);
    res.status(500).json({ message: 'Internal server error while fetching asset details' });
  }
};

/**
 * Update an installed asset
 */
export const updateInstalledAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const parseResult = updateAssetSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const existingAsset = await prisma.installedAsset.findUnique({ where: { id } });
    if (!existingAsset) {
      return res.status(404).json({ message: 'Installed asset not found' });
    }

    const data = parseResult.data;

    // Check duplicate serial number if updated
    if (data.serialNumber !== undefined) {
      const trimmedSerial = data.serialNumber ? data.serialNumber.trim() : null;
      if (trimmedSerial && trimmedSerial !== '') {
        const duplicate = await prisma.installedAsset.findFirst({
          where: {
            serialNumber: trimmedSerial,
            NOT: { id },
          },
        });
        if (duplicate) {
          return res.status(400).json({
            message: `Serial number '${trimmedSerial}' is already in use by another asset`,
            field: 'serialNumber',
          });
        }
      }
    }

    // Resolve Customer if changed
    let customerIdToUpdate = existingAsset.customerId;
    if (data.customerId && data.customerId !== existingAsset.customerId) {
      let cust = await prisma.customerProfile.findUnique({ where: { customerId: data.customerId } });
      if (!cust) {
        cust = await prisma.customerProfile.findUnique({ where: { id: data.customerId } });
      }
      if (!cust) {
        return res.status(404).json({ message: 'Target customer profile not found' });
      }
      customerIdToUpdate = cust.customerId;
    }

    // Resolve Product if changed
    let productIdToUpdate = existingAsset.productId;
    if (data.productId !== undefined) {
      if (data.productId && data.productId.trim() !== '') {
        const prod = await prisma.product.findUnique({ where: { id: data.productId } });
        if (!prod) return res.status(404).json({ message: 'Product not found in catalog' });
        productIdToUpdate = prod.id;
      } else {
        productIdToUpdate = null;
      }
    }

    // Resolve Technician if changed
    let technicianIdToUpdate = existingAsset.installedByTechId;
    if (data.installedByTechId !== undefined) {
      if (data.installedByTechId && data.installedByTechId.trim() !== '') {
        let tech = await prisma.technicianProfile.findUnique({ where: { technicianId: data.installedByTechId } });
        if (!tech) {
          tech = await prisma.technicianProfile.findUnique({ where: { id: data.installedByTechId } });
        }
        technicianIdToUpdate = tech ? tech.technicianId : null;
      } else {
        technicianIdToUpdate = null;
      }
    }

    const updated = await prisma.installedAsset.update({
      where: { id },
      data: {
        ...(data.modelName && { modelName: data.modelName }),
        ...(data.serialNumber !== undefined && {
          serialNumber: data.serialNumber && data.serialNumber.trim() !== '' ? data.serialNumber.trim() : null,
        }),
        ...(data.installationDate && { installationDate: new Date(data.installationDate) }),
        ...(data.warrantyStartDate !== undefined && {
          warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : null,
        }),
        ...(data.warrantyEndDate !== undefined && {
          warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : null,
        }),
        ...(data.installationAddress && { installationAddress: data.installationAddress }),
        ...(data.installationNotes !== undefined && { installationNotes: data.installationNotes }),
        ...(data.status && { status: data.status }),
        customerId: customerIdToUpdate,
        productId: productIdToUpdate,
        installedByTechId: technicianIdToUpdate,
      },
      include: {
        customer: {
          include: { user: { select: { name: true, phone: true } } },
        },
        product: true,
        installedBy: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    res.json({ message: 'Installed asset updated successfully', asset: updated });
  } catch (error: any) {
    console.error('Error updating installed asset:', error);
    res.status(500).json({ message: 'Internal server error while updating asset' });
  }
};

/**
 * Delete an installed asset (Admin only)
 */
export const deleteInstalledAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await prisma.installedAsset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            amcContracts: true,
            serviceRequests: true,
          },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ message: 'Installed asset not found' });
    }

    // Safety check: prevent accidental cascade of active contracts or tickets
    if (asset._count.amcContracts > 0 || asset._count.serviceRequests > 0) {
      return res.status(400).json({
        message: 'Cannot delete asset with existing AMC contracts or service history. Mark it as DECOMMISSIONED instead.',
      });
    }

    await prisma.installedAsset.delete({ where: { id } });
    res.json({ message: 'Installed asset deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting installed asset:', error);
    res.status(500).json({ message: 'Internal server error while deleting asset' });
  }
};
