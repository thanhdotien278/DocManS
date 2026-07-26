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

// Demo/local seed accounts. All seeded users share the password "1234"
// (scrypt-hashed below, salt = user id, matching apps/api/src/auth/password.service.ts).
// This is for local development and demos only — never use in production.
const users = [
  {
    id: "user-admin",
    username: "admin",
    passwordHash:
      "scrypt:user-admin:88577689e88df3ec17a117384f8a68ff4e516d4ccc3c4a7783764eb66f4a72a8c35ae574d915e01d7ba3fe5e3a800b30463e721c488544ca3fc90192544e0c43",
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
      "scrypt:user-leadership:ee6993e65023030a9cf863925cf50c6a8e94a829eaeb344059bfb66e2c5419622123ea57a1891543a9f3aa308e48e24057a41bd16860c6150bbfac36614ef657",
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
      "scrypt:user-staff:ea925bf5f31fe306cb863a45afec44a4e67d84423e431cb93de5af91425c6723cb66ac59963afe1f47ad86d3c16aec95f73bffc74c22d75b032fd1093f7a71d5",
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
      "scrypt:user-pi:a2b881672bd86b9b7bc23fa6b11a507a1d4142e00c19a9ff0f66f815bee1882f417f0253352b0bd54c66772e4a3949671c0c7f37a691a43c5d05e556e6919a38",
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
      "scrypt:user-reviewer:b0782812a1c75cef9db6596a7c88ae497fac0d08b7c7230c908d3c413fc08c2bed386eccfc0cbc10a64a088f1ad9bf6a2f6507410ea3d833bbb0907d958ac12a",
    displayName: "TS. Đỗ Minh Trung",
    status: "active",
    role: "reviewer",
    roleLabel: "Thành viên Hội đồng",
    unit: "Ban Quản lý KHQS"
  },
  {
    id: "user-staff-hdtien1",
    username: "hdtien1",
    passwordHash:
      "scrypt:user-staff-hdtien1:0ca10cf0ed59766007948d5e2010afb69514a438a457e62f20eb392bfae619b1d91f2fed126c591a8a9f2d945e1d0705fbf6545f1e371e3ce692d19ab1ecdea0",
    displayName: "HD Tiến 1",
    status: "active",
    role: "scientific-management",
    roleLabel: "Chuyên viên",
    unit: "Phòng KHQS"
  },
  {
    id: "user-staff-hdtien2",
    username: "hdtien2",
    passwordHash:
      "scrypt:user-staff-hdtien2:3fcf32d5cd6957b752759325f0ee8c06f19db00e53ba051225606826fe336f7fe8bf4655570b109ee0a59eb1e90bf02c40e9a5f7d67f93562cbbac1774e7ad74",
    displayName: "HD Tiến 2",
    status: "active",
    role: "scientific-management",
    roleLabel: "Chuyên viên",
    unit: "Phòng KHQS"
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
