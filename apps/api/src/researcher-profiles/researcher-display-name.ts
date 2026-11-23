/**
 * Tên hiển thị của tài khoản theo lý lịch khoa học: quân hàm, học hàm, học vị rồi họ tên,
 * ví dụ "Thượng tá, PGS. TS. Đỗ Minh Trung". Dùng chung mọi nơi hiện tên tài khoản.
 */

type CatalogRef = { code?: string | null; name?: string | null } | null | undefined;

export type DisplayNameSource = {
  fullName: string;
  militaryRank?: string | null;
  academicRankCatalogItem?: CatalogRef;
  academicDegreeCatalogItem?: CatalogRef;
};

const ACADEMIC_RANK_ABBREVIATIONS: Record<string, string> = {
  professor: "GS.",
  "associate-professor": "PGS.",
  "giáo sư": "GS.",
  "phó giáo sư": "PGS."
};

const ACADEMIC_DEGREE_ABBREVIATIONS: Record<string, string> = {
  doctor: "TS.",
  master: "ThS.",
  bscki: "BSCKI.",
  bsckii: "BSCKII.",
  "tiến sĩ": "TS.",
  "thạc sĩ": "ThS."
};

/** Tiền tố học hàm, học vị đã có sẵn trong họ tên (dữ liệu cũ nhập kèm "PGS. TS. ..."). */
const LEADING_TITLE = /^(?:GS|PGS|TS|TSKH|ThS|BS|BSCKI{1,2}|CN|KS|DS)\.?\s+/i;

function abbreviation(item: CatalogRef, table: Record<string, string>) {
  if (!item) return "";
  const byCode = item.code ? table[item.code.trim().toLowerCase()] : undefined;
  if (byCode) return byCode;
  const name = item.name?.trim() ?? "";
  return table[name.toLocaleLowerCase("vi")] ?? name;
}

/** Tách học hàm, học vị gõ sẵn trước họ tên (dữ liệu cũ "PGS. TS. ...") khỏi họ tên. */
export function splitTypedTitles(fullName: string) {
  let name = fullName.trim().replace(/\s+/g, " ");
  const typed: string[] = [];
  let match = LEADING_TITLE.exec(name);
  while (match) {
    typed.push(match[0].trim().replace(/\.?$/, "."));
    name = name.slice(match[0].length);
    match = LEADING_TITLE.exec(name);
  }
  return { name: name.trim() || fullName.trim(), typedTitles: typed.join(" ") };
}

export function formatResearcherDisplayName(source: DisplayNameSource) {
  const { name, typedTitles } = splitTypedTitles(source.fullName);
  const fromCatalog = [abbreviation(source.academicRankCatalogItem, ACADEMIC_RANK_ABBREVIATIONS), abbreviation(source.academicDegreeCatalogItem, ACADEMIC_DEGREE_ABBREVIATIONS)].filter(Boolean).join(" ");
  // Đã chọn học hàm, học vị trong lý lịch thì lấy theo lý lịch; chưa chọn thì giữ phần đã gõ trong họ tên.
  const titles = fromCatalog || typedTitles;
  const withTitles = titles ? `${titles} ${name}` : name;
  const rank = source.militaryRank?.trim().replace(/\s+/g, " ");
  if (!rank) return withTitles;
  const militaryRank = rank.charAt(0).toLocaleUpperCase("vi") + rank.slice(1);
  return titles ? `${militaryRank}, ${withTitles}` : `${militaryRank} ${withTitles}`;
}

export type AcademicTitleSource = DisplayNameSource & { title?: string | null };

/**
 * Học hàm, học vị viết tắt để ghi ở cột riêng (danh sách hội đồng, biên bản), ví dụ "PGS. TS.". Theo lý lịch nếu đã
 * chọn; chưa chọn thì dùng chức danh khoa học đã gõ, rồi phần gõ sẵn trước họ tên. Không gồm quân hàm.
 */
export function formatAcademicTitle(source: AcademicTitleSource) {
  const fromCatalog = [abbreviation(source.academicRankCatalogItem, ACADEMIC_RANK_ABBREVIATIONS), abbreviation(source.academicDegreeCatalogItem, ACADEMIC_DEGREE_ABBREVIATIONS)].filter(Boolean).join(" ");
  return fromCatalog || source.title?.trim() || splitTypedTitles(source.fullName).typedTitles;
}
