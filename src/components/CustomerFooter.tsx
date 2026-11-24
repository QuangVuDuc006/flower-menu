import { Clock, Layers, LockKeyhole, MapPin } from 'lucide-react';
import type { AppScreen, ShopSettings } from '../types/flower';
import { DEFAULT_SHOP_SETTINGS, sanitizeZaloUrl } from '../config/shop';
import { BotanicalEmblem, ZaloIcon } from './ui/Primitives';

interface CustomerFooterProps {
  isAdminAuthenticated: boolean;
  onNavigate: (screen: AppScreen) => void;
  settings?: ShopSettings;
  showDevTools?: boolean;
}

export function CustomerFooter({
  isAdminAuthenticated,
  onNavigate,
  settings,
  showDevTools = false,
}: CustomerFooterProps) {
  const currentSettings = settings || DEFAULT_SHOP_SETTINGS;
  const validZaloUrl = sanitizeZaloUrl(currentSettings.zaloUrl);

  return (
    <footer id="lien-he" tabIndex={-1} className="mt-14 sm:mt-20 border-t border-line bg-cream/55 focus:outline-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-12">
        {/* Compact, calm Zalo Contact Block */}
        <div className="rounded-2xl bg-paper border border-line px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="font-serif text-xl sm:text-2xl font-semibold text-charcoal leading-snug">
              Cần tư vấn thêm?
            </p>
            <p className="text-sm sm:text-[15px] text-stone">
              {currentSettings.contactNote || 'Liên hệ cửa hàng để được hỗ trợ chọn mẫu hoa.'}
            </p>
          </div>
          {validZaloUrl && (
            <div className="shrink-0">
              <a
                href={validZaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest/35 px-4 font-medium text-forest hover:bg-cream transition-colors"
              >
                <ZaloIcon className="h-4 w-4" />
                <span>Liên hệ qua Zalo</span>
              </a>
            </div>
          )}
        </div>

        {/* Subtle Shop Info & Utility Links */}
        <div className="mt-8 pt-6 border-t border-line/80 flex flex-col md:flex-row md:items-center justify-between gap-5 text-xs sm:text-sm text-stone">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="inline-flex items-center gap-2 text-charcoal font-medium">
              <BotanicalEmblem className="w-5 h-5" />
              <span className="font-serif text-lg font-semibold">{currentSettings.shopName || 'Tiệm Hoa'}</span>
            </div>
            {currentSettings.hours?.trim() && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sage shrink-0" />
                <span>Mở cửa: {currentSettings.hours}</span>
              </span>
            )}
            {currentSettings.address?.trim() && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sage shrink-0" />
                <span>{currentSettings.address}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {showDevTools && (
              <button
                type="button"
                onClick={() => onNavigate('design-system')}
                className="min-h-[40px] px-2.5 rounded-lg inline-flex items-center gap-1.5 text-stone hover:text-charcoal hover:bg-cream transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Hệ thống thiết kế</span>
              </button>
            )}

            {/* Quiet admin link so shop owner can reach /admin without distracting customers */}
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onNavigate(isAdminAuthenticated ? 'admin-dashboard' : 'admin-login');
              }}
              className="min-h-[40px] px-2.5 rounded-lg inline-flex items-center gap-1.5 text-stone hover:text-charcoal hover:bg-cream transition-colors text-xs"
            >
              <LockKeyhole className="w-3.5 h-3.5 text-sage shrink-0" />
              <span>{isAdminAuthenticated ? 'Bảng quản lý tiệm' : 'Quản trị tiệm'}</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
