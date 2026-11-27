import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client as MinioClient } from "minio";
import { applySnapshotIfAvailable } from "./snapshot.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for prisma seed. Set it explicitly before running npm run prisma:seed.");
}

const databaseSchema = new URL(databaseUrl).searchParams.get("schema") ?? "public";
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseSchema)) throw new Error("Invalid DATABASE_URL schema");
if (await applySnapshotIfAvailable({ databaseUrl, databaseSchema })) {
  process.exit(0);
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, options: `-c search_path=${databaseSchema}` }, { schema: databaseSchema })
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
    displayName: "TS. Bùi Văn Khánh",
    status: "active",
    systemRole: "SYSTEM_ADMIN",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-leadership",
    username: "director",
    passwordHash:
      "scrypt:user-leadership:ee6993e65023030a9cf863925cf50c6a8e94a829eaeb344059bfb66e2c5419622123ea57a1891543a9f3aa308e48e24057a41bd16860c6150bbfac36614ef657",
    displayName: "GS. TS. Nguyễn Văn Bảo",
    status: "active",
    systemRole: "LEADERSHIP_APPROVAL_AUTHORITY",
    unit: "Ban Giám Đốc"
  },
  {
    id: "user-staff",
    username: "rmhead",
    passwordHash:
      "scrypt:user-staff:ea925bf5f31fe306cb863a45afec44a4e67d84423e431cb93de5af91425c6723cb66ac59963afe1f47ad86d3c16aec95f73bffc74c22d75b032fd1093f7a71d5",
    displayName: "TS. Trần Thị Mai",
    status: "active",
    systemRole: "RESEARCH_MANAGEMENT_HEAD",
    unit: "Phòng KHQS"
  },
  {
    id: "user-pi",
    username: "pi1",
    passwordHash:
      "scrypt:user-pi:a2b881672bd86b9b7bc23fa6b11a507a1d4142e00c19a9ff0f66f815bee1882f417f0253352b0bd54c66772e4a3949671c0c7f37a691a43c5d05e556e6919a38",
    displayName: "TS. Phạm Văn Dũng",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-board-head-boardhead",
    username: "boardhead",
    passwordHash:
      "scrypt:user-reviewer:b0782812a1c75cef9db6596a7c88ae497fac0d08b7c7230c908d3c413fc08c2bed386eccfc0cbc10a64a088f1ad9bf6a2f6507410ea3d833bbb0907d958ac12a",
    displayName: "TS. Hoàng Minh Đức",
    status: "active",
    systemRole: "RESEARCH_BOARD_HEAD",
    unit: "Ban Quản lý KHQS"
  },
  {
    id: "user-researcher1",
    username: "int1",
    passwordHash:
      "scrypt:user-researcher1:92f9d00035d2de8b73b915edd703fdbad5e80e7ec85a8d340fe8c0d7f422fa19c0f2355193a706ec3efcf89d4308318a4c9f330d6a505d7e61314457ea537901",
    displayName: "Nhà nghiên cứu nội bộ 1",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-researcher2",
    username: "int2",
    passwordHash:
      "scrypt:user-researcher2:8e740d0ffeb3de7b31c9c947c0729cd6599bf5b63af938eb9ab67a1d90dd87c9471bd1c97249e08f1e1cf64af95ccb49741554828017ade8884cce3492cc6650",
    displayName: "Nhà nghiên cứu nội bộ 2",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-researcher3",
    username: "int3",
    passwordHash:
      "scrypt:user-researcher3:302088f55364c04f9a67f05137beb70f53c2a62011912b8e46f10e0e91e5671fdf0a63b46909f88414006dc2b49eb83aba48a126fc858c95323b471ed8246204",
    displayName: "Nhà nghiên cứu nội bộ 3",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-external1",
    username: "ex1",
    passwordHash:
      "scrypt:user-external1:cd7a9b317c30cc69b15b34b309e5751ecd3e3b89aa133de3d7004d0b7434b70f6b4b0c399a10cd7b2b3b0c4c68162dc54a7e05b2318eee70a5806c5885ebc2eb",
    displayName: "Nhà nghiên cứu bên ngoài 1",
    status: "active",
    systemRole: "EXTERNAL_RESEARCHER_USER",
    unit: "Đơn vị ngoài"
  },
  {
    id: "user-external2",
    username: "ex2",
    passwordHash:
      "scrypt:user-external2:512345665da515aa85dfeacdf5ade9d6d37b864b16f981f36ea248033c37185b91787d44fc1e53c8ec28b1512c13f334306060040ee0cd943759c7f85cf84cbc",
    displayName: "Nhà nghiên cứu bên ngoài 2",
    status: "active",
    systemRole: "EXTERNAL_RESEARCHER_USER",
    unit: "Đơn vị ngoài"
  },
  {
    id: "user-external3",
    username: "ex3",
    passwordHash:
      "scrypt:user-external3:b88095f2007342656ee147cb06475f58254a67a78ae71bb02294e4fba4f866106ee03fd46a33d0eefd64bc582428299ae9a478ed634ebc9e2e01a9efbe62a3d3",
    displayName: "Nhà nghiên cứu bên ngoài 3",
    status: "active",
    systemRole: "EXTERNAL_RESEARCHER_USER",
    unit: "Đơn vị ngoài"
  },
  {
    id: "user-staff-rmstaff1",
    username: "rmstaff1",
    passwordHash:
      "scrypt:user-staff-rmstaff1:ecc1f010670b5b4723c679f7aa82e7076d9a171dc4ed6c86eb415f1dd351b4b03bc325135a34cf96f9a8a013a45df1914142dd6551e144ec2ad0484ade2f7a32",
    displayName: "Chuyên viên 1",
    status: "active",
    systemRole: "RESEARCH_MANAGEMENT_STAFF",
    unit: "Phòng KHQS"
  },
  {
    id: "user-staff-rmstaff2",
    username: "rmstaff2",
    passwordHash:
      "scrypt:user-staff-rmstaff2:1f86b96c58477658efaf3d950d9fd68611e9e65ba061e55e17b54034b45e1ac007bcfca525f4336f2e6718aad969b5f9f9aa637de1a220982e2b389df1b6b255",
    displayName: "Chuyên viên 2",
    status: "active",
    systemRole: "RESEARCH_MANAGEMENT_STAFF",
    unit: "Phòng KHQS"
  },
  {
    id: "user-science-deputy-deputysci",
    username: "deputysci",
    passwordHash:
      "scrypt:user-oversight-deputysci:a6d43d3676f444c6a8912b2d3a0a51a0453f1d9e85aef5c83a6d94bf9e72ad2159eda0dc07710fdccc7363b4737452d8bb46a238dd32d7b6c6cf039a064b66c4",
    displayName: "Thiếu tướng PGS. TS. Lê Quang Khải",
    status: "active",
    systemRole: "SCIENCE_DEPUTY_DIRECTOR",
    unit: "Ban Giám Đốc"
  },
  {
    id: "user-oversight-oversight",
    username: "oversight",
    passwordHash:
      "scrypt:user-oversight-oversight:ba9398e9bda13ad70e3a6f11fbefc5f8a0f00c8b2161a7a71a98ef1091e69ff7c9513b4b4bbb40795e2217f7d9258b40845211465bd657f470a85eaca05bfd37",
    displayName: "Vũ Văn Giang",
    status: "active",
    systemRole: "RESEARCH_OVERSIGHT_AUTHORITY",
    unit: "Ban Giám Đốc"
  },
  {
    id: "user-deputy-head-rmdeputy",
    username: "rmdeputy",
    passwordHash:
      "scrypt:user-deputy-head-rmdeputy:b5cd780b7e2634e028fd5a98d9d87682df4e978b05fc534335157f6ee957b826e7522806a285d6219c89d08a60f9ee8e45bf0988f7fb8e3c9ce77d04c8611366",
    displayName: "Đặng Thị Hoa",
    status: "active",
    systemRole: "RESEARCH_MANAGEMENT_DEPUTY_HEAD",
    unit: "Phòng KHQS"
  }
];

// Sinh viên mẫu cho phân hệ Sinh viên NCKH (cùng mật khẩu "1234"; hồ sơ sinh viên tạo bên dưới).
const seedStudents = [["sv01", "Nguyễn Văn An", "SV2026001"], ["sv02", "Trần Thị Bình", "SV2026002"], ["sv03", "Lê Minh Châu", "SV2026003"]];
for (const [username, displayName] of seedStudents) {
  const id = `user-student-${username}`;
  users.push({ id, username, passwordHash: `scrypt:${id}:${scryptSync("1234", id, 64).toString("hex")}`, displayName, status: "active", systemRole: "STUDENT_USER", unit: "Khoa Toán - Tin học" });
}

// Production: the accounts above share a public password, so they are created disabled. Only the admin
// stays usable, with a password from SEED_ADMIN_PASSWORD and a forced change at first login.
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (adminPassword.length < 12) throw new Error("SEED_ADMIN_PASSWORD (at least 12 characters) is required when NODE_ENV=production.");
  for (const user of users) {
    if (user.id === "user-admin") {
      const salt = randomBytes(16).toString("hex");
      user.passwordHash = `scrypt:${salt}:${scryptSync(adminPassword, salt, 64).toString("hex")}`;
      user.mustChangePassword = true;
    } else {
      user.status = "inactive";
    }
  }
}

const organizationUnits = [
  ["org-hvqy", "HVQY", "Học viện Quân y"],
  ["org-bgq", "BGD", "Ban Giám Đốc"],
  ["org-khti", "KHTI", "Khoa Toán - Tin học"],
  ["org-khqs", "KHQS", "Phòng KHQS"],
  ["org-bqlkhqs", "BQLKHQS", "Ban Quản lý KHQS"],
  ["org-k30", "K30", "Công tác Đảng, Công tác Chính trị"],
  ["org-k81", "K81", "Vật lý"],
  ["org-k82", "K82", "Hóa học"],
  ["org-k84", "K84", "Ngoại ngữ"],
  ["org-external", "EXT", "Đơn vị ngoài"]
];

// Scientific management staff operate the intake, supplement, assignment and consolidation flows
// for the units they oversee, not only for their own department. Without this the seeded staff
// accounts sit in Phòng KHQS while the seeded PI files under Khoa Toán - Tin học, so every
// scope-checked staff action (ST-3.1 supplement, ST-3.2 assignment, ST-3.4 consolidation) is
// refused and the demo cannot reach the approval step.
const additionalOrganizationScopes = {
  "user-admin": ["org-bgq", "org-khqs", "org-bqlkhqs", "org-k30", "org-k81", "org-k82", "org-k84"],
  "user-leadership": ["org-hvqy", "org-khti", "org-khqs", "org-bqlkhqs", "org-k30", "org-k81", "org-k82", "org-k84"],
  "user-staff-rmstaff1": ["org-khti", "org-bqlkhqs", "org-k30", "org-k81", "org-k82", "org-k84"],
  "user-staff-rmstaff2": ["org-khti", "org-bqlkhqs", "org-k30", "org-k81", "org-k82", "org-k84"],
  "user-staff": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-khqs").map(([id]) => id),
  "user-science-deputy-deputysci": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-bgq").map(([id]) => id),
  "user-oversight-oversight": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-bgq").map(([id]) => id),
  "user-board-head-boardhead": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-bqlkhqs").map(([id]) => id),
  "user-deputy-head-rmdeputy": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-khqs").map(([id]) => id)
};

// Units published on hocvienquany.vn; kept out of `organizationUnits` so they do not widen seeded account scopes.
const hvqyOrganizationUnits = JSON.parse(readFileSync(new URL("./hvqy-organization-units.json", import.meta.url), "utf8"));

for (const [id, code, name] of [...organizationUnits, ...hvqyOrganizationUnits]) {
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
      // displayName chỉ đặt khi tạo: sau đó đồng bộ theo họ tên trong lý lịch khoa học, seed chạy lại không ghi đè.
      // passwordHash và status cũng chỉ đặt khi tạo: seed chạy lại không đưa mật khẩu mặc định hay tài khoản đã khóa trở lại.
      systemRole: user.systemRole,
      unit: user.unit
    },
    create: {
      ...user,
      usernameKey: user.username.toLowerCase()
    }
  });

  const organizationUnit = await prisma.organizationUnit.findFirst({ where: { name: user.unit } });

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

  for (const organizationUnitId of additionalOrganizationScopes[user.id] ?? []) {
    await prisma.userOrganizationScope.upsert({
      where: {
        userId_organizationUnitId: { userId: user.id, organizationUnitId }
      },
      update: { isPrimary: false },
      create: { userId: user.id, organizationUnitId, isPrimary: false }
    });
  }
}

for (const [username, , studentCode] of seedStudents) {
  const userId = `user-student-${username}`;
  await prisma.studentProfile.upsert({ where: { userId }, update: {}, create: { userId, studentCode, className: "DH55A", phone: "0900000000", organizationUnitId: "org-khti", previousSemesterScore: 8 } });
}

const oversightProfile = await prisma.researcherProfile.upsert({
  where: { id: "profile-science-deputy-deputysci" },
  update: {
    managementOrganizationUnitId: "org-bgq",
    linkedUserId: "user-science-deputy-deputysci",
    profileType: "INTERNAL",
    fullName: "Thiếu tướng PGS. TS. Lê Quang Khải",
    fullNameKey: "thieu tuong pgs ts vu nhat dinh",
    militaryRank: "Thiếu tướng",
    title: "PGS. TS.",
    position: "Phó Giám đốc phụ trách NCKH",
    status: "ACTIVE",
    updatedById: "user-admin"
  },
  create: {
    id: "profile-science-deputy-deputysci",
    managementOrganizationUnitId: "org-bgq",
    linkedUserId: "user-science-deputy-deputysci",
    profileType: "INTERNAL",
    fullName: "Thiếu tướng PGS. TS. Lê Quang Khải",
    fullNameKey: "thieu tuong pgs ts vu nhat dinh",
    militaryRank: "Thiếu tướng",
    title: "PGS. TS.",
    position: "Phó Giám đốc phụ trách NCKH",
    status: "ACTIVE",
    createdById: "user-admin",
    updatedById: "user-admin"
  }
});

const existingOversightLink = await prisma.researcherProfileAccountLink.findFirst({ where: { researcherProfileId: oversightProfile.id, userId: "user-science-deputy-deputysci" } });
if (existingOversightLink) {
  await prisma.researcherProfileAccountLink.update({ where: { id: existingOversightLink.id }, data: { status: "ACTIVE", effectiveUntil: null, reason: "seed-oversight-account" } });
} else {
  await prisma.researcherProfileAccountLink.create({ data: { researcherProfileId: oversightProfile.id, userId: "user-science-deputy-deputysci", status: "ACTIVE", effectiveFrom: new Date(), reason: "seed-oversight-account", createdById: "user-admin" } });
}

// Story 13.10: science-management demo accounts get their own INTERNAL CV profile. Create-only, name and unit only.
for (const [userId, profileId] of [["user-staff", "profile-staff-rmhead"], ["user-staff-rmstaff1", "profile-staff-rmstaff1"], ["user-staff-rmstaff2", "profile-staff-rmstaff2"]]) {
  const user = users.find((candidate) => candidate.id === userId);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.researcherProfile.findFirst({ where: { OR: [{ id: profileId }, { linkedUserId: userId }] } });
    const previousLink = await tx.researcherProfileAccountLink.findFirst({ where: { userId } });
    if (existing || previousLink) return;
    const organization = await tx.organizationUnit.findFirstOrThrow({ where: { name: user.unit, status: "active" } });
    await tx.researcherProfile.create({ data: {
      id: profileId,
      managementOrganizationUnitId: organization.id,
      linkedUserId: userId,
      profileType: "INTERNAL",
      fullName: user.displayName,
      fullNameKey: user.displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim(),
      status: "ACTIVE",
      createdById: "user-admin",
      updatedById: "user-admin",
      accountLinks: { create: { userId, effectiveFrom: new Date(), reason: "seed-management-account", createdById: "user-admin" } },
      history: { create: { actorId: "user-admin", action: "CREATE", reason: "seed-management-account", afterFacts: { linkedUserId: userId } } }
    } });
  });
}

const catalogs = [
  ["research-field", "military-medicine", "Y học quân sự"],
  ["research-field", "basic-medicine", "Y học cơ sở"],
  ["research-field", "clinical-medicine", "Y học lâm sàng"],
  ["research-field", "preventive-medicine", "Y học dự phòng"],
  ["research-field", "public-health", "Y tế công cộng"],
  ["research-field", "pharmacy", "Dược học"],
  ["research-field", "biotechnology", "Công nghệ sinh học"],
  ["research-field", "life-sciences", "Khoa học sự sống"],
  ["research-field", "biomedical-tech", "Công nghệ y sinh"],
  ["research-field", "chemistry", "Hóa học"],
  ["research-field", "physics", "Vật lý"],
  ["research-field", "information-technology", "Công nghệ thông tin"],
  ["research-field", "social-humanities", "Khoa học xã hội và nhân văn"],
  ["academic-rank", "professor", "Giáo sư"],
  ["academic-rank", "associate-professor", "Phó giáo sư"],
  ["academic-degree", "doctor", "Tiến sĩ"],
  ["academic-degree", "master", "Thạc sĩ"],
  ["academic-degree", "bscki", "BSCKI"],
  ["academic-degree", "bsckii", "BSCKII"],
  ["academic-degree", "other", "Khác"],
  ["proposal-type", "academy-level", "Đề tài cấp Học viện"],
  ["proposal-nature", "military", "Quân sự"],
  ["proposal-nature", "civil", "Dân sự"],
  ["priority", "high", "Ưu tiên cao"],
  ["report-type", "periodic", "Báo cáo định kỳ"],
  ["scoring-criterion", "scientific-value", "Giá trị khoa học"]
];

// Loại đề tài bổ sung: bỏ qua nếu DB đã có mục cùng type và name (có thể nhập tay với mã khác).
const extraProposalTypes = [
  ["student-research", "Đề tài Sinh viên / Học viên NCKH"],
  ["ministry-defense", "Đề tài cấp Bộ Quốc phòng"],
  ["base-level", "Đề tài cấp Cơ sở"],
  ["sector-level", "Đề tài cấp Ngành / Cục"],
  ["national-level", "Đề tài cấp Quốc gia"]
];
for (const [code, name] of extraProposalTypes) {
  if (await prisma.catalogItem.findFirst({ where: { type: "proposal-type", name } })) continue;
  await prisma.catalogItem.upsert({
    where: { type_code: { type: "proposal-type", code } },
    update: {},
    create: { type: "proposal-type", code, name, status: "active" }
  });
}

for (const [type, code, name] of catalogs) {
  await prisma.catalogItem.upsert({
    where: {
      type_code: { type, code }
    },
    update: { name, status: "active", deletedAt: null },
    create: { type, code, name, status: "active" }
  });
}

// Create missing demo identities only; never undo profile edits, deactivation or unlinking.
const researcherField = await prisma.catalogItem.findUniqueOrThrow({ where: { type_code: { type: "research-field", code: "military-medicine" } } });
for (const user of users.filter((user) => ["RESEARCHER_INTERNAL_USER", "EXTERNAL_RESEARCHER_USER"].includes(user.systemRole))) {
  await prisma.$transaction(async (tx) => {
    const profileId = `profile-${user.id}`;
    const existing = await tx.researcherProfile.findFirst({ where: { OR: [{ id: profileId }, { linkedUserId: user.id }] } });
    const previousLink = await tx.researcherProfileAccountLink.findFirst({ where: { userId: user.id } });
    if (existing || previousLink) return;
    const organization = await tx.organizationUnit.findFirstOrThrow({ where: { name: user.unit, status: "active" } });
    await tx.researcherProfile.create({ data: {
      id: profileId,
      managementOrganizationUnitId: organization.id,
      linkedUserId: user.id,
      profileType: user.systemRole === "EXTERNAL_RESEARCHER_USER" ? "EXTERNAL" : "INTERNAL",
      fullName: user.displayName,
      fullNameKey: user.displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim(),
      status: "ACTIVE",
      createdById: "user-admin",
      updatedById: "user-admin",
      researchFields: { create: { catalogItemId: researcherField.id } },
      accountLinks: { create: { userId: user.id, effectiveFrom: new Date(), reason: "seed-researcher-account", createdById: "user-admin" } },
      history: { create: { actorId: "user-admin", action: "CREATE", reason: "seed-researcher-account", afterFacts: { linkedUserId: user.id } } }
    } });
  });
}

// Story 13.7: demo CVs for int2 and ex1. Written once, only while the profile has no CV, so user edits are never overwritten.
const demoCvs = JSON.parse(readFileSync(new URL("./demo-cvs.json", import.meta.url), "utf8"));
for (const [profileId, demo] of Object.entries(demoCvs)) {
  await prisma.$transaction(async (tx) => {
    const profile = await tx.researcherProfile.findUnique({ where: { id: profileId } });
    if (!profile || profile.curriculumVitae !== null) return;
    await tx.researcherProfile.update({ where: { id: profileId }, data: {
      curriculumVitae: demo.curriculumVitae,
      ...(profile.contactEmail ? {} : { contactEmail: demo.contactEmail, contactEmailKey: demo.contactEmail.toLocaleLowerCase("en-US") }),
      aggregateVersion: { increment: 1 },
      updatedById: "user-admin"
    } });
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

await prisma.systemParameter.upsert({
  where: { key: "file_max_upload_mb" },
  update: {},
  create: { key: "file_max_upload_mb", value: "10", label: "Dung lượng tệp tải lên tối đa (MB)" }
});

// Story 13.11: tự đăng ký mặc định tắt; update rỗng để không ghi đè lựa chọn của QT khi seed lại.
await prisma.systemParameter.upsert({
  where: { key: "self_registration_enabled" },
  update: {},
  create: { key: "self_registration_enabled", value: "false", label: "Cho phép tự đăng ký tài khoản nhà nghiên cứu" }
});

await prisma.systemParameter.upsert({
  where: { key: "student_registration_enabled" },
  update: {},
  create: { key: "student_registration_enabled", value: "false", label: "Cho phép sinh viên tự đăng ký tài khoản" }
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

await prisma.notificationTemplate.upsert({
  where: { key: "researcher_account_activation" },
  update: {
    subject: "Phòng Khoa học quân sự - Học viện Quân y: Kích hoạt tài khoản",
    body: "Tài khoản của bạn trên Hệ thống quản lý nghiên cứu khoa học (DocManS) đã được tạo. Vui lòng thiết lập mật khẩu để kích hoạt tài khoản.",
    status: "active"
  },
  create: {
    key: "researcher_account_activation",
    subject: "Phòng Khoa học quân sự - Học viện Quân y: Kích hoạt tài khoản",
    body: "Tài khoản của bạn trên Hệ thống quản lý nghiên cứu khoa học (DocManS) đã được tạo. Vui lòng thiết lập mật khẩu để kích hoạt tài khoản.",
    status: "active"
  }
});

// Golden Flow 4 local demonstration. Stable IDs and create-only guards preserve changes
// made while exercising the workflow, including decisions and report revisions.
// Sample proposals and projects below are for local use only.
if (isProduction) {
  await prisma.$disconnect();
  process.exit(0);
}

const demoDay = (offset) => {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + offset);
  return value;
};
const demoNow = new Date();
const demoIntake = await prisma.proposalIntakePeriod.upsert({
  where: { code: "GF4-DEMO" }, update: {},
  create: { id: "gf4-demo-intake", code: "GF4-DEMO", title: "Dữ liệu mẫu thực hiện đề tài", startsAt: demoDay(-90), endsAt: demoDay(180), status: "closed", requiredPackage: [] }
});

async function ensureApprovedDemoProposal(id, title) {
  if (await prisma.researchProposal.findUnique({ where: { id } })) return;
  await prisma.$transaction(async (tx) => {
    await tx.researchProposal.create({ data: { id, intakePeriodId: demoIntake.id, ownerId: "user-pi", hostOrganizationUnitId: "org-khti", title, objectives: "Kiểm tra quy trình thực hiện đề tài", summary: "Dữ liệu mẫu Golden Flow 4", startDate: demoDay(-60), endDate: demoDay(120), status: "approved", submittedAt: demoNow, submittedById: "user-pi" } });
    const submissionId = `${id}-submission`;
    await tx.proposalSubmissionEvent.create({ data: { id: submissionId, proposalId: id, actorId: "user-pi", fromStatus: "draft", toStatus: "submitted", submittedAt: demoNow, snapshot: { id, ownerId: "user-pi", title, objectives: "Kiểm tra quy trình thực hiện đề tài", summary: "Dữ liệu mẫu Golden Flow 4", startDate: demoDay(-60).toISOString(), endDate: demoDay(120).toISOString(), hostOrganizationUnitId: "org-khti", members: [{ id: `${id}-source-member`, userId: "user-researcher1", name: "Nhà nghiên cứu nội bộ 1", role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER" }] } } });
    await tx.proposalDecision.create({ data: { id: `${id}-decision`, proposalId: id, decision: "approved", decidedById: "user-leadership", decidedAt: demoNow, fromStatus: "ready_for_approval", toStatus: "approved", packageSnapshot: { lifecycle: "finalized", submissionEventId: submissionId }, publicSummary: { decision: "approved" } } });
    await tx.proposalManagementOfficer.create({ data: { id: `${id}-officer`, proposalId: id, officerUserId: "user-staff-rmstaff1", assignedById: "user-staff", status: "ACTIVE", effectiveFrom: demoDay(-30) } });
  });
}

await ensureApprovedDemoProposal("gf4-demo-source", "Đề tài mẫu đang thực hiện");
await ensureApprovedDemoProposal("gf4-demo-ready", "Đề xuất đã duyệt — chờ tạo đề tài");

if (!await prisma.approvedProject.findUnique({ where: { id: "gf4-demo-project" } })) {
  await prisma.$transaction(async (tx) => {
    const memberId = "gf4-demo-member";
    const projectId = "gf4-demo-project";
    const contextVersion = { domain: "approved-project", recordId: projectId, aggregateVersion: 1, relationshipVersion: 1, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" };
    await tx.approvedProject.create({ data: { id: projectId, proposalId: "gf4-demo-source", sourceSubmissionEventId: "gf4-demo-source-submission", sourceDecisionId: "gf4-demo-source-decision", hostOrganizationUnitId: "org-khti", title: "Đề tài mẫu đang thực hiện", scopeSnapshot: { title: "Đề tài mẫu đang thực hiện", objectives: "Kiểm tra quy trình thực hiện đề tài", summary: "Dữ liệu mẫu Golden Flow 4" }, planSnapshot: { startDate: demoDay(-60).toISOString(), endDate: demoDay(120).toISOString() }, status: "executing", startDate: demoDay(-60), endDate: demoDay(120), aggregateVersion: 1, relationshipVersion: 1, createdById: "user-staff-rmstaff1", confirmedById: "user-staff-rmstaff2", confirmedAt: demoNow } });
    await tx.approvedProjectMember.createMany({ data: [
      { id: "gf4-demo-pi", projectId, userId: "user-pi", name: "TS. Phạm Văn Dũng", role: "TOPIC_PI", participationRole: "TOPIC_PI", status: "ACTIVE", effectiveFrom: demoDay(-60), createdById: "user-staff-rmstaff1" },
      { id: memberId, projectId, userId: "user-researcher1", name: "Nhà nghiên cứu nội bộ 1", role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: demoDay(-60), createdById: "user-staff-rmstaff1" }
    ] });
    await tx.projectManagementOfficer.create({ data: { id: "gf4-demo-project-officer", projectId, officerUserId: "user-staff-rmstaff2", assignedById: "user-staff", status: "ACTIVE", effectiveFrom: demoDay(-30) } });
    await tx.projectMilestone.createMany({ data: [
      { id: "gf4-demo-milestone-overdue", projectId, title: "Mốc cần rà soát quá hạn", dueDate: demoDay(-5), status: "open", isImportant: true, position: 0, responsibleMemberId: "gf4-demo-pi", createdById: "user-staff-rmstaff2" },
      { id: "gf4-demo-milestone-upcoming", projectId, title: "Mốc sắp đến hạn", dueDate: demoDay(7), status: "open", isImportant: true, position: 1, responsibleMemberId: memberId, createdById: "user-staff-rmstaff2" }
    ] });
    await tx.projectCheckpoint.createMany({ data: [
      { id: "gf4-demo-checkpoint-overdue", projectId, milestoneId: "gf4-demo-milestone-overdue", title: "Báo cáo mốc quá hạn", dueDate: demoDay(-5), status: "open" },
      { id: "gf4-demo-checkpoint-upcoming", projectId, milestoneId: "gf4-demo-milestone-upcoming", title: "Báo cáo mốc sắp đến hạn", dueDate: demoDay(7), status: "open" }
    ] });
    await tx.projectReportRevision.createMany({ data: [
      { id: "gf4-demo-report-submitted", projectId, checkpointId: "gf4-demo-checkpoint-overdue", revision: 1, status: "submitted", reportingPeriodStart: demoDay(-30), reportingPeriodEnd: demoDay(-6), deadline: demoDay(-5), progressResults: "Báo cáo tiến độ mẫu đã nộp; chờ chuyên viên xem xét.", authorId: "user-pi", submittedAt: demoNow, submittedContextVersion: contextVersion },
      { id: "gf4-demo-report-draft", projectId, checkpointId: "gf4-demo-checkpoint-upcoming", revision: 2, status: "draft", reportingPeriodStart: demoDay(-5), reportingPeriodEnd: demoDay(5), deadline: demoDay(7), progressResults: "Bản nháp báo cáo kỳ tiếp theo.", authorId: "user-pi" }
    ] });
    await tx.projectRequest.create({ data: { id: "gf4-demo-extension", projectId, requestType: "extension", status: "ready_for_head_decision", revision: 1, requesterId: "user-pi", currentValues: { endDate: demoDay(120).toISOString() }, proposedValues: { requestedEndDate: demoDay(150).toISOString().slice(0, 10) }, reason: "Cần thêm thời gian hoàn thiện kết quả mẫu.", submittedContextVersion: contextVersion, preparedById: "user-staff-rmstaff2", preparedAt: demoNow, appraisal: { validationNote: "Đã kiểm tra hành chính" }, revisions: { create: { id: "gf4-demo-extension-revision", revision: 1, status: "submitted", currentValues: { endDate: demoDay(120).toISOString() }, proposedValues: { requestedEndDate: demoDay(150).toISOString().slice(0, 10) }, reason: "Cần thêm thời gian hoàn thiện kết quả mẫu.", contextVersion, createdById: "user-pi", submittedAt: demoNow } } } });
    await tx.projectHistory.createMany({ data: [
      { projectId, actorId: "user-staff-rmstaff1", action: "project.created", toStatus: "preparing", reason: "Tạo từ đề xuất mẫu đã duyệt" },
      { projectId, actorId: "user-staff", action: "project.officer.assign", reason: "Phân công chuyên viên đề tài mẫu" },
      { projectId, actorId: "user-staff-rmstaff2", action: "project.setup.confirm", fromStatus: "preparing", toStatus: "executing" },
      { projectId, actorId: "user-pi", action: "project.report.submit", toStatus: "submitted" },
      { projectId, actorId: "user-pi", action: "project.extension.submit", toStatus: "submitted", requestId: "gf4-demo-extension" },
      { projectId, actorId: "user-staff-rmstaff2", action: "project.extension.prepare", fromStatus: "under_staff_validation", toStatus: "ready_for_head_decision", requestId: "gf4-demo-extension" }
    ] });
    await tx.auditLog.createMany({ data: [
      { action: "create-approved-project", result: "success", actorId: "user-staff-rmstaff1", targetEntity: "approved-project", targetEntityId: projectId },
      { action: "confirm-approved-project-setup", result: "success", actorId: "user-staff-rmstaff2", targetEntity: "approved-project", targetEntityId: projectId },
      { action: "submit-project-report", result: "success", actorId: "user-pi", targetEntity: "project-report-revision", targetEntityId: "gf4-demo-report-submitted" },
      { action: "project.extension.prepare", result: "success", actorId: "user-staff-rmstaff2", targetEntity: "project-request", targetEntityId: "gf4-demo-extension" }
    ] });
  });
}

// Văn bản & biểu mẫu mẫu. Tệp nằm trên MinIO, nên thiếu MinIO thì bỏ qua văn bản đó thay vì tạo bản ghi không tải được.
const sampleDocs = [
  {
    id: "doc-tt-05-2023",
    documentNumber: "05/2023/TT-BKHCN",
    title: "Thông tư số 05/2023/TT-BKHCN quy định chi tiết một số điều của Nghị định số 70/2018/NĐ-CP và quản lý các nhiệm vụ KH&CN cấp quốc gia",
    category: "LAW_REGULATION",
    issuingAuthority: "Bộ Khoa học và Công nghệ",
    issuedDate: new Date("2023-05-25"),
    effectiveDate: new Date("2023-07-09"),
    description: "Quy định trình tự, thủ tục xác định, tuyển chọn, giao trực tiếp và quản lý thực hiện nhiệm vụ khoa học và công nghệ cấp quốc gia sử dụng ngân sách nhà nước.",
    fileName: "Thong_tu_05_2023_TT_BKHCN.pdf",
    mimeType: "application/pdf",
    sampleContent: "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF"
  },
  {
    id: "doc-qc-hvqy-2024",
    documentNumber: "1258/QC-HVQY",
    title: "Quy chế Quản lý hoạt động Nghiên cứu khoa học và Công nghệ tại Học viện Quân y",
    category: "INTERNAL_REGULATION",
    issuingAuthority: "Học viện Quân y",
    issuedDate: new Date("2024-01-15"),
    effectiveDate: new Date("2024-02-01"),
    description: "Quy chế toàn diện về tổ chức, quản lý, phân bổ kinh phí, đánh giá nghiệm thu các đề tài, dự án KH&CN cấp cơ sở và phối hợp nghiên cứu.",
    fileName: "Quy_che_QLKH_Hoc_vien_Quan_y_2024.pdf",
    mimeType: "application/pdf",
    sampleContent: "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF"
  },
  {
    id: "doc-bm-01-thuyet-minh",
    documentNumber: "BM-01/NCKH",
    title: "Mẫu BM-01: Thuyết minh đề tài Nghiên cứu khoa học và Công nghệ",
    category: "DOCUMENT_TEMPLATE",
    issuingAuthority: "Phòng Quản lý Khoa học Quân sự",
    issuedDate: new Date("2024-01-20"),
    effectiveDate: new Date("2024-01-20"),
    description: "Biểu mẫu thuyết minh đề tài chuẩn quy định tính cấp thiết, mục tiêu nghiên cứu, nội dung triển khai, phương pháp tiếp cận và dự kiến sản phẩm bàn giao.",
    fileName: "BM01_Thuyet_minh_de_tai_NCKH_CN.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sampleContent: "PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0b\x00\x00\x00_rels/.relsPK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
  },
  {
    id: "doc-bm-02-du-toan",
    documentNumber: "BM-02/DTKP",
    title: "Mẫu BM-02: Bảng lập dự toán kinh phí thực hiện đề tài KH&CN",
    category: "DOCUMENT_TEMPLATE",
    issuingAuthority: "Phòng Quản lý Khoa học Quân sự",
    issuedDate: new Date("2024-01-20"),
    effectiveDate: new Date("2024-01-20"),
    description: "Biểu mẫu bảng tính Excel dự toán kinh phí chi tiết theo định mức kinh tế kỹ thuật, tiền công lao động khoa học, nguyên vật liệu và hội thảo.",
    fileName: "BM02_Du_toan_kinh_phi_de_tai.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sampleContent: "PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0b\x00\x00\x00_rels/.relsPK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
  },
  {
    id: "doc-bm-06-ly-lich",
    documentNumber: "BM-06/LLKH",
    title: "Mẫu BM-06: Lý lịch khoa học của cá nhân thực hiện nhiệm vụ KH&CN",
    category: "DOCUMENT_TEMPLATE",
    issuingAuthority: "Bộ Khoa học và Công nghệ",
    issuedDate: new Date("2023-05-25"),
    effectiveDate: new Date("2023-07-09"),
    description: "Mẫu chuẩn lý lịch khoa học cá nhân theo quy định Bộ KH&CN (thông tin cá nhân, quá trình đào tạo, công tác, công trình công bố, giải thưởng và bằng sáng chế).",
    fileName: "BM06_Ly_lich_khoa_hoc_ca_nhan.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sampleContent: "PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0b\x00\x00\x00_rels/.relsPK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
  },
  {
    id: "doc-bm-04-danh-gia",
    documentNumber: "BM-04/HĐĐG",
    title: "Mẫu BM-04: Phiếu nhận xét, đánh giá hồ sơ đề tài KH&CN của chuyên gia",
    category: "DOCUMENT_TEMPLATE",
    issuingAuthority: "Phòng Quản lý Khoa học Quân sự",
    issuedDate: new Date("2024-01-20"),
    effectiveDate: new Date("2024-01-20"),
    description: "Mẫu phiếu nhận xét dành cho chuyên gia phản biện và thành viên hội đồng đánh giá tính mới, phương pháp nghiên cứu và năng lực chủ nhiệm.",
    fileName: "BM04_Phieu_nhan_xet_danh_gia_de_tai.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sampleContent: "PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0b\x00\x00\x00_rels/.relsPK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
  },
  {
    id: "doc-hd-01-quy-trinh",
    documentNumber: "HD-01/QLKH",
    title: "Hướng dẫn quy trình đăng ký, nộp hồ sơ và nghiệm thu đề tài NCKH trực tuyến",
    category: "GUIDELINE",
    issuingAuthority: "Phòng Quản lý Khoa học Quân sự",
    issuedDate: new Date("2024-02-10"),
    effectiveDate: new Date("2024-02-10"),
    description: "Tài liệu hướng dẫn thao tác trên hệ thống DocManS: cách nộp hồ sơ thuyết minh, phản hồi yêu cầu bổ sung, nhận thông báo phản biện và theo dõi tiến độ.",
    fileName: "Huong_dan_nop_va_theo_doi_de_tai_truc_tuyen.pdf",
    mimeType: "application/pdf",
    sampleContent: "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF"
  }
];

if (process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY && process.env.MINIO_BUCKET_NAME) {
  const minio = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: ["1", "true", "yes"].includes((process.env.MINIO_USE_SSL ?? "").trim().toLowerCase()),
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
  });
  const bucket = process.env.MINIO_BUCKET_NAME;
  for (const { sampleContent, ...doc } of sampleDocs) {
    const storageObjectKey = `scientific-documents/${doc.id}/${doc.fileName}`;
    // latin1: giữ nguyên từng byte của chữ ký ZIP trong nội dung mẫu.
    const buffer = Buffer.from(sampleContent, "latin1");
    try {
      if (!(await minio.bucketExists(bucket))) await minio.makeBucket(bucket, process.env.MINIO_REGION?.trim() || "us-east-1");
      await minio.putObject(bucket, storageObjectKey, buffer, buffer.length, { "Content-Type": doc.mimeType });
    } catch (error) {
      console.warn(`Bỏ qua văn bản mẫu ${doc.documentNumber}: không ghi được tệp lên MinIO (${error.message}).`);
      continue;
    }
    // update rỗng: seed chạy lại không ghi đè chỉnh sửa hay khôi phục văn bản người quản lý đã xoá.
    await prisma.scientificDocument.upsert({
      where: { id: doc.id },
      update: {},
      create: { ...doc, fileSize: buffer.length, storageObjectKey, createdById: "user-staff" }
    });
  }
} else {
  console.warn("Bỏ qua văn bản mẫu: chưa cấu hình MinIO.");
}

await prisma.$disconnect();
