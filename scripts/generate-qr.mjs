#!/usr/bin/env node

/**
 * QR Code Generator for Flower QR Menu
 *
 * Produces crisp, print-ready vector (SVG) and high-resolution bitmap (PNG)
 * QR codes pointing to the production flower menu URL.
 *
 * Usage:
 *   node scripts/generate-qr.mjs --url <https-url> [--out <dir>] [--allow-local]
 *
 * Examples:
 *   node scripts/generate-qr.mjs --url https://tiemhoatuoi.vn/
 *   node scripts/generate-qr.mjs --url https://example.com/ --out dist-qr
 *   node scripts/generate-qr.mjs --url http://localhost:5173/ --allow-local
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

function printHelp() {
  console.log(`
Flower QR Menu - QR Code Generator

Usage:
  node scripts/generate-qr.mjs --url <target-url> [options]

Options:
  --url <url>      Destination URL for the QR code (Required).
                   Must be a valid HTTPS URL in production.
  --out <dir>      Output directory for generated files (Default: "dist-qr").
  --allow-local    Allow HTTP, localhost, 127.0.0.1, or *.pages.dev preview URLs.
                   (Only use during local testing or staging verification).
  -h, --help       Show this help message.

Output Files:
  <out>/qr-menu.svg  Crisp vector format for professional print shops & large posters.
  <out>/qr-menu.png  1024x1024 PNG with Level 'H' error correction (30% redundancy)
                     for table standees, counter stickers, and digital sharing.
`);
}

function parseArgs(args) {
  const options = {
    url: '',
    out: 'dist-qr',
    allowLocal: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
      return options;
    }

    if (arg === '--allow-local') {
      options.allowLocal = true;
      continue;
    }

    if (arg.startsWith('--url=')) {
      options.url = arg.slice(6);
      continue;
    }

    if (arg === '--url') {
      i++;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error('Option --url requires a URL argument.');
      }
      options.url = args[i];
      continue;
    }

    if (arg.startsWith('--out=')) {
      options.out = arg.slice(6);
      continue;
    }

    if (arg === '--out') {
      i++;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error('Option --out requires a directory path argument.');
      }
      options.out = args[i];
      continue;
    }

    throw new Error(`Unknown option: "${arg}". Use --help for usage information.`);
  }

  return options;
}

function validateAndNormalizeUrl(rawUrl, allowLocal) {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) {
    throw new Error('URL is required. Provide --url <https-url>');
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    throw new Error(`Invalid URL format: "${trimmed}". Details: ${err.message}`);
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  if (!allowLocal) {
    if (protocol !== 'https:') {
      throw new Error(
        `Production QR code must use "https://", got "${protocol}". Use --allow-local for local testing.`
      );
    }

    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local');

    if (isLocalhost) {
      throw new Error(
        `Production QR code cannot point to local address "${hostname}". Use --allow-local for local testing.`
      );
    }

    const isPreviewHost =
      hostname.endsWith('.pages.dev') ||
      hostname.endsWith('.workers.dev');

    if (isPreviewHost) {
      throw new Error(
        `Production QR code should point to the official custom domain (e.g., https://tiemhoa.vn/), ` +
        `not preview/staging domain "${hostname}". If intentionally printing a test QR for staging, pass --allow-local.`
      );
    }
  } else if (protocol !== 'https:' && protocol !== 'http:') {
    throw new Error(`URL protocol must be http: or https:, got "${protocol}".`);
  }

  return parsed.toString();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const targetUrl = validateAndNormalizeUrl(options.url, options.allowLocal);
  const outDir = path.resolve(process.cwd(), options.out);

  await fs.mkdir(outDir, { recursive: true });

  const svgPath = path.join(outDir, 'qr-menu.svg');
  const pngPath = path.join(outDir, 'qr-menu.png');

  // Error correction Level H allows up to ~30% damage/obstruction (ideal for counter standees and logo placement).
  // Quiet zone margin 4 conforms to standard QR scanning specs.
  const qrOptions = {
    errorCorrectionLevel: 'H',
    margin: 4,
  };

  // 1. Generate crisp SVG vector
  const svgContent = await QRCode.toString(targetUrl, {
    ...qrOptions,
    type: 'svg',
  });
  await fs.writeFile(svgPath, svgContent, 'utf8');

  // 2. Generate high-resolution 1024x1024 PNG
  const pngBuffer = await QRCode.toBuffer(targetUrl, {
    ...qrOptions,
    type: 'png',
    width: 1024,
  });
  await fs.writeFile(pngPath, pngBuffer);

  const svgStat = await fs.stat(svgPath);
  const pngStat = await fs.stat(pngPath);

  console.log('----------------------------------------------------');
  console.log(' Flower QR Menu - QR Code Generation Succeeded');
  console.log('----------------------------------------------------');
  console.log(`Target URL:       ${targetUrl}`);
  if (options.allowLocal) {
    console.log('Mode:             Local / Staging (--allow-local enabled)');
  } else {
    console.log('Mode:             Production (Strict HTTPS & Domain Enforced)');
  }
  console.log(`Output Directory: ${outDir}`);
  console.log(`- Vector SVG:     ${path.relative(process.cwd(), svgPath)} (${svgStat.size} bytes)`);
  console.log(`- 1024x1024 PNG:  ${path.relative(process.cwd(), pngPath)} (${pngStat.size} bytes)`);
  console.log('Error Correction: Level H (High - 30% recovery capacity)');
  console.log('Quiet Zone:       4 modules margin');
  console.log('----------------------------------------------------');
  console.log('Print Recommendations:');
  console.log('1. Use qr-menu.svg for professional Illustrator/Corel designs (standees, acrylic blocks).');
  console.log('2. Recommended print size at counter: 6 cm x 6 cm to 10 cm x 10 cm for effortless scanning.');
  console.log('3. Test scan with at least 1 iPhone and 1 Android phone under normal room lighting before printing.');
  console.log('----------------------------------------------------');
}

main().catch((err) => {
  console.error(`\n[ERROR] ${err.message}\n`);
  process.exit(1);
});
