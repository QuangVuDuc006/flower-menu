import { useMemo, useState } from 'react';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  LogOut,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { AppScreen, FlowerProduct } from '../types/flower';
import { SHOP_INFO } from '../data/mockFlowers';
import { formatVND, normalizeVietnamese } from '../utils/format';
import {
  BotanicalEmblem,
  Button,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
} from './ui/Primitives';

type VisibilityFilter = 'all' | 'visible' | 'hidden';

interface AdminDashboardScreenProps {
  products: FlowerProduct[];
  bannerMessage: string | null;
  onDismissBanner: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: FlowerProduct) => void;
  onToggleVisibility: (productId: string) => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

export function AdminDashboardScreen({
  products,
  bannerMessage,
  onDismissBanner,
  onAddProduct,
  onEditProduct,
  onToggleVisibility,
  onNavigate,
  onLogout,
}: AdminDashboardScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VisibilityFilter>('all');

  const counts = useMemo(() => {
    const visible = products.filter((p) => p.isVisible).length;
    return {
      all: products.length,
      visible,
      hidden: products.length - visible,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeVietnamese(searchQuery);
    const compactQuery = normalizedQuery.replace(/[-\s]/g, '');

    return products.filter((item) => {
      if (statusFilter === 'visible' && !item.isVisible) return false;
      if (statusFilter === 'hidden' && item.isVisible) return false;
      if (!normalizedQuery) return true;

      const normName = normalizeVietnamese(item.name);
      const normCode = normalizeVietnamese(item.code);
      const compactCode = normCode.replace(/[-\s]/g, '');

      return (
        normName.includes(normalizedQuery) ||
        normCode.includes(normalizedQuery) ||
        compactCode.includes(compactQuery)
      );
    });
  }, [products, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-ivory pb-16">
      {/* Simple, Functional Admin Header */}
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BotanicalEmblem className="w-7 h-7 shrink-0" />
            <div className="truncate">
              <span className="font-serif text-xl sm:text-2xl font-semibold text-charcoal leading-none">
                Quản lý {SHOP_INFO.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onNavigate('design-system')}
              className="hidden md:inline-flex items-center gap-1.5 min-h-[42px] px-3 rounded-xl text-xs font-medium text-stone hover:text-charcoal hover:bg-cream transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hệ thống thiết kế</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-medium text-forest bg-forest-soft/75 hover:bg-forest-soft transition-colors"
            >
              <span>Xem menu khách</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Đăng xuất quản lý"
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-medium text-stone hover:text-charcoal hover:bg-cream transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Confirmation Banner After Save / Edit */}
        {bannerMessage && (
          <FeedbackBanner
            variant="success"
            title="Cập nhật danh mục thành công"
            message={bannerMessage}
            onDismiss={onDismissBanner}
          />
        )}

        {/* Top Title + Prominent "Thêm mẫu hoa" Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal">
              Danh sách mẫu hoa
            </h1>
            <p className="text-sm text-stone mt-1">
              Bật hiển thị cho các mẫu hoa đang có sẵn tại tiệm hoặc tạm ẩn khi hết hoa theo mùa.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onAddProduct}
              leftIcon={<Plus className="w-5 h-5" />}
              className="sm:w-auto"
            >
              Thêm mẫu hoa
            </Button>
          </div>
        </div>

        {/* Simple Filter Bar & Search */}
        <div className="rounded-2xl bg-paper border border-line p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Visibility Filter Tabs */}
          <div
            role="tablist"
            aria-label="Lọc theo trạng thái hiển thị"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            {(
              [
                { id: 'all', label: 'Tất cả', count: counts.all },
                { id: 'visible', label: 'Đang hiển thị', count: counts.visible },
                { id: 'hidden', label: 'Đang ẩn', count: counts.hidden },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-forest text-ivory'
                      : 'bg-cream/65 text-charcoal hover:bg-cream'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                      active ? 'bg-ivory/20 text-ivory' : 'bg-paper text-stone'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Admin Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên hoa hoặc mã..."
              aria-label="Tìm mẫu hoa trong danh sách quản lý"
              className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl bg-ivory border border-line-strong text-sm text-charcoal placeholder:text-muted focus:border-forest focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
                className="w-9 h-9 absolute right-1 top-1/2 -translate-y-1/2 rounded-lg inline-flex items-center justify-center text-stone hover:text-charcoal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product List — Mobile Cards & Clean Desktop Rows (No cramped mobile tables) */}
        {filteredProducts.length > 0 ? (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className={`rounded-2xl bg-paper border transition-colors p-4 sm:px-5 sm:py-4 ${
                  product.isVisible
                    ? 'border-line hover:border-sage/75'
                    : 'border-line bg-cream/35'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Thumbnail + Name + Code + Price */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="relative w-16 h-20 sm:w-[68px] sm:h-[84px] rounded-xl overflow-hidden bg-cream border border-line shrink-0">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-opacity ${
                          product.isVisible ? 'opacity-100' : 'opacity-55 grayscale-[25%]'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-cream border border-line text-xs font-semibold tracking-wider text-charcoal tabular-nums">
                          {product.code}
                        </span>
                        <span className="text-xs text-stone">
                          {product.primaryCategory}
                        </span>
                        <StatusBadge isVisible={product.isVisible} />
                      </div>

                      <h2 className="text-base sm:text-lg font-semibold text-charcoal leading-snug break-words">
                        {product.name}
                      </h2>

                      <div className="flex items-center gap-3">
                        <span className="text-[15px] sm:text-base font-semibold text-forest tabular-nums">
                          {formatVND(product.price)}
                        </span>
                        <span className="text-xs text-muted hidden sm:inline">
                          · Cập nhật: {product.updatedAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right / Bottom: Unmistakable Touch-Friendly Actions */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/80 shrink-0">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => onEditProduct(product)}
                      leftIcon={<Pencil className="w-4 h-4 text-stone" />}
                    >
                      Chỉnh sửa
                    </Button>
                    <Button
                      variant={product.isVisible ? 'secondary' : 'primary'}
                      size="md"
                      onClick={() => {
                        if (!product.isVisible || window.confirm('?n m?u hoa n?y kh?i menu kh?ch xem?')) onToggleVisibility(product.id);
                      }}
                      leftIcon={
                        product.isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )
                      }
                    >
                      {product.isVisible ? 'Ẩn mẫu' : 'Hiện mẫu'}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="flower"
            title="Không có mẫu hoa nào trong mục này"
            description="Bạn có thể xóa từ khóa tìm kiếm hoặc thêm một mẫu hoa mới vào danh mục của tiệm."
            actionLabel="Xem tất cả mẫu trong tiệm"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        )}
      </main>
    </div>
  );
}
