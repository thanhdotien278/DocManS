import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MailService } from "../dist/apps/api/notifications/mail.service.js";

const SUBJECT = "Phòng Khoa học quân sự - Học viện Quân y: Kích hoạt tài khoản";
const URL_WITH_AMP = "https://rtms.example.vn/password-reset?mode=activation&token=abc123";

async function send(template, displayName = "Nguyễn Như Ý") {
  Object.assign(process.env, { SMTP_HOST: "localhost", SMTP_FROM: "x@example.vn", ACCOUNT_LOGIN_URL: "https://rtms.example.vn/login" });
  const service = new MailService({ notificationTemplate: { async findUnique() { return template; } } });
  const sent = [];
  service.sendText = async (input) => { sent.push(input); };
  await service.sendAccountActivation({ to: "a@b.vn", displayName, activationUrl: URL_WITH_AMP, expiresAt: new Date("2026-11-12T13:46:09.882Z"), templateKey: "k" });
  return sent[0];
}

describe("activation email", () => {
  it("uses the required subject, sender unit, button, fallback link and Vietnam-time expiry (no template)", async () => {
    const mail = await send(null);
    assert.equal(mail.subject, SUBJECT);
    assert.match(mail.html, /Kích hoạt tài khoản<\/a>/);
    assert.equal(mail.html.split("&amp;token=abc123").length - 1, 3); // button href + fallback href + fallback text
    assert.match(mail.text, /mode=activation&token=abc123/);
    for (const part of [mail.html, mail.text]) {
      assert.match(part, /20:46 ngày 12\/11\/2026 \(giờ Việt Nam, UTC\+7\)/);
      assert.doesNotMatch(part, /\d{4}-\d{2}-\d{2}T\d{2}:/);
      assert.match(part, /Trân trọng,/);
      assert.match(part, /quản trị viên hệ thống/);
    }
    assert.equal(mail.html.match(/Phòng Khoa học quân sự - Học viện Quân y/g).length >= 3, true);
    assert.doesNotMatch(mail.subject, /DocManS/);
  });

  it("escapes dynamic values in HTML but not in plain text, including active template body", async () => {
    const mail = await send({ status: "active", subject: "S {{displayName}}", body: "Chào <i>{{displayName}}</i>\nHết hạn {{expiresAt}}" }, "<b>A&B</b>");
    assert.equal(mail.subject, "S <b>A&B</b>");
    assert.doesNotMatch(mail.html, /<b>A&B<\/b>|<i>/);
    assert.match(mail.html, /&lt;b&gt;A&amp;B&lt;\/b&gt;/);
    assert.match(mail.html, /<br>Hết hạn 20:46/);
    assert.match(mail.text, /Xin chào <b>A&B<\/b>,/);
  });

  it("ignores inactive templates", async () => {
    assert.equal((await send({ status: "inactive", subject: "old", body: "old" })).subject, SUBJECT);
  });
});
