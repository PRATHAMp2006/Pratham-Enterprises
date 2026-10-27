import { Request, Response } from 'express';
import { prisma } from '../index';

export const createServiceRequest = async (req: Request | any, res: Response) => {
  try {
    const { description, scheduledDate } = req.body;
    
    // User role is from token
    const user = req.user;
    
    let customerId = req.body.customerId;
    
    // If user is CUSTOMER, they can only request for themselves
    if (user.role === 'CUSTOMER') {
      const profile = await prisma.customerProfile.findUnique({
        where: { userId: user.id }
      });
      if (!profile) return res.status(404).json({ message: 'Customer profile not found' });
      customerId = profile.customerId;
    }

    if (!customerId || !description) {
      return res.status(400).json({ message: 'CustomerId and description are required' });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const newRequest = await prisma.serviceRequest.create({
      data: {
        customerId,
        description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        otpCode,
      }
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getServiceRequests = async (req: Request | any, res: Response) => {
  try {
    const user = req.user;
    let whereClause = {};

    if (user.role === 'CUSTOMER') {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
      whereClause = { customerId: profile?.customerId };
    } else if (user.role === 'TECHNICIAN') {
      const profile = await prisma.technicianProfile.findUnique({ where: { userId: user.id } });
      whereClause = { assignedTechId: profile?.technicianId };
    }

    const requests = await prisma.serviceRequest.findMany({
      where: whereClause,
      include: {
        customer: { include: { user: { select: { name: true, phone: true, email: true } } } },
        technician: { include: { user: { select: { name: true, phone: true } } } },
        serviceReport: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // If user is not customer, or we want to hide OTP from technicians until they need it?
    // Actually, we'll let the frontend decide, but let's make sure otpCode is sent.
    
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const assignTechnician = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;

    const updatedRequest = await prisma.serviceRequest.update({
      where: { id },
      data: { assignedTechId: technicianId }
    });

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateServiceStatus = async (req: Request | any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, beforeImageUrl, afterImageUrl, nextServiceDate, otp, partsReplaced, partNumber, customerSignature } = req.body;
    
    // Create or update the service report
    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (status === 'COMPLETED') {
      if (!otp || request.otpCode !== otp) {
        return res.status(400).json({ message: 'Invalid OTP provided by customer' });
      }
    }

    await prisma.serviceRequest.update({
      where: { id },
      data: { status, notes }
    });

    if (status === 'COMPLETED' || beforeImageUrl || afterImageUrl) {
      await prisma.serviceReport.upsert({
        where: { requestId: id },
        update: {
          status,
          notes,
          ...(beforeImageUrl && { beforeImageUrl }),
          ...(afterImageUrl && { afterImageUrl }),
          ...(nextServiceDate && { nextServiceDate: new Date(nextServiceDate) }),
          ...(partsReplaced && { partsReplaced }),
          ...(partNumber && { partNumber }),
          ...(customerSignature && { customerSignature })
        },
        create: {
          requestId: id,
          status,
          notes,
          beforeImageUrl,
          afterImageUrl,
          nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
          partsReplaced,
          partNumber,
          customerSignature
        }
      });
    }

    res.json({ message: 'Service status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
