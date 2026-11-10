export const ACTIVATION_SENDER_NAME = "Phòng Khoa học quân sự - Học viện Quân y";
export const ACTIVATION_SUBJECT = `${ACTIVATION_SENDER_NAME}: Kích hoạt tài khoản`;
export const ACTIVATION_DEFAULT_PURPOSE = "Tài khoản của bạn trên Hệ thống quản lý nghiên cứu khoa học (DocManS) đã được tạo. Vui lòng thiết lập mật khẩu để kích hoạt tài khoản.";

export type ActivationEmailValues = { displayName: string; activationUrl: string; expiresAt: string; purpose: string };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Giờ Việt Nam không có DST nên nhãn UTC+7 cố định là chính xác. */
export function formatExpiry(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.hour}:${parts.minute} ngày ${parts.day}/${parts.month}/${parts.year} (giờ Việt Nam, UTC+7)`;
}

export function renderActivationText(v: ActivationEmailValues) {
  return [
    ACTIVATION_SENDER_NAME, "", `Xin chào ${v.displayName},`, "", v.purpose, "",
    `Kích hoạt tài khoản: ${v.activationUrl}`, `Liên kết có hiệu lực đến ${v.expiresAt}.`, "",
    "Vui lòng không chia sẻ liên kết này với bất kỳ ai.",
    "Nếu bạn không yêu cầu tạo tài khoản, hãy liên hệ quản trị viên hệ thống.", "",
    "Trân trọng,", ACTIVATION_SENDER_NAME
  ].join("\n");
}

export function renderActivationHtml(v: ActivationEmailValues) {
  const url = escapeHtml(v.activationUrl);
  const font = "font-family:Arial,Helvetica,sans-serif;";
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(ACTIVATION_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f4;"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dde3df;">
<tr><td style="background:#145a37;padding:16px 24px;${font}font-size:16px;font-weight:bold;color:#ffffff;">${escapeHtml(ACTIVATION_SENDER_NAME)}</td></tr>
<tr><td style="padding:24px;${font}font-size:15px;line-height:1.6;color:#1f2933;">
<p style="margin:0 0 16px;">Xin chào <strong>${escapeHtml(v.displayName)}</strong>,</p>
<p style="margin:0 0 24px;">${escapeHtml(v.purpose).replace(/\r?\n/g, "<br>")}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center" bgcolor="#145a37" style="border-radius:4px;"><a href="${url}" style="display:inline-block;padding:12px 28px;${font}font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Kích hoạt tài khoản</a></td></tr></table>
<p style="margin:0 0 4px;font-size:13px;color:#52606d;">Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:</p>
<p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${url}" style="color:#145a37;">${url}</a></p>
<p style="margin:0 0 8px;">Liên kết có hiệu lực đến <strong>${escapeHtml(v.expiresAt)}</strong>.</p>
<p style="margin:0 0 8px;">Vui lòng không chia sẻ liên kết này với bất kỳ ai.</p>
<p style="margin:0 0 24px;">Nếu bạn không yêu cầu tạo tài khoản, hãy liên hệ quản trị viên hệ thống.</p>
<p style="margin:0;">Trân trọng,<br><strong>${escapeHtml(ACTIVATION_SENDER_NAME)}</strong></p>
</td></tr></table></td></tr></table></body></html>`;
}
