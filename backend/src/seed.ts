import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Admin Seed
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@pratham.com' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@pratham.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        name: 'Super Admin',
        phone: '0000000000',
      }
    });
    console.log('Admin user created: admin@pratham.com / admin123');
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Technician Seed
  const existingTech = await prisma.user.findFirst({
    where: { email: 'tech1@pratham.com' }
  });

  let techProfile = await prisma.technicianProfile.findFirst({
    where: { technicianId: 'TECH-001' }
  });

  if (!existingTech) {
    const hashedPassword = await bcrypt.hash('tech123', 10);
    const techUser = await prisma.user.create({
      data: {
        email: 'tech1@pratham.com',
        passwordHash: hashedPassword,
        role: 'TECHNICIAN',
        name: 'Ravi Technician',
        phone: '9876543210'
      }
    });
    
    techProfile = await prisma.technicianProfile.create({
      data: {
        userId: techUser.id,
        technicianId: 'TECH-001',
        availabilityStatus: 'AVAILABLE'
      }
    });
    console.log('Technician user created: tech1@pratham.com / tech123');
  } else {
    console.log('Technician user already exists.');
  }

  // 3. Products Seed (Water Purifier & Water Softener)
  let purifierProduct = await prisma.product.findFirst({
    where: { name: 'Pratham RO + UV + TDS Water Purifier 10L' }
  });

  if (!purifierProduct) {
    purifierProduct = await prisma.product.create({
      data: {
        name: 'Pratham RO + UV + TDS Water Purifier 10L',
        type: 'PRODUCT',
        description: 'Multi-stage RO purification with mineral cartridge, 10L storage tank',
        price: 15499,
        stock: 25,
        isActive: true,
      }
    });
    console.log('Product created: Pratham RO + UV + TDS Water Purifier');
  }

  let softenerProduct = await prisma.product.findFirst({
    where: { name: 'Pratham Automatic Water Softener 25L' }
  });

  if (!softenerProduct) {
    softenerProduct = await prisma.product.create({
      data: {
        name: 'Pratham Automatic Water Softener 25L',
        type: 'PRODUCT',
        description: 'Ion-exchange automatic water softener with digital regeneration controller',
        price: 32000,
        stock: 12,
        isActive: true,
      }
    });
    console.log('Product created: Pratham Automatic Water Softener 25L');
  }

  // 4. Sample Customer Asset & AMC Seed
  const customerProfile = await prisma.customerProfile.findFirst({
    include: { user: true }
  });

  if (customerProfile) {
    const assetSerial = 'PE-RO-2026-001';
    let asset = await prisma.installedAsset.findUnique({
      where: { serialNumber: assetSerial }
    });

    const now = new Date();
    const installDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const warrantyEnd = new Date(now.getTime() + 275 * 24 * 60 * 60 * 1000); // 1 year total

    if (!asset) {
      asset = await prisma.installedAsset.create({
        data: {
          customerId: customerProfile.customerId,
          productId: purifierProduct.id,
          modelName: 'Pratham RO + UV + TDS Water Purifier 10L',
          serialNumber: assetSerial,
          installationDate: installDate,
          warrantyStartDate: installDate,
          warrantyEndDate: warrantyEnd,
          installationAddress: customerProfile.address || 'Mysore City',
          installationNotes: 'Wall-mounted in kitchen next to sink. Pressure: 2.5 bar.',
          status: 'ACTIVE',
          installedByTechId: techProfile?.technicianId || 'TECH-001'
        }
      });
      console.log('Installed asset created: PE-RO-2026-001');
    }

    // 5. AMC Contract Seed
    const contractNo = 'AMC-2026-0001';
    let amc = await prisma.amcContract.findUnique({
      where: { contractNumber: contractNo }
    });

    const amcStart = new Date();
    const amcEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (!amc && asset) {
      amc = await prisma.amcContract.create({
        data: {
          contractNumber: contractNo,
          customerId: customerProfile.customerId,
          installedAssetId: asset.id,
          startDate: amcStart,
          endDate: amcEnd,
          contractAmount: 3500,
          includedVisits: 4,
          completedVisits: 1,
          status: 'ACTIVE',
          renewalStatus: 'NONE',
          renewalNotes: 'Comprehensive plan including sediment and carbon filter replacements.'
        }
      });
      console.log('AMC Contract created: AMC-2026-0001');
    }

    // 6. Service Schedule Seed
    if (asset && amc) {
      const nextDue = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days ahead
      const existingSchedule = await prisma.serviceSchedule.findFirst({
        where: { installedAssetId: asset.id, status: 'SCHEDULED' }
      });

      if (!existingSchedule) {
        await prisma.serviceSchedule.create({
          data: {
            installedAssetId: asset.id,
            amcContractId: amc.id,
            customerId: customerProfile.customerId,
            dueDate: nextDue,
            status: 'SCHEDULED',
            serviceType: 'PERIODIC_MAINTENANCE',
            notes: 'Q2 maintenance visit: sediment filter replacement and TDS level audit.'
          }
        });
        console.log('Service schedule created for asset PE-RO-2026-001');
      }
    }

    // 7. Notification Seed
    const existingNotif = await prisma.notification.findFirst({
      where: { userId: customerProfile.userId }
    });

    if (!existingNotif) {
      await prisma.notification.create({
        data: {
          userId: customerProfile.userId,
          title: 'Upcoming Scheduled Service',
          message: 'Your Pratham Water Purifier quarterly service is due in 14 days under AMC-2026-0001.',
          type: 'SERVICE_REMINDER'
        }
      });
      console.log('Sample notification created for customer');
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
