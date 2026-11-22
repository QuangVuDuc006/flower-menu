import { Layers, LockKeyhole } from 'lucide-react';
import type { AppScreen } from '../types/flower';
import { SHOP_INFO } from '../data/mockFlowers';
import { BotanicalEmblem, ZaloIcon } from './ui/Primitives';

interface CustomerHeaderProps {
  currentScreen: AppScreen;
  isAdminAuthenticated: boolean;
  onNavigate: (screen: AppScreen) => void;
  onOpenZalo: () => void;
}

export function CustomerHeader({
  currentScreen,
  isAdminAuthenticated,
  onNavigate,
  onOpenZalo,
}: CustomerHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-ivory/92 backdrop-blur-md border-b border-line/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[70px] flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="inline-flex items-center gap-2.5 py-1.5 pr-2 rounded-xl text-left group min-h-[44px]"
          aria-label="Tiệm Hoa — Về trang danh mục hoa"
        >
          <BotanicalEmblem className="w-8 h-8 text-forest transition-transform duration-300 group-hover:scale-105 shrink-0" />
          <div className="flex flex-col">
            <span className="font-serif text-2xl sm:text-[26px] font-semibold tracking-tight text-charcoal leading-none">
              {SHOP_INFO.name}
            </span>
            <span className="text-[11px] text-stone tracking-wide hidden sm:inline mt-0.5">
              Danh mục hoa tươi tại tiệm
            </span>
          </div>
        </button>

        {/* Minimal Navigation — Clean on Mobile, Balanced on Desktop */}
        <nav aria-label="Điều hướng chính" className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className={`hidden md:inline-flex items-center min-h-[44px] px-3.5 rounded-xl text-sm font-medium transition-colors ${
              currentScreen === 'catalog' || currentScreen === 'detail'
                ? 'text-forest bg-forest-soft/75'
                : 'text-stone hover:text-charcoal hover:bg-cream/70'
            }`}
          >
            Danh mục hoa
          </button>

          <button
            type="button"
            onClick={onOpenZalo}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 rounded-xl text-sm font-medium text-charcoal hover:bg-cream/80 transition-colors"
          >
            <ZaloIcon className="w-4 h-4 text-forest shrink-0" />
            <span className="hidden sm:inline">Tư vấn Zalo</span>
            <span className="sm:hidden">Zalo</span>
          </button>

          <span className="h-4 w-px bg-line mx-0.5 hidden sm:inline-block" aria-hidden="true" />

          <button
            type="button"
            onClick={() => onNavigate('design-system')}
            className={`hidden sm:inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-medium transition-colors ${
              currentScreen === 'design-system'
                ? 'bg-cream text-charcoal border border-line-strong'
                : 'text-stone hover:text-charcoal hover:bg-cream/70'
            }`}
            title="Xem Hệ thống thiết kế & Trạng thái tương tác"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hệ thống thiết kế</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(isAdminAuthenticated ? 'admin-dashboard' : 'admin-login')
            }
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-medium text-stone hover:text-charcoal hover:bg-cream/75 transition-colors"
          >
            <LockKeyhole className="w-3.5 h-3.5 text-sage shrink-0" />
            <span>{isAdminAuthenticated ? 'Quản lý' : 'Chủ tiệm'}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
