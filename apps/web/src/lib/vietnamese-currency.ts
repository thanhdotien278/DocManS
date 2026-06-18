const DIGIT_WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALE_WORDS = ["", "nghìn", "triệu", "tỷ"];

export function parseVndNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function formatVndNumber(value: number | string | undefined | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function readTens(tens: number, ones: number) {
  if (tens === 0) {
    return ones ? DIGIT_WORDS[ones] : "";
  }
  if (tens === 1) {
    return ones === 5 ? "mười lăm" : ["mười", ones ? DIGIT_WORDS[ones] : ""].filter(Boolean).join(" ");
  }

  let oneWord = "";
  if (ones === 1) {
    oneWord = "mốt";
  } else if (ones === 5) {
    oneWord = "lăm";
  } else if (ones > 0) {
    oneWord = DIGIT_WORDS[ones];
  }

  return [DIGIT_WORDS[tens], "mươi", oneWord].filter(Boolean).join(" ");
}

function readThreeDigits(value: number, forceHundreds: boolean) {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const parts: string[] = [];

  if (hundreds > 0 || forceHundreds) {
    parts.push(`${DIGIT_WORDS[hundreds]} trăm`);
    if (tens === 0 && ones > 0) {
      parts.push("lẻ");
    }
  }

  const tensText = readTens(tens, ones);
  if (tensText) {
    parts.push(tensText);
  }

  return parts.join(" ");
}

export function numberToVietnameseWords(value: number | undefined | null) {
  if (!Number.isSafeInteger(value) || value === undefined || value === null || value <= 0) {
    return "";
  }

  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words = groups
    .map((group, index) => {
      if (group === 0) {
        return "";
      }
      const scaleIndex = groups.length - index - 1;
      const forceHundreds = index > 0 && group < 100;
      return [readThreeDigits(group, forceHundreds), SCALE_WORDS[scaleIndex]].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" ");

  return `${words.charAt(0).toUpperCase()}${words.slice(1)} đồng`;
}
