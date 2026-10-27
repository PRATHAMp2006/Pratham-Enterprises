import { Request, Response } from 'express';
import { prisma } from '../index';

export const checkIn = async (req: Request | any, res: Response) => {
  try {
    const user = req.user;
    const { location } = req.body;

    const profile = await prisma.technicianProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.status(404).json({ message: 'Technician profile not found' });

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        technicianId: profile.technicianId,
        date: { gte: today }
      }
    });

    if (existingAttendance && existingAttendance.checkIn) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        technicianId: profile.technicianId,
        date: new Date(),
        checkIn: new Date(),
        location
      }
    });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkOut = async (req: Request | any, res: Response) => {
  try {
    const user = req.user;
    
    const profile = await prisma.technicianProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.status(404).json({ message: 'Technician profile not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        technicianId: profile.technicianId,
        date: { gte: today }
      }
    });

    if (!existingAttendance) {
      return res.status(400).json({ message: 'Cannot check out before checking in' });
    }

    if (existingAttendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    const updated = await prisma.attendance.update({
      where: { id: existingAttendance.id },
      data: { checkOut: new Date() }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAttendance = async (req: Request | any, res: Response) => {
  try {
    const user = req.user;
    let technicianId = req.query.technicianId as string;

    if (user.role === 'TECHNICIAN') {
      const profile = await prisma.technicianProfile.findUnique({ where: { userId: user.id } });
      technicianId = profile?.technicianId || '';
    }

    const whereClause = technicianId ? { technicianId } : {};

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        technician: { include: { user: { select: { name: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(attendanceRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
