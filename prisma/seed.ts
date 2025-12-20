import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1) Roles
  const roles = [
    { code: 'system_admin', name: 'System Admin' },
    { code: 'hr_admin', name: 'HR Admin' },
    { code: 'hr_officer', name: 'HR Officer' },
    { code: 'manager', name: 'Manager' },
    { code: 'employee', name: 'Employee' },
  ];

  for (const r of roles) {
    await prisma.wsoRole.upsert({
      where: { code: r.code },
      update: {},
      create: {
        code: r.code,
        name: r.name,
        isActive: true,
      },
    });
  }

  // 2) Default Department
  const itDept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      name: 'IT',
      code: 'IT',
      isActive: true,
    },
  });

  // 3) Admin User
  const passwordHash = await bcrypt.hash('Admin@123456', 10);

  const admin = await prisma.wsoSysUser.upsert({
    where: { userLogin: 'admin' },
    update: {},
    create: {
      userLogin: 'admin',
      email: 'admin@wso.local',
      passwordHash,
      isActive: true,
      displayName: 'System Admin',
      departmentId: itDept.id,
    },
  });

  // 4) Assign system_admin role to admin
  const systemRole = await prisma.wsoRole.findUnique({
    where: { code: 'system_admin' },
  });

  if (!systemRole) {
    throw new Error('system_admin role not found (seed roles step failed).');
  }

  await prisma.wsoUserRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: systemRole.id } },
    update: {},
    create: {
      userId: admin.id,
      roleId: systemRole.id,
      assignedBy: admin.id,
    },
  });

  console.log('✅ Seed completed!');
  console.log('Admin:', { userLogin: 'admin', password: 'Admin@123456' });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
