import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SCRYPT_HEX_LENGTH = KEY_LENGTH * 2;

@Injectable()
export class PasswordService {
  async hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
  }

  async verifyPassword(password: string, storedHash: string) {
    const [algorithm, salt, key] = storedHash.split(":");

    if (algorithm !== "scrypt" || !salt || !key || !/^[0-9a-f]+$/i.test(key) || key.length !== SCRYPT_HEX_LENGTH) {
      return false;
    }

    const expected = Buffer.from(key, "hex");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
