import { Request, Response } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        aadharNumber: true,
        bloodGroup: true,
        homeAddress: true,
        permanentAddress: true,
        personalEmail: true,
        personalPhone: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customerProfile.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTechnicians = async (req: Request, res: Response) => {
  try {
    const technicians = await prisma.technicianProfile.findMany({
      where: { user: { role: 'TECHNICIAN' } },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    res.json(technicians);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTechnician = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, aadharNumber, bloodGroup, homeAddress, permanentAddress, personalEmail, personalPhone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: 'TECHNICIAN',
        aadharNumber,
        bloodGroup,
        homeAddress,
        permanentAddress,
        personalEmail,
        personalPhone,
        technicianProfile: {
          create: {
            technicianId: `TECH-${Date.now()}`,
          },
        },
      },
      include: {
        technicianProfile: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, address, role, createdAt, aadharNumber, bloodGroup, homeAddress, permanentAddress, personalEmail, personalPhone, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true, technicianProfile: true }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (role && role !== user.role && role === 'TECHNICIAN' && !user.technicianProfile) {
      await prisma.technicianProfile.create({
        data: {
          userId: id,
          technicianId: `TECH-${Date.now()}`
        }
      });
    }

    let passwordHash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(role && { role }),
        ...(createdAt && { createdAt: new Date(createdAt) }),
        ...(aadharNumber !== undefined && { aadharNumber }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(homeAddress !== undefined && { homeAddress }),
        ...(permanentAddress !== undefined && { permanentAddress }),
        ...(personalEmail !== undefined && { personalEmail }),
        ...(personalPhone !== undefined && { personalPhone }),
        ...(passwordHash && { passwordHash }),
      }
    });

    if (user.role === 'CUSTOMER' && address) {
      await prisma.customerProfile.update({
        where: { userId: id },
        data: { address }
      });
    }

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true, technicianProfile: true }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prisma cascading deletes would be ideal, but manually deleting relations here for SQLite safety
    if (user.customerProfile) {
      await prisma.customerProfile.delete({ where: { userId: id } });
    }
    if (user.technicianProfile) {
      await prisma.technicianProfile.delete({ where: { userId: id } });
    }
    
    await prisma.user.delete({ where: { id } });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
