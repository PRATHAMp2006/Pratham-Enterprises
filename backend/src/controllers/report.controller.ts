import { Request, Response } from 'express';
import { prisma } from '../index';

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const totalCustomers = await prisma.customerProfile.count();
    const totalTechnicians = await prisma.technicianProfile.count();
    
    const pendingServices = await prisma.serviceRequest.count({
      where: { status: 'PENDING' }
    });
    
    const completedServices = await prisma.serviceRequest.count({
      where: { status: 'COMPLETED' }
    });

    const revenueResult = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true
      },
      where: { status: 'PAID' } // Or all if you want to show total billed
    });

    const recentRequests = await prisma.serviceRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { include: { user: { select: { name: true } } } },
        technician: { include: { user: { select: { name: true } } } }
      }
    });

    res.json({
      totalCustomers,
      totalTechnicians,
      pendingServices,
      completedServices,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      recentRequests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Service Report ID
    const { rating, feedback } = req.body;

    const report = await prisma.serviceReport.update({
      where: { id },
      data: { rating, feedback }
    });

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
