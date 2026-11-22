import { Clock, Layers, LockKeyhole, MapPin } from 'lucide-react';
import type { AppScreen } from '../types/flower';
import { SHOP_INFO } from '../data/mockFlowers';
import { BotanicalEmblem, ZaloIcon } from './ui/Primitives';

interface CustomerFooterProps {
  isAdminAuthenticated: boolean;
  onNavigate: (screen: AppScreen) => void;
}

export function CustomerFooter({
  isAdminAuthenticated,
  onNavigate,
}: CustomerFooterProps) {
  return (
      <footer id="lien-he" tabIndex={-1} className="mt-14 sm:mt-20 border-t border-line bg-cream/55">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-12">
          {/* Compact, calm Zalo Contact Block */}
          <div className="rounded-2xl bg-paper border border-line px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="font-serif text-xl sm:text-2xl font-semibold text-charcoal leading-snug">
                Cần tư vấn thêm?
              </p>
              <p className="text-sm sm:text-[15px] text-stone">
                Liên hệ cửa hàng để được hỗ trợ chọn mẫu hoa.
              </p>
            </div>
            <div className="shrink-0">
              {SHOP_INFO.zaloUrl ? (
                <a
                  href={SHOP_INFO.zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest/35 px-4 font-medium text-forest hover:bg-cream"
                >
                  <ZaloIcon className="h-4 w-4" />
                  Liên hệ qua Zalo
                </a>
              ) : (
                <span className="text-sm text-stone">Zalo chưa cập nhật</span>
              )}
            </div>
          </div>

          {/* Subtle Shop Info & Utility Links */}
          <div className="mt-8 pt-6 border-t border-line/80 flex flex-col md:flex-row md:items-center justify-between gap-5 text-xs sm:text-sm text-stone">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="inline-flex items-center gap-2 text-charcoal font-medium">
                <BotanicalEmblem className="w-5 h-5" />
                <span className="font-serif text-lg font-semibold">{SHOP_INFO.name}</span>
              </div>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sage shrink-0" />
                <span>Mở cửa: {SHOP_INFO.hours}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sage shrink-0" />
                <span>{SHOP_INFO.address}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => onNavigate('design-system')}
                className="min-h-[40px] px-2.5 rounded-lg inline-flex items-center gap-1.5 text-stone hover:text-charcoal hover:bg-cream transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Hệ thống thiết kế</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigate(isAdminAuthenticated ? 'admin-dashboard' : 'admin-login')
                }
                className="min-h-[40px] px-2.5 rounded-lg inline-flex items-center gap-1.5 text-stone hover:text-charcoal hover:bg-cream transition-colors"
              >
                <LockKeyhole className="w-3.5 h-3.5" />
                <span>
                  {isAdminAuthenticated ? 'Bảng quản lý tiệm' : 'Đăng nhập chủ tiệm'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>

  );
}
