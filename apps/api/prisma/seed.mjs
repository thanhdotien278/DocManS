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
    username: "leadership",
    passwordHash:
      "scrypt:user-leadership:879846cceef41010301d9571992fbafaf8ae00c43d79901b5cba573b2ffd68fe3cec2c2c3c21fa7b96fce89df5c77adfca220aaab3f9dd79a280af49cbfa2d89",
    displayName: "GS. TS. Trần Viết Tiến",
    status: "active",
    role: "leadership",
    roleLabel: "Giám Đốc",
    unit: "Ban Giám Đốc"
  },
  {
    id: "user-staff",
    username: "staff",
    passwordHash:
      "scrypt:user-staff:83fe95cfd3d861883035495bca93fa438f252045fb3acb9c0526a534014ed32b4060b6a075524581f631479f96842dd836267a45a4b67a8b50c79d9e9cb65300",
    displayName: "TS. Nguyễn Minh Phương",
    status: "active",
    role: "scientific-management",
    roleLabel: "Trưởng phòng",
    unit: "Phòng KHQS"
  },
  {
    id: "user-pi",
    username: "pi",
    passwordHash:
      "scrypt:user-pi:6ee77a4aa59f216b3e03ecd2deac77fd389c9f203a0fd4477a577f512d5ac7ba59785d5f452be4d055b324377853a234ffb2b9a87f691c19650e2fd5b501e929",
    displayName: "TS. Phạm Anh Tuấn",
    status: "active",
    role: "principal-investigator",
    roleLabel: "Chủ nhiệm đề tài",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-reviewer",
    username: "reviewer",
    passwordHash:
      "scrypt:user-reviewer:ca1c923eb4ae818ae69b1b2c5d75873d6e882348685382165b94ef3c050f675d70ce6a8d672e8f80612ebf2b42685eaa1833885587bab921488e706b1d427363",
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
