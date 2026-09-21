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
    systemRole: "SYSTEM_ADMIN",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-leadership",
    username: "tvtien",
    passwordHash:
      "scrypt:user-leadership:ee6993e65023030a9cf863925cf50c6a8e94a829eaeb344059bfb66e2c5419622123ea57a1891543a9f3aa308e48e24057a41bd16860c6150bbfac36614ef657",
    displayName: "GS. TS. Trần Viết Tiến",
    status: "active",
    systemRole: "LEADERSHIP_APPROVAL_AUTHORITY",
    unit: "Ban Giám Đốc"
  },
  {
    id: "user-staff",
    username: "nmphuong",
    passwordHash:
      "scrypt:user-staff:ea925bf5f31fe306cb863a45afec44a4e67d84423e431cb93de5af91425c6723cb66ac59963afe1f47ad86d3c16aec95f73bffc74c22d75b032fd1093f7a71d5",
    displayName: "TS. Nguyễn Minh Phương",
    status: "active",
    systemRole: "SCIENTIFIC_MANAGEMENT_HEAD",
    unit: "Phòng KHQS"
  },
  {
    id: "user-pi",
    username: "patuan",
    passwordHash:
      "scrypt:user-pi:a2b881672bd86b9b7bc23fa6b11a507a1d4142e00c19a9ff0f66f815bee1882f417f0253352b0bd54c66772e4a3949671c0c7f37a691a43c5d05e556e6919a38",
    displayName: "TS. Phạm Anh Tuấn",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-reviewer",
    username: "nmtrung",
    passwordHash:
      "scrypt:user-reviewer:b0782812a1c75cef9db6596a7c88ae497fac0d08b7c7230c908d3c413fc08c2bed386eccfc0cbc10a64a088f1ad9bf6a2f6507410ea3d833bbb0907d958ac12a",
    displayName: "TS. Đỗ Minh Trung",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Ban Quản lý KHQS"
  },
  {
    id: "user-researcher1",
    username: "researcher1",
    passwordHash:
      "scrypt:user-researcher1:92f9d00035d2de8b73b915edd703fdbad5e80e7ec85a8d340fe8c0d7f422fa19c0f2355193a706ec3efcf89d4308318a4c9f330d6a505d7e61314457ea537901",
    displayName: "Nhà nghiên cứu nội bộ 1",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-researcher2",
    username: "researcher2",
    passwordHash:
      "scrypt:user-researcher2:8e740d0ffeb3de7b31c9c947c0729cd6599bf5b63af938eb9ab67a1d90dd87c9471bd1c97249e08f1e1cf64af95ccb49741554828017ade8884cce3492cc6650",
    displayName: "Nhà nghiên cứu nội bộ 2",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-researcher3",
    username: "researcher3",
    passwordHash:
      "scrypt:user-researcher3:302088f55364c04f9a67f05137beb70f53c2a62011912b8e46f10e0e91e5671fdf0a63b46909f88414006dc2b49eb83aba48a126fc858c95323b471ed8246204",
    displayName: "Nhà nghiên cứu nội bộ 3",
    status: "active",
    systemRole: "RESEARCHER_INTERNAL_USER",
    unit: "Khoa Toán - Tin học"
  },
  {
    id: "user-external1",
    username: "external1",
    passwordHash:
      "scrypt:user-external1:cd7a9b317c30cc69b15b34b309e5751ecd3e3b89aa133de3d7004d0b7434b70f6b4b0c399a10cd7b2b3b0c4c68162dc54a7e05b2318eee70a5806c5885ebc2eb",
    displayName: "Nhà nghiên cứu bên ngoài 1",
    status: "active",
    systemRole: "EXTERNAL_RESEARCHER_USER",
    unit: "Đơn vị ngoài"
  },
  {
    id: "user-external2",
    username: "external2",
    passwordHash:
      "scrypt:user-external2:512345665da515aa85dfeacdf5ade9d6d37b864b16f981f36ea248033c37185b91787d44fc1e53c8ec28b1512c13f334306060040ee0cd943759c7f85cf84cbc",
    displayName: "Nhà nghiên cứu bên ngoài 2",
    status: "active",
    systemRole: "EXTERNAL_RESEARCHER_USER",
    unit: "Đơn vị ngoài"
  },
  {
    id: "user-external3",
    username: "external3",
    passwordHash:
      "scrypt:user-external3:b88095f2007342656ee147cb06475f58254a67a78ae71bb02294e4fba4f866106ee03fd46a33d0eefd64bc582428299ae9a478ed634ebc9e2e01a9efbe62a3d3",
    displayName: "Nhà nghiên cứu bên ngoài 3",
    status: "active",
    systemRole: "EXTERNAL_RESEARCHER_USER",
    unit: "Đơn vị ngoài"
  },
  {
    id: "user-staff-hdtien1",
    username: "hdtien1",
    passwordHash:
      "scrypt:user-staff-hdtien1:0ca10cf0ed59766007948d5e2010afb69514a438a457e62f20eb392bfae619b1d91f2fed126c591a8a9f2d945e1d0705fbf6545f1e371e3ce692d19ab1ecdea0",
    displayName: "HD Tiến 1",
    status: "active",
    systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
    unit: "Phòng KHQS"
  },
  {
    id: "user-staff-hdtien2",
    username: "hdtien2",
    passwordHash:
      "scrypt:user-staff-hdtien2:3fcf32d5cd6957b752759325f0ee8c06f19db00e53ba051225606826fe336f7fe8bf4655570b109ee0a59eb1e90bf02c40e9a5f7d67f93562cbbac1774e7ad74",
    displayName: "HD Tiến 2",
    status: "active",
    systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
    unit: "Phòng KHQS"
  },
  {
    id: "user-oversight-vndinh",
    username: "vndinh",
    passwordHash:
      "scrypt:user-oversight-vndinh:160c990dff95c8879c814e0cfebadd0ab04305c0442bdff044342674d7ef241c364e1457a75a02617d6f303aec6e1a01c26d97b2baaa7522e14b9ef8874cbd7f",
    displayName: "Thiếu tướng PGS. TS. Vũ Nhất Định",
    status: "active",
    systemRole: "RESEARCH_OVERSIGHT_AUTHORITY",
    unit: "Ban Giám Đốc"
  }
];

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
  "user-staff-hdtien1": ["org-khti", "org-bqlkhqs", "org-k30", "org-k81", "org-k82", "org-k84"],
  "user-staff-hdtien2": ["org-khti", "org-bqlkhqs", "org-k30", "org-k81", "org-k82", "org-k84"],
  "user-staff": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-khqs").map(([id]) => id),
  "user-oversight-vndinh": organizationUnits.filter(([id]) => id !== "org-external" && id !== "org-bgq").map(([id]) => id)
};

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

const oversightProfile = await prisma.researcherProfile.upsert({
  where: { id: "profile-oversight-vndinh" },
  update: {
    managementOrganizationUnitId: "org-bgq",
    linkedUserId: "user-oversight-vndinh",
    profileType: "INTERNAL",
    fullName: "Thiếu tướng PGS. TS. Vũ Nhất Định",
    fullNameKey: "thieu tuong pgs ts vu nhat dinh",
    militaryRank: "Thiếu tướng",
    title: "PGS. TS.",
    position: "Phó Giám đốc phụ trách NCKH",
    status: "ACTIVE",
    updatedById: "user-admin"
  },
  create: {
    id: "profile-oversight-vndinh",
    managementOrganizationUnitId: "org-bgq",
    linkedUserId: "user-oversight-vndinh",
    profileType: "INTERNAL",
    fullName: "Thiếu tướng PGS. TS. Vũ Nhất Định",
    fullNameKey: "thieu tuong pgs ts vu nhat dinh",
    militaryRank: "Thiếu tướng",
    title: "PGS. TS.",
    position: "Phó Giám đốc phụ trách NCKH",
    status: "ACTIVE",
    createdById: "user-admin",
    updatedById: "user-admin"
  }
});

const existingOversightLink = await prisma.researcherProfileAccountLink.findFirst({ where: { researcherProfileId: oversightProfile.id, userId: "user-oversight-vndinh" } });
if (existingOversightLink) {
  await prisma.researcherProfileAccountLink.update({ where: { id: existingOversightLink.id }, data: { status: "ACTIVE", effectiveUntil: null, reason: "seed-oversight-account" } });
} else {
  await prisma.researcherProfileAccountLink.create({ data: { researcherProfileId: oversightProfile.id, userId: "user-oversight-vndinh", status: "ACTIVE", effectiveFrom: new Date(), reason: "seed-oversight-account", createdById: "user-admin" } });
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

await prisma.notificationTemplate.upsert({
  where: { key: "researcher_account_activation" },
  update: {
    subject: "Kích hoạt tài khoản DocManS",
    body: "Xin chào {{displayName}}, vui lòng thiết lập mật khẩu để kích hoạt tài khoản DocManS.",
    status: "active"
  },
  create: {
    key: "researcher_account_activation",
    subject: "Kích hoạt tài khoản DocManS",
    body: "Xin chào {{displayName}}, vui lòng thiết lập mật khẩu để kích hoạt tài khoản DocManS.",
    status: "active"
  }
});

await prisma.$disconnect();
