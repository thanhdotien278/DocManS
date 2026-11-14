const SIGNATURES = { pdf: Buffer.from("%PDF"), docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]), xlsx: Buffer.from([0x50, 0x4b, 0x03, 0x04]), doc: Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), xls: Buffer.from([0xd0, 0xcf, 0x11, 0xe0]) };

/** `size` bytes that start with the file signature the upload check expects for `fileName`'s extension. */
export function fileBytes(size, fileName = "a.pdf") {
  const content = Buffer.alloc(size, "p");
  SIGNATURES[fileName.split(".").pop().toLowerCase()].copy(content);
  return content;
}
