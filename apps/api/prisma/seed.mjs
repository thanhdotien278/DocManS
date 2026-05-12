import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://docmansystem:docmansystem@localhost:5432/docmansystem?schema=public";
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
}

await prisma.$disconnect();
