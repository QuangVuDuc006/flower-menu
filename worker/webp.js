/**
 * Pure-JS Cloudflare Workers compatible WebP validator and hasher.
 * Enforces strict RIFF chunk traversal, size bounds, and VP8/VP8L/VP8X validation.
 */

/**
 * Validates a WebP image buffer.
 * @param {Uint8Array} raw
 * @returns {{ valid: true, width: number, height: number, format: 'VP8' | 'VP8L' | 'VP8X' } | { valid: false, error: string }}
 */
export function validateWebp(raw) {
  if (!raw || !(raw instanceof Uint8Array)) {
    return { valid: false, error: 'Dữ liệu ảnh không hợp lệ.' };
  }

  // Enforce size limit: 20 bytes minimum (header + minimal chunk) to 153,600 bytes (150 KB)
  if (raw.length < 20 || raw.length > 153600) {
    return { valid: false, error: 'Ảnh cần có dung lượng từ 20 B đến 150 KB.' };
  }

  // Check RIFF header: "RIFF" (0x52, 0x49, 0x46, 0x46)
  if (raw[0] !== 0x52 || raw[1] !== 0x49 || raw[2] !== 0x46 || raw[3] !== 0x46) {
    return { valid: false, error: 'Thiếu định dạng RIFF.' };
  }

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const fileSize = view.getUint32(4, true);
  if (fileSize !== raw.length - 8) {
    return { valid: false, error: 'Kích thước tệp RIFF không khớp.' };
  }

  // Check "WEBP" signature: 0x57, 0x45, 0x42, 0x50
  if (raw[8] !== 0x57 || raw[9] !== 0x45 || raw[10] !== 0x42 || raw[11] !== 0x50) {
    return { valid: false, error: 'Thiếu chữ ký WEBP.' };
  }

  let offset = 12;
  let firstChunk = true;
  let hasVp8x = false;
  let hasImageBitstream = false;
  let width = 0;
  let height = 0;
  let format = '';

  while (offset < raw.length) {
    if (offset + 8 > raw.length) {
      return { valid: false, error: 'Phần đầu chunk bị cắt cụt.' };
    }

    const fourcc = String.fromCharCode(raw[offset], raw[offset + 1], raw[offset + 2], raw[offset + 3]);
    const chunkSize = view.getUint32(offset + 4, true);
    const payloadStart = offset + 8;

    if (payloadStart + chunkSize > raw.length) {
      return { valid: false, error: 'Dữ liệu chunk bị cắt cụt.' };
    }

    const pad = chunkSize % 2 === 1 ? 1 : 0;
    if (payloadStart + chunkSize + pad > raw.length) {
      return { valid: false, error: 'Thiếu byte đệm của chunk lẻ.' };
    }
    if (pad === 1 && raw[payloadStart + chunkSize] !== 0x00) {
      return { valid: false, error: 'Byte đệm chunk phải là 0x00.' };
    }

    if (firstChunk) {
      firstChunk = false;
      if (fourcc === 'VP8X') {
        hasVp8x = true;
        format = 'VP8X';
        if (chunkSize !== 10) {
          return { valid: false, error: 'Kích thước chunk VP8X phải đúng 10 bytes.' };
        }
        const flags = raw[payloadStart];
        if ((flags & 0x02) !== 0) {
          return { valid: false, error: 'Không hỗ trợ ảnh WebP động (animation).' };
        }
        const canvasW = 1 + (raw[payloadStart + 4] | (raw[payloadStart + 5] << 8) | (raw[payloadStart + 6] << 16));
        const canvasH = 1 + (raw[payloadStart + 7] | (raw[payloadStart + 8] << 8) | (raw[payloadStart + 9] << 16));
        if (canvasW < 1 || canvasW > 4096 || canvasH < 1 || canvasH > 4096) {
          return { valid: false, error: 'Kích thước canvas WebP vượt giới hạn (1..4096).' };
        }
        width = canvasW;
        height = canvasH;
      } else if (fourcc === 'VP8 ') {
        const vp8 = parseVP8(raw, payloadStart, chunkSize);
        if (!vp8.valid) return vp8;
        hasImageBitstream = true;
        format = 'VP8';
        width = vp8.width;
        height = vp8.height;
      } else if (fourcc === 'VP8L') {
        const vp8l = parseVP8L(raw, payloadStart, chunkSize);
        if (!vp8l.valid) return vp8l;
        hasImageBitstream = true;
        format = 'VP8L';
        width = vp8l.width;
        height = vp8l.height;
      } else {
        return { valid: false, error: `Chunk đầu tiên không hợp lệ: ${fourcc}.` };
      }
    } else {
      if (fourcc === 'VP8X') {
        return { valid: false, error: 'VP8X chỉ được phép là chunk đầu tiên.' };
      } else if (fourcc === 'VP8 ') {
        const vp8 = parseVP8(raw, payloadStart, chunkSize);
        if (!vp8.valid) return vp8;
        hasImageBitstream = true;
        if (!hasVp8x) {
          format = 'VP8';
          width = vp8.width;
          height = vp8.height;
        }
      } else if (fourcc === 'VP8L') {
        const vp8l = parseVP8L(raw, payloadStart, chunkSize);
        if (!vp8l.valid) return vp8l;
        hasImageBitstream = true;
        if (!hasVp8x) {
          format = 'VP8L';
          width = vp8l.width;
          height = vp8l.height;
        }
      }
    }

    offset = payloadStart + chunkSize + pad;
  }

  if (offset !== raw.length) {
    return { valid: false, error: 'Tệp chứa dữ liệu dư thừa hoặc căn lề không đúng.' };
  }

  if (hasVp8x && !hasImageBitstream) {
    return { valid: false, error: 'VP8X thiếu chunk bitstream hình ảnh (VP8 hoặc VP8L).' };
  }

  if (!hasImageBitstream) {
    return { valid: false, error: 'Không tìm thấy bitstream hình ảnh hợp lệ.' };
  }

  return { valid: true, width, height, format };
}

function parseVP8(raw, offset, size) {
  if (size < 10) {
    return { valid: false, error: 'Chunk VP8 quá ngắn (tối thiểu 10 bytes).' };
  }
  const b0 = raw[offset];
  // Frame type bit 0 must be 0 for key frame
  if ((b0 & 1) !== 0) {
    return { valid: false, error: 'VP8 phải là keyframe.' };
  }
  // Start code: 0x9D 0x01 0x2A
  if (raw[offset + 3] !== 0x9D || raw[offset + 4] !== 0x01 || raw[offset + 5] !== 0x2A) {
    return { valid: false, error: 'Mã khởi đầu VP8 không hợp lệ.' };
  }
  const w = (raw[offset + 6] | (raw[offset + 7] << 8)) & 0x3FFF;
  const h = (raw[offset + 8] | (raw[offset + 9] << 8)) & 0x3FFF;
  if (w < 1 || w > 4096 || h < 1 || h > 4096) {
    return { valid: false, error: 'Kích thước VP8 vượt giới hạn (1..4096).' };
  }
  return { valid: true, width: w, height: h };
}

function parseVP8L(raw, offset, size) {
  if (size < 5) {
    return { valid: false, error: 'Chunk VP8L quá ngắn (tối thiểu 5 bytes).' };
  }
  if (raw[offset] !== 0x2F) {
    return { valid: false, error: 'Byte chữ ký VP8L không phải 0x2F.' };
  }
  const b1 = raw[offset + 1];
  const b2 = raw[offset + 2];
  const b3 = raw[offset + 3];
  const b4 = raw[offset + 4];

  const w = 1 + (((b2 & 0x3F) << 8) | b1);
  const h = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 >> 6) & 0x03));

  if (w < 1 || w > 4096 || h < 1 || h > 4096) {
    return { valid: false, error: 'Kích thước VP8L vượt giới hạn (1..4096).' };
  }
  return { valid: true, width: w, height: h };
}

/**
 * Computes first 16 hex characters of SHA-256 for the input bytes.
 * @param {Uint8Array} raw
 * @returns {Promise<string>}
 */
export async function sha256Hex(raw) {
  const digest = await crypto.subtle.digest('SHA-256', raw);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
