import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

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

async function runTests() {
  console.log('\n======================================================');
  console.log('   PRATHAM ENTERPRISES: DATABASE FOUNDATION TESTS     ');
  console.log('======================================================\n');

  // 1. Setup test fixture references
  const testCustomer = await prisma.customerProfile.findFirst({ include: { user: true } });
  assert(!!testCustomer, 'Existing customer profile must exist for testing');

  const testTech = await prisma.technicianProfile.findFirst();
  assert(!!testTech, 'Existing technician profile must exist for testing');

  const testProduct = await prisma.product.findFirst();
  assert(!!testProduct, 'Existing product must exist for testing');

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testSerial = `TEST-RO-${uniqueSuffix}`;
  const testContractNo = `TEST-AMC-${uniqueSuffix}`;

  let createdAssetId: string | null = null;
  let createdAmcId: string | null = null;
  let createdScheduleId: string | null = null;
  let createdNotifId: string | null = null;
  let createdLogId: string | null = null;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: InstalledAsset Creation and Relationships
    // ---------------------------------------------------------------------------
    await test('InstalledAsset: Can create asset with relations to Customer, Product, and Technician', async () => {
      const now = new Date();
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const asset = await prisma.installedAsset.create({
        data: {
          customerId: testCustomer!.customerId,
          productId: testProduct!.id,
          modelName: 'Pratham RO Gold 10L',
          serialNumber: testSerial,
          installationDate: now,
          warrantyStartDate: now,
          warrantyEndDate: oneYearLater,
          installationAddress: 'Test Installation Site, Mysore',
          installationNotes: 'Standard kitchen sink installation with pre-filter',
          status: 'ACTIVE',
          installedByTechId: testTech!.technicianId,
        },
        include: {
          customer: { include: { user: true } },
          product: true,
          installedBy: true,
        }
      });

      createdAssetId = asset.id;

      assert(asset.id.length > 0, 'Asset ID must be generated');
      assert(asset.serialNumber === testSerial, 'Serial number must match');
      assert(asset.customer.customerId === testCustomer!.customerId, 'Customer relation must match');
      assert(asset.product?.id === testProduct!.id, 'Product relation must match');
      assert(asset.installedBy?.technicianId === testTech!.technicianId, 'Technician relation must match');
      assert(asset.status === 'ACTIVE', 'Asset default status must be ACTIVE');
    });

    // ---------------------------------------------------------------------------
    // TEST 2: InstalledAsset Unique Constraint on serialNumber
    // ---------------------------------------------------------------------------
    await test('InstalledAsset: Unique constraint prevents duplicate serial numbers', async () => {
      let threwExpectedError = false;
      try {
        await prisma.installedAsset.create({
          data: {
            customerId: testCustomer!.customerId,
            modelName: 'Duplicate Serial Test Purifier',
            serialNumber: testSerial, // Duplicate!
            installationAddress: 'Another Address, Mysore',
          }
        });
      } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          threwExpectedError = true;
        } else {
          throw err;
        }
      }
      assert(threwExpectedError, 'Prisma must reject duplicate serialNumber with code P2002');
    });

    // ---------------------------------------------------------------------------
    // TEST 3: AmcContract Creation and Relationships
    // ---------------------------------------------------------------------------
    await test('AmcContract: Can create AMC linked to Asset & Customer with visit quotas', async () => {
      assert(!!createdAssetId, 'Asset must exist from previous step');

      const now = new Date();
      const end = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const contract = await prisma.amcContract.create({
        data: {
          contractNumber: testContractNo,
          customerId: testCustomer!.customerId,
          installedAssetId: createdAssetId!,
          startDate: now,
          endDate: end,
          contractAmount: 4200.50,
          includedVisits: 4,
          completedVisits: 0,
          status: 'ACTIVE',
          renewalStatus: 'NONE',
          renewalNotes: 'Includes semi-annual membrane check',
        },
        include: {
          customer: true,
          installedAsset: true,
        }
      });

      createdAmcId = contract.id;

      assert(contract.contractNumber === testContractNo, 'Contract number must match');
      assert(contract.installedAssetId === createdAssetId, 'Installed asset ID must match');
      assert(contract.contractAmount === 4200.50, 'Contract amount must match');
      assert(contract.includedVisits === 4, 'Included visits must be 4');
      assert(contract.completedVisits === 0, 'Completed visits must default to 0');
      assert(contract.status === 'ACTIVE', 'Status must be ACTIVE');
    });

    // ---------------------------------------------------------------------------
    // TEST 4: AmcContract Uniqueness Constraint
    // ---------------------------------------------------------------------------
    await test('AmcContract: Unique constraint prevents duplicate contract numbers', async () => {
      let threwExpectedError = false;
      try {
        await prisma.amcContract.create({
          data: {
            contractNumber: testContractNo, // Duplicate!
            customerId: testCustomer!.customerId,
            installedAssetId: createdAssetId!,
            startDate: new Date(),
            endDate: new Date(),
            contractAmount: 3000,
          }
        });
      } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          threwExpectedError = true;
        } else {
          throw err;
        }
      }
      assert(threwExpectedError, 'Prisma must reject duplicate contractNumber with code P2002');
    });

    // ---------------------------------------------------------------------------
    // TEST 5: AmcContract Self-Relation for Renewals
    // ---------------------------------------------------------------------------
    await test('AmcContract: Supports renewal chain via previousContractId self-relation', async () => {
      assert(!!createdAmcId, 'Parent AMC contract must exist');

      const renewalContractNo = `${testContractNo}-R1`;
      const renewal = await prisma.amcContract.create({
        data: {
          contractNumber: renewalContractNo,
          customerId: testCustomer!.customerId,
          installedAssetId: createdAssetId!,
          startDate: new Date(),
          endDate: new Date(),
          contractAmount: 4500,
          includedVisits: 4,
          status: 'ACTIVE',
          renewalStatus: 'RENEWED',
          previousContractId: createdAmcId,
        },
        include: {
          previousContract: true,
        }
      });

      assert(renewal.previousContract?.id === createdAmcId, 'Previous contract must link properly');
      
      // Cleanup the renewal child immediately
      await prisma.amcContract.delete({ where: { id: renewal.id } });
    });

    // ---------------------------------------------------------------------------
    // TEST 6: ServiceSchedule Creation and Linkage
    // ---------------------------------------------------------------------------
    await test('ServiceSchedule: Can schedule maintenance visit with asset and optional AMC', async () => {
      assert(!!createdAssetId && !!createdAmcId, 'Asset and AMC must exist');

      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

      const schedule = await prisma.serviceSchedule.create({
        data: {
          installedAssetId: createdAssetId!,
          amcContractId: createdAmcId!,
          customerId: testCustomer!.customerId,
          dueDate,
          serviceType: 'PERIODIC_MAINTENANCE',
          status: 'SCHEDULED',
          notes: 'Quarterly maintenance schedule #1',
        },
        include: {
          installedAsset: true,
          amcContract: true,
          customer: true,
        }
      });

      createdScheduleId = schedule.id;

      assert(schedule.status === 'SCHEDULED', 'Status must be SCHEDULED');
      assert(schedule.installedAssetId === createdAssetId, 'Asset reference must match');
      assert(schedule.amcContractId === createdAmcId, 'AMC reference must match');
      assert(schedule.serviceType === 'PERIODIC_MAINTENANCE', 'Service type must match');
    });

    // ---------------------------------------------------------------------------
    // TEST 7: ServiceSchedule Optional ServiceRequest Link
    // ---------------------------------------------------------------------------
    await test('ServiceSchedule: Can link to a ServiceRequest ticket', async () => {
      assert(!!createdScheduleId && !!createdAssetId, 'Schedule and Asset must exist');

      // Create a service request tied to this asset
      const request = await prisma.serviceRequest.create({
        data: {
          customerId: testCustomer!.customerId,
          description: 'Automated periodic maintenance visit spawned from schedule',
          status: 'PENDING',
          installedAssetId: createdAssetId!,
        }
      });

      // Update schedule to link to this ticket
      const updatedSchedule = await prisma.serviceSchedule.update({
        where: { id: createdScheduleId! },
        data: {
          serviceRequestId: request.id,
          status: 'IN_PROGRESS',
        },
        include: {
          serviceRequest: true,
        }
      });

      assert(updatedSchedule.serviceRequestId === request.id, 'Schedule must link to ServiceRequest');
      assert(updatedSchedule.serviceRequest?.installedAssetId === createdAssetId, 'ServiceRequest must also link back to asset');

      // Clean up the test service request
      await prisma.serviceSchedule.update({ where: { id: createdScheduleId! }, data: { serviceRequestId: null } });
      await prisma.serviceRequest.delete({ where: { id: request.id } });
    });

    // ---------------------------------------------------------------------------
    // TEST 8: Notification Model Validation
    // ---------------------------------------------------------------------------
    await test('Notification: Can create and mark user notifications', async () => {
      const notif = await prisma.notification.create({
        data: {
          userId: testCustomer!.userId,
          title: 'AMC Expiry Warning',
          message: 'Your water purifier contract expires in 15 days.',
          type: 'AMC_EXPIRY',
          link: '/customer/amc',
          isRead: false,
        }
      });

      createdNotifId = notif.id;

      assert(notif.isRead === false, 'New notification must be unread');
      assert(notif.type === 'AMC_EXPIRY', 'Type must match');

      const updated = await prisma.notification.update({
        where: { id: notif.id },
        data: { isRead: true }
      });

      assert(updated.isRead === true, 'Notification should be marked read');
    });

    // ---------------------------------------------------------------------------
    // TEST 9: TechnicianAvailabilityLog Model Validation
    // ---------------------------------------------------------------------------
    await test('TechnicianAvailabilityLog: Can log technician status transitions', async () => {
      const log = await prisma.technicianAvailabilityLog.create({
        data: {
          technicianId: testTech!.technicianId,
          status: 'ON_LEAVE',
          reason: 'Personal leave',
        },
        include: {
          technician: true,
        }
      });

      createdLogId = log.id;

      assert(log.status === 'ON_LEAVE', 'Status must be ON_LEAVE');
      assert(log.technician.technicianId === testTech!.technicianId, 'Technician relation must match');
    });

    // ---------------------------------------------------------------------------
    // TEST 10: Reverse Relations & Cascade Navigation
    // ---------------------------------------------------------------------------
    await test('CustomerProfile: Can navigate reverse relations to installedAssets, amcContracts, and serviceSchedules', async () => {
      const customerWithRelations = await prisma.customerProfile.findUnique({
        where: { customerId: testCustomer!.customerId },
        include: {
          installedAssets: true,
          amcContracts: true,
          serviceSchedules: true,
        }
      });

      assert(!!customerWithRelations, 'Customer must be found');
      assert(customerWithRelations!.installedAssets.length >= 1, 'Customer must have at least 1 installed asset');
      assert(customerWithRelations!.amcContracts.length >= 1, 'Customer must have at least 1 AMC contract');
      assert(customerWithRelations!.serviceSchedules.length >= 1, 'Customer must have at least 1 service schedule');
    });

  } finally {
    // ---------------------------------------------------------------------------
    // Cleanup of transient test records
    // ---------------------------------------------------------------------------
    if (createdScheduleId) {
      await prisma.serviceSchedule.delete({ where: { id: createdScheduleId } }).catch(() => {});
    }
    if (createdAmcId) {
      await prisma.amcContract.delete({ where: { id: createdAmcId } }).catch(() => {});
    }
    if (createdAssetId) {
      await prisma.installedAsset.delete({ where: { id: createdAssetId } }).catch(() => {});
    }
    if (createdNotifId) {
      await prisma.notification.delete({ where: { id: createdNotifId } }).catch(() => {});
    }
    if (createdLogId) {
      await prisma.technicianAvailabilityLog.delete({ where: { id: createdLogId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
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

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
