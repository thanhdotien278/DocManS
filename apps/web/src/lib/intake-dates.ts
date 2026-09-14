const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric"
});

export function formatIntakeDate(value: string) {
  return value ? dateFormat.format(new Date(value)) : "Chưa có";
}

export function toIntakeDateInput(value: string) {
  return value ? formatIntakeDate(value).split("/").reverse().join("-") : "";
}

export function intakeDateToIso(value: string, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`).toISOString();
}
