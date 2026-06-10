import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for prisma seed. Set it explicitly before running npm run prisma:seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

const users = [
  {
    id: "user-admin",
    username: "admin",
    passwordHash:
      "scrypt:user-admin:96634051871e68281b278b3fd4750c99b588a7de2d52473164898e8c8bef8317235443d642c5ecb4b92a434ad6fad6909a16e0642697c58222e82b92e3437589",
    displayName: "TS. Đỗ Tiến Thành",
    status: "active",
    role: "system-admin",
    roleLabel: "Quản trị hệ thống",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-leadership",
    username: "tvtien",
    passwordHash:
      "scrypt:user-leadership:c52b02ae6aac82353472c53850ab0412925b90f6f907f994c57901aef4d3c11323904a8ec6b2db58f6c70573084e1bba15d044f9bb5571b388e3b6942d02b563",
    displayName: "GS. TS. Trần Viết Tiến",
    status: "active",
    role: "leadership",
    roleLabel: "Giám Đốc",
    unit: "Ban Giám Đốc"
  },
  {
    id: "user-staff",
    username: "nmphuong",
    passwordHash:
      "scrypt:user-staff:21e0f40659a682a8424cd382598d61ea7496422a6ba948c34f797f1ab4fb8ebf14a7eaaec584b01664235365c3ada4fec689509141ab54419041e4b4bf92be41",
    displayName: "TS. Nguyễn Minh Phương",
    status: "active",
    role: "scientific-management",
    roleLabel: "Trưởng phòng",
    unit: "Phòng KHQS"
  },
  {
    id: "user-pi",
    username: "patuan",
    passwordHash:
      "scrypt:user-pi:673213cfbafd5eaafdea44928251a6c15053da9e1b623e286fbea163e313bd210030b3d33d7d1c25106c4e3a73386dee074ef956c64926d12a518b7167ddfcf8",
    displayName: "TS. Phạm Anh Tuấn",
    status: "active",
    role: "principal-investigator",
    roleLabel: "Chủ nhiệm đề tài",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-reviewer",
    username: "nmtrung",
    passwordHash:
      "scrypt:user-reviewer:13749652ddde4378a437b85696b6de3892467ce0515b242bdbba8870094e3e6397705a73560f724ceaee5f9ee5750b8bb218de88ae5b5eb9839f437e27dc4e90",
    displayName: "TS. Đỗ Minh Trung",
    status: "active",
    role: "reviewer",
    roleLabel: "Thành viên Hội đồng",
    unit: "Ban Quản lý KHQS"
  }
];

const roles = [
  ["role-system-admin", "system-admin", "Quản trị hệ thống", "Toàn quyền quản trị nền tảng"],
  ["role-leadership", "leadership", "Lãnh đạo", "Phê duyệt và theo dõi điều hành"],
  ["role-scientific-management", "scientific-management", "Chuyên viên quản lý khoa học", "Vận hành nghiệp vụ quản lý khoa học"],
  ["role-principal-investigator", "principal-investigator", "Chủ nhiệm đề tài", "Tạo và theo dõi hồ sơ đề tài"],
  ["role-reviewer", "reviewer", "Reviewer/Hội đồng", "Đánh giá hồ sơ được phân công"]
];

const organizationUnits = [
  ["org-hvqy", "HVQY", "Học viện Quân y"],
  ["org-bgq", "BGD", "Ban Giám Đốc"],
  ["org-khti", "KHTI", "Khoa Toán - Tin học"],
  ["org-khqs", "KHQS", "Phòng KHQS"],
  ["org-bqlkhqs", "BQLKHQS", "Ban Quản lý KHQS"]
];

for (const [id, code, label, description] of roles) {
  await prisma.role.upsert({
    where: { code },
    update: { label, description, status: "active" },
    create: { id, code, label, description, status: "active" }
  });
}

for (const [id, code, name] of organizationUnits) {
  await prisma.organizationUnit.upsert({
    where: { code },
    update: { name, status: "active" },
    create: { id, code, name, status: "active" }
  });
}

for (const user of users) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      username: user.username,
      usernameKey: user.username.toLowerCase(),
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      status: user.status,
      role: user.role,
      roleLabel: user.roleLabel,
      unit: user.unit
    },
    create: {
      ...user,
      usernameKey: user.username.toLowerCase()
    }
  });

  const role = await prisma.role.findUnique({ where: { code: user.role } });
  const organizationUnit = await prisma.organizationUnit.findFirst({ where: { name: user.unit } });

  if (role) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id
        }
      },
      update: { isPrimary: true },
      create: { userId: user.id, roleId: role.id, isPrimary: true }
    });
  }

  if (organizationUnit) {
    await prisma.userOrganizationScope.upsert({
      where: {
        userId_organizationUnitId: {
          userId: user.id,
          organizationUnitId: organizationUnit.id
        }
      },
      update: { isPrimary: true },
      create: { userId: user.id, organizationUnitId: organizationUnit.id, isPrimary: true }
    });
  }
}

const catalogs = [
  ["research-field", "military-medicine", "Y học quân sự"],
  ["research-field", "biomedical-tech", "Công nghệ y sinh"],
  ["proposal-type", "academy-level", "Đề tài cấp Học viện"],
  ["priority", "high", "Ưu tiên cao"],
  ["report-type", "periodic", "Báo cáo định kỳ"],
  ["scoring-criterion", "scientific-value", "Giá trị khoa học"]
];

for (const [type, code, name] of catalogs) {
  await prisma.catalogItem.upsert({
    where: {
      type_code: { type, code }
    },
    update: { name, status: "active", deletedAt: null },
    create: { type, code, name, status: "active" }
  });
}

const intakeStartsAt = new Date();
intakeStartsAt.setDate(intakeStartsAt.getDate() - 1);
const intakeEndsAt = new Date();
intakeEndsAt.setDate(intakeEndsAt.getDate() + 30);

await prisma.proposalIntakePeriod.upsert({
  where: { code: "INTAKE-2026-SEED" },
  update: {
    title: "Đợt tiếp nhận hồ sơ nghiên cứu 2026",
    description: "Đợt tiếp nhận mẫu phục vụ kiểm thử EP-02.",
    startsAt: intakeStartsAt,
    endsAt: intakeEndsAt,
    status: "open",
    applicableOrganizationUnitId: "org-khti",
    requiredPackage: [
      {
        code: "proposal-form",
        label: "Thuyết minh đề tài",
        allowedMimeTypes: ["application/pdf"],
        maxSizeMb: 5
      },
      {
        code: "budget-form",
        label: "Dự toán kinh phí",
        allowedMimeTypes: ["application/pdf"],
        maxSizeMb: 5
      }
    ]
  },
  create: {
    code: "INTAKE-2026-SEED",
    title: "Đợt tiếp nhận hồ sơ nghiên cứu 2026",
    description: "Đợt tiếp nhận mẫu phục vụ kiểm thử EP-02.",
    startsAt: intakeStartsAt,
    endsAt: intakeEndsAt,
    status: "open",
    applicableOrganizationUnitId: "org-khti",
    requiredPackage: [
      {
        code: "proposal-form",
        label: "Thuyết minh đề tài",
        allowedMimeTypes: ["application/pdf"],
        maxSizeMb: 5
      },
      {
        code: "budget-form",
        label: "Dự toán kinh phí",
        allowedMimeTypes: ["application/pdf"],
        maxSizeMb: 5
      }
    ]
  }
});

await prisma.systemParameter.upsert({
  where: { key: "session_timeout_minutes" },
  update: { value: "720", label: "Thời gian phiên đăng nhập" },
  create: { key: "session_timeout_minutes", value: "720", label: "Thời gian phiên đăng nhập" }
});

await prisma.notificationTemplate.upsert({
  where: { key: "user_created" },
  update: {
    subject: "Tài khoản RTMS đã được tạo",
    body: "Tài khoản của đồng chí đã được tạo trên hệ thống RTMS.",
    status: "active"
  },
  create: {
    key: "user_created",
    subject: "Tài khoản RTMS đã được tạo",
    body: "Tài khoản của đồng chí đã được tạo trên hệ thống RTMS.",
    status: "active"
  }
});

await prisma.$disconnect();
