import type { FlowerProduct, ProductCategory } from '../types/flower';

/**
 * Formats numeric VND price into Vietnamese currency notation, e.g. 350.000đ
 */
export function formatVND(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '0đ';
  const rounded = Math.round(amount);
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

/**
 * Strips Vietnamese diacritics for forgiving, effortless search across all ages
 */
export function normalizeVietnamese(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATEGORY_PREFIX_MAP: Record<ProductCategory, string> = {
  'Hoa bó': 'BH',
  'Hoa giỏ': 'HG',
  'Hoa sinh nhật': 'SN',
  'Hoa chúc mừng': 'HC',
  'Hoa theo yêu cầu': 'TY',
};

/**
 * Automatically generates the next unique product code for a selected category
 * e.g. BH-006, HG-003, HC-002
 */
export function generateProductCode(
  category: ProductCategory,
  existingProducts: FlowerProduct[]
): string {
  const prefix = CATEGORY_PREFIX_MAP[category] || 'BH';
  let maxNumber = 0;

  for (const item of existingProducts) {
    const match = item.code.toUpperCase().match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = String(maxNumber + 1).padStart(3, '0');
  return `${prefix}-${nextNumber}`;
}

/**
 * Copies text reliably in both modern browsers and sandboxed preview iframes
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to textarea fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  } catch {
    return false;
  }
}
