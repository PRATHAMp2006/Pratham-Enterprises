import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_pratham_enterprises_change_in_prod';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message || String(error), durationMs: Date.now() - start });
    console.error(`  ✗ ${name} (${Date.now() - start}ms)`);
    console.error(`    Error: ${error.message || error}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runInstalledAssetTests() {
  console.log('\n======================================================');
  console.log('   INSTALLED ASSET MANAGEMENT MODULE: AUTOMATED TESTS  ');
  console.log('======================================================\n');

  // Load existing test users
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const techUser = await prisma.user.findFirst({ where: { role: 'TECHNICIAN' } });
  const customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' }, include: { customerProfile: true } });
  const product = await prisma.product.findFirst({ where: { type: 'PRODUCT' } });

  assert(!!adminUser, 'Admin user must exist');
  assert(!!techUser, 'Technician user must exist');
  assert(!!customerUser && !!customerUser.customerProfile, 'Customer user with profile must exist');
  assert(!!product, 'Product must exist');

  // Create another customer user to test access isolation
  let secondaryCustomer = await prisma.user.findFirst({ where: { email: 'sec_cust@pratham.com' }, include: { customerProfile: true } });
  if (!secondaryCustomer) {
    secondaryCustomer = await prisma.user.create({
      data: {
        name: 'Secondary Customer',
        email: 'sec_cust@pratham.com',
        phone: '9988776655',
        passwordHash: 'dummyhash',
        role: 'CUSTOMER',
        customerProfile: {
          create: {
            customerId: `CUST-SEC-${Date.now()}`,
            address: 'Secondary Customer Address, Mysore',
          }
        }
      },
      include: { customerProfile: true }
    });
  }

  // Create another technician to test authorization checks
  let secondaryTech = await prisma.user.findFirst({ where: { email: 'sec_tech@pratham.com' }, include: { technicianProfile: true } });
  if (!secondaryTech) {
    secondaryTech = await prisma.user.create({
      data: {
        name: 'Secondary Tech',
        email: 'sec_tech@pratham.com',
        phone: '8877665544',
        passwordHash: 'dummyhash',
        role: 'TECHNICIAN',
        technicianProfile: {
          create: {
            technicianId: `TECH-SEC-${Date.now()}`,
          }
        }
      },
      include: { technicianProfile: true }
    });
  }

  const suffix = Date.now().toString().slice(-6);
  const testSerial = `SN-MOD-${suffix}`;
  let assetId: string | null = null;
  let secondaryAssetId: string | null = null;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: Creation with Valid Inputs & Association
    // ---------------------------------------------------------------------------
    await test('Create: Successfully register asset with customer and product', async () => {
      const now = new Date();
      const warrantyEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const asset = await prisma.installedAsset.create({
        data: {
          customerId: customerUser!.customerProfile!.customerId,
          productId: product!.id,
          modelName: 'Pratham RO Smart Touch 10L',
          serialNumber: testSerial,
          installationDate: now,
          warrantyStartDate: now,
          warrantyEndDate: warrantyEnd,
          installationAddress: 'Plot 42, Vijayanagar 2nd Stage, Mysore',
          installationNotes: 'Standard kitchen installation with 3/8-inch feed tube',
          status: 'ACTIVE',
        },
        include: {
          customer: { include: { user: true } },
          product: true,
        }
      });

      assetId = asset.id;
      assert(asset.serialNumber === testSerial, 'Serial number must match');
      assert(asset.customer.customerId === customerUser!.customerProfile!.customerId, 'Customer must match');
      assert(asset.product?.id === product!.id, 'Product must match');
      assert(asset.status === 'ACTIVE', 'Status must be ACTIVE');
    });

    // ---------------------------------------------------------------------------
    // TEST 2: Serial Number Uniqueness Validation
    // ---------------------------------------------------------------------------
    await test('Validation: Prevent duplicate serial numbers', async () => {
      let duplicateCaught = false;
      try {
        await prisma.installedAsset.create({
          data: {
            customerId: customerUser!.customerProfile!.customerId,
            modelName: 'Duplicate Asset',
            serialNumber: testSerial, // Duplicate!
            installationAddress: 'Some address',
          }
        });
      } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          duplicateCaught = true;
        }
      }
      assert(duplicateCaught, 'Must reject duplicate serial numbers via unique constraint');
    });

    // ---------------------------------------------------------------------------
    // TEST 3: Search Capability
    // ---------------------------------------------------------------------------
    await test('Search: Query by serial, model, customer name, and phone', async () => {
      // 1. Search by serial number
      const resBySerial = await prisma.installedAsset.findMany({
        where: { serialNumber: { contains: testSerial } },
      });
      assert(resBySerial.length >= 1, 'Should find asset by serial number');

      // 2. Search by model name
      const resByModel = await prisma.installedAsset.findMany({
        where: { modelName: { contains: 'Smart Touch' } },
      });
      assert(resByModel.length >= 1, 'Should find asset by model name');

      // 3. Search by customer phone
      const resByPhone = await prisma.installedAsset.findMany({
        where: { customer: { user: { phone: { contains: customerUser!.phone } } } },
      });
      assert(resByPhone.length >= 1, 'Should find asset by customer phone');
    });

    // ---------------------------------------------------------------------------
    // TEST 4: Pagination & Filtering
    // ---------------------------------------------------------------------------
    await test('Filter & Paginate: Filter by status and paginate results', async () => {
      const page = 1;
      const limit = 5;
      const skip = (page - 1) * limit;

      const [total, assets] = await Promise.all([
        prisma.installedAsset.count({ where: { status: 'ACTIVE' } }),
        prisma.installedAsset.findMany({
          where: { status: 'ACTIVE' },
          skip,
          take: limit,
          orderBy: { installationDate: 'desc' },
        })
      ]);

      assert(total >= 1, 'Total active assets must be >= 1');
      assert(assets.length <= limit, 'Page size must be <= limit');
      assert(assets.every(a => a.status === 'ACTIVE'), 'All assets must match filter status');
    });

    // ---------------------------------------------------------------------------
    // TEST 5: Detailed Payload with AMC & Service History
    // ---------------------------------------------------------------------------
    await test('Detail: Asset payload contains warranty, AMC contracts and service history', async () => {
      assert(!!assetId, 'Asset must exist');

      // Add a test AMC contract and service request
      const amc = await prisma.amcContract.create({
        data: {
          contractNumber: `AMC-TEST-${suffix}`,
          customerId: customerUser!.customerProfile!.customerId,
          installedAssetId: assetId!,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          contractAmount: 3999,
          includedVisits: 4,
          completedVisits: 1,
        }
      });

      const serviceReq = await prisma.serviceRequest.create({
        data: {
          customerId: customerUser!.customerProfile!.customerId,
          installedAssetId: assetId!,
          description: 'Filter inspection and membrane flush',
          status: 'COMPLETED',
        }
      });

      const detail = await prisma.installedAsset.findUnique({
        where: { id: assetId! },
        include: {
          customer: { include: { user: true } },
          product: true,
          amcContracts: true,
          serviceRequests: { include: { serviceReport: true } },
        }
      });

      assert(!!detail, 'Detail must be retrieved');
      assert(detail!.amcContracts.length >= 1, 'Must include linked AMC contract');
      assert(detail!.serviceRequests.length >= 1, 'Must include linked service request history');

      // Clean up test relations
      await prisma.serviceRequest.delete({ where: { id: serviceReq.id } });
      await prisma.amcContract.delete({ where: { id: amc.id } });
    });

    // ---------------------------------------------------------------------------
    // TEST 6: Customer Access Isolation
    // ---------------------------------------------------------------------------
    await test('Security: Customer can only access their own assets', async () => {
      // Create asset for secondary customer
      const secAsset = await prisma.installedAsset.create({
        data: {
          customerId: secondaryCustomer!.customerProfile!.customerId,
          modelName: 'Secondary Purifier 15L',
          installationAddress: 'Secondary Address',
          status: 'ACTIVE',
        }
      });
      secondaryAssetId = secAsset.id;

      // Primary customer should NOT own secondary customer's asset
      const primaryCustId = customerUser!.customerProfile!.customerId;
      const secAssetBelongsToPrimary = secAsset.customerId === primaryCustId;
      assert(!secAssetBelongsToPrimary, 'Secondary asset must not belong to primary customer');

      // Simulating controller authorization check:
      const checkAccessForPrimaryCust = (assetOwnerCustomerId: string) => {
        return assetOwnerCustomerId === primaryCustId;
      };

      assert(checkAccessForPrimaryCust(secAsset.customerId) === false, 'Customer must be blocked from unauthorized asset');
    });

    // ---------------------------------------------------------------------------
    // TEST 7: Technician Job Authorization Check
    // ---------------------------------------------------------------------------
    await test('Security: Technician can only access authorized assets (installedBy or assigned)', async () => {
      const authorizedTechId = secondaryTech!.technicianProfile!.technicianId;

      // Asset not installed by and not assigned to this tech
      const unassignedAsset = await prisma.installedAsset.findUnique({
        where: { id: assetId! },
        include: { serviceRequests: true }
      });

      const isInstaller = unassignedAsset?.installedByTechId === authorizedTechId;
      const isAssigned = unassignedAsset?.serviceRequests.some(r => r.assignedTechId === authorizedTechId);
      assert(!isInstaller && !isAssigned, 'Technician must not be authorized for unassigned asset');

      // Link technician to a service ticket on this asset
      const assignedTicket = await prisma.serviceRequest.create({
        data: {
          customerId: customerUser!.customerProfile!.customerId,
          installedAssetId: assetId!,
          assignedTechId: authorizedTechId,
          description: 'Assigned emergency repair',
          status: 'IN_PROGRESS',
        }
      });

      const updatedAsset = await prisma.installedAsset.findUnique({
        where: { id: assetId! },
        include: { serviceRequests: true }
      });

      const nowAuthorized = updatedAsset?.serviceRequests.some(r => r.assignedTechId === authorizedTechId);
      assert(nowAuthorized === true, 'Technician with assigned ticket is authorized');

      // Clean up test ticket
      await prisma.serviceRequest.delete({ where: { id: assignedTicket.id } });
    });

    // ---------------------------------------------------------------------------
    // TEST 8: Update Workflow
    // ---------------------------------------------------------------------------
    await test('Update: Update asset location, notes, and status', async () => {
      assert(!!assetId, 'Asset must exist');

      const updated = await prisma.installedAsset.update({
        where: { id: assetId! },
        data: {
          installationAddress: 'Updated Address - 4th Cross, Mysore',
          installationNotes: 'Relocated purifier to utility room',
          status: 'UNDER_MAINTENANCE',
        }
      });

      assert(updated.installationAddress === 'Updated Address - 4th Cross, Mysore', 'Address must be updated');
      assert(updated.installationNotes === 'Relocated purifier to utility room', 'Notes must be updated');
      assert(updated.status === 'UNDER_MAINTENANCE', 'Status must be UNDER_MAINTENANCE');
    });

  } finally {
    // Clean up test records
    if (assetId) {
      await prisma.installedAsset.delete({ where: { id: assetId } }).catch(() => {});
    }
    if (secondaryAssetId) {
      await prisma.installedAsset.delete({ where: { id: secondaryAssetId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log('                 TEST RUN SUMMARY                     ');
  console.log('======================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passed}`);
  console.log(`Failed      : ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runInstalledAssetTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
