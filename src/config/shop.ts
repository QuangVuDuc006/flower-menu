import type { ShopSettings } from '../types/flower';

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'Tiệm Hoa',
  tagline: 'Danh mục hoa tươi tại tiệm',
  hours: '',
  address: '',
  zaloUrl: '',
  contactNote: 'Liên hệ cửa hàng để được hỗ trợ chọn mẫu hoa.',
  priceNote: '',
  welcomeHeading: 'Hoa đẹp cho những khoảnh khắc đặc biệt',
  welcomeSubtitle:
    'Mời bạn xem các mẫu hoa hiện có tại tiệm. Khi chọn được mẫu ưng ý, bạn chỉ cần đưa mã mẫu cho nhân viên để được chuẩn bị chu đáo.',
};

export const DEV_SHOP_SETTINGS: ShopSettings = {
  ...DEFAULT_SHOP_SETTINGS,
  shopName: import.meta.env.VITE_SHOP_NAME || DEFAULT_SHOP_SETTINGS.shopName,
  tagline: import.meta.env.VITE_SHOP_TAGLINE || 'Hoa tươi mỗi ngày',
  hours: import.meta.env.VITE_SHOP_HOURS || '',
  address: import.meta.env.VITE_SHOP_ADDRESS || '',
  zaloUrl: import.meta.env.VITE_ZALO_URL || '',
  contactNote: import.meta.env.VITE_SHOP_CONTACT_NOTE || DEFAULT_SHOP_SETTINGS.contactNote,
  priceNote: import.meta.env.VITE_SHOP_PRICE_NOTE || '',
  welcomeHeading: import.meta.env.VITE_SHOP_WELCOME_HEADING || DEFAULT_SHOP_SETTINGS.welcomeHeading,
  welcomeSubtitle: import.meta.env.VITE_SHOP_WELCOME_SUBTITLE || DEFAULT_SHOP_SETTINGS.welcomeSubtitle,
};

/**
 * Accepts only valid https:// URLs for Zalo links so unsafe schemes or malformed strings never render as clickable links.
 */
export function sanitizeZaloUrl(rawUrl: string | null | undefined): string {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}
