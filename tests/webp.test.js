import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWebp, sha256Hex } from '../worker/webp.js';

function createRiff(chunks) {
  let totalChunkBytes = 0;
  for (const c of chunks) {
    const pad = c.payload.length % 2 === 1 ? 1 : 0;
    totalChunkBytes += 8 + c.payload.length + pad;
  }
  const totalSize = 12 + totalChunkBytes;
  const buf = new Uint8Array(totalSize);
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  const view = new DataView(buf.buffer);
  view.setUint32(4, totalSize - 8, true);
  buf.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP

  let offset = 12;
  for (const c of chunks) {
    for (let i = 0; i < 4; i++) {
      buf[offset + i] = c.fourcc.charCodeAt(i);
    }
    view.setUint32(offset + 4, c.payload.length, true);
    buf.set(c.payload, offset + 8);
    offset += 8 + c.payload.length;
    if (c.payload.length % 2 === 1) {
      buf[offset] = c.padByte ?? 0x00;
      offset += 1;
    }
  }
  return buf;
}

function makeVp8Payload(width = 100, height = 80, keyframe = true, startCode = [0x9D, 0x01, 0x2A]) {
  const payload = new Uint8Array(10);
  payload[0] = keyframe ? 0x00 : 0x01;
  payload[1] = 0x00;
  payload[2] = 0x00;
  payload[3] = startCode[0];
  payload[4] = startCode[1];
  payload[5] = startCode[2];
  payload[6] = width & 0xFF;
  payload[7] = (width >> 8) & 0x3F;
  payload[8] = height & 0xFF;
  payload[9] = (height >> 8) & 0x3F;
  return payload;
}

function makeVp8lPayload(width = 120, height = 90, sig = 0x2F) {
  const payload = new Uint8Array(5);
  payload[0] = sig;
  const wMinus1 = width - 1;
  const hMinus1 = height - 1;
  payload[1] = wMinus1 & 0xFF;
  payload[2] = ((wMinus1 >> 8) & 0x3F) | ((hMinus1 & 0x03) << 6);
  payload[3] = (hMinus1 >> 2) & 0xFF;
  payload[4] = (hMinus1 >> 10) & 0x0F;
  return payload;
}

function makeVp8xPayload(canvasW = 200, canvasH = 150, animated = false) {
  const payload = new Uint8Array(10);
  payload[0] = animated ? 0x02 : 0x00;
  const cwMinus1 = canvasW - 1;
  const chMinus1 = canvasH - 1;
  payload[4] = cwMinus1 & 0xFF;
  payload[5] = (cwMinus1 >> 8) & 0xFF;
  payload[6] = (cwMinus1 >> 16) & 0xFF;
  payload[7] = chMinus1 & 0xFF;
  payload[8] = (chMinus1 >> 8) & 0xFF;
  payload[9] = (chMinus1 >> 16) & 0xFF;
  return payload;
}

test('validateWebp validates standard VP8 sample', () => {
  const base64Vp8 = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
  const raw = Buffer.from(base64Vp8, 'base64');
  const res = validateWebp(new Uint8Array(raw));
  assert.equal(res.valid, true);
  assert.equal(res.width, 1);
  assert.equal(res.height, 1);
  assert.equal(res.format, 'VP8');
});

test('validateWebp validates VP8 with custom dimensions', () => {
  const buf = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload(640, 480) }]);
  const res = validateWebp(buf);
  assert.equal(res.valid, true);
  assert.equal(res.width, 640);
  assert.equal(res.height, 480);
  assert.equal(res.format, 'VP8');
});

test('validateWebp validates VP8L lossless bitstream', () => {
  const buf = createRiff([{ fourcc: 'VP8L', payload: makeVp8lPayload(800, 600) }]);
  const res = validateWebp(buf);
  assert.equal(res.valid, true);
  assert.equal(res.width, 800);
  assert.equal(res.height, 600);
  assert.equal(res.format, 'VP8L');
});

test('validateWebp validates VP8X container with subsequent VP8', () => {
  const buf = createRiff([
    { fourcc: 'VP8X', payload: makeVp8xPayload(1024, 768) },
    { fourcc: 'VP8 ', payload: makeVp8Payload(1024, 768) },
  ]);
  const res = validateWebp(buf);
  assert.equal(res.valid, true);
  assert.equal(res.width, 1024);
  assert.equal(res.height, 768);
  assert.equal(res.format, 'VP8X');
});

test('validateWebp rejects non-Uint8Array or invalid length', () => {
  assert.equal(validateWebp(null).valid, false);
  assert.equal(validateWebp('not-a-buffer').valid, false);
  assert.equal(validateWebp(new Uint8Array(19)).valid, false);
  assert.equal(validateWebp(new Uint8Array(153601)).valid, false);
});

test('validateWebp rejects invalid RIFF / WEBP headers', () => {
  const buf = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload() }]);
  const badRiff = new Uint8Array(buf);
  badRiff[0] = 0x41; // 'A'
  assert.equal(validateWebp(badRiff).valid, false);

  const badWebp = new Uint8Array(buf);
  badWebp[8] = 0x41;
  assert.equal(validateWebp(badWebp).valid, false);

  const badSize = new Uint8Array(buf);
  new DataView(badSize.buffer).setUint32(4, buf.length, true);
  assert.equal(validateWebp(badSize).valid, false);
});

test('validateWebp rejects truncated or misaligned chunks', () => {
  const buf = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload() }]);
  // Truncate 2 bytes
  const truncated = buf.subarray(0, buf.length - 2);
  new DataView(truncated.buffer).setUint32(4, truncated.length - 8, true);
  assert.equal(validateWebp(truncated).valid, false);

  // Trailing extra byte
  const trailing = new Uint8Array(buf.length + 1);
  trailing.set(buf);
  assert.equal(validateWebp(trailing).valid, false);
});

test('validateWebp checks odd-chunk padding byte', () => {
  const oddPayload = new Uint8Array(11);
  oddPayload.set(makeVp8Payload());
  // Non-zero pad byte
  const badPad = createRiff([{ fourcc: 'VP8 ', payload: oddPayload, padByte: 0x01 }]);
  assert.equal(validateWebp(badPad).valid, false);

  // Valid zero pad byte
  const goodPad = createRiff([{ fourcc: 'VP8 ', payload: oddPayload, padByte: 0x00 }]);
  const res = validateWebp(goodPad);
  assert.equal(res.valid, true);
});

test('validateWebp enforces VP8 keyframe and start code', () => {
  const notKeyframe = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload(100, 100, false) }]);
  assert.equal(validateWebp(notKeyframe).valid, false);

  const badCode = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload(100, 100, true, [0x00, 0x00, 0x00]) }]);
  assert.equal(validateWebp(badCode).valid, false);
});

test('validateWebp enforces VP8 and VP8L dimensions in 1..4096', () => {
  const zeroDim = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload(0, 100) }]);
  assert.equal(validateWebp(zeroDim).valid, false);

  const tooLarge = createRiff([{ fourcc: 'VP8 ', payload: makeVp8Payload(4097, 100) }]);
  assert.equal(validateWebp(tooLarge).valid, false);

  const badVp8lSig = createRiff([{ fourcc: 'VP8L', payload: makeVp8lPayload(100, 100, 0x00) }]);
  assert.equal(validateWebp(badVp8lSig).valid, false);
});

test('validateWebp rejects animated WebP and header-only VP8X', () => {
  const animated = createRiff([
    { fourcc: 'VP8X', payload: makeVp8xPayload(100, 100, true) },
    { fourcc: 'VP8 ', payload: makeVp8Payload() },
  ]);
  assert.equal(validateWebp(animated).valid, false);

  const headerOnly = createRiff([
    { fourcc: 'VP8X', payload: makeVp8xPayload(100, 100, false) },
  ]);
  assert.equal(validateWebp(headerOnly).valid, false);
});

test('sha256Hex returns 16 lowercase hex characters', async () => {
  const raw = new Uint8Array([1, 2, 3, 4, 5]);
  const hash = await sha256Hex(raw);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 16);
  assert.match(hash, /^[0-9a-f]{16}$/);
});
