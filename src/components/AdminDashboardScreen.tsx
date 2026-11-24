import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Plus,
  Star,
  X,
} from 'lucide-react';
import type { AppScreen, FlowerProduct } from '../types/flower';

import { formatVND, normalizeVietnamese } from '../utils/format';
import {
  FlowerImage,
  Button,
  DialogModal,
  EmptyState,
  FeedbackBanner,
} from './ui/Primitives';

type VisibilityFilter = 'all' | 'visible' | 'hidden';

interface AdminDashboardScreenProps {
  products: FlowerProduct[];
  bannerMessage: string | null;
  onDismissBanner: () => void;
  onAddProduct?: () => void;
  busy?: boolean;
  onEditProduct: (product: FlowerProduct) => void;
  onToggleVisibility: (productId: string) => void;
  onToggleFeatured?: (productId: string) => void;
  onMoveOrder?: (productId: string, direction: 'up' | 'down') => void;
  activeTab?: 'products' | 'categories' | 'settings';
  onSelectTab?: (tab: 'products' | 'categories' | 'settings') => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

export function AdminDashboardScreen({
  products,
  bannerMessage,
  onDismissBanner,
  onAddProduct,
  busy = false,
  onEditProduct,
  onToggleVisibility,
  onToggleFeatured,
  onMoveOrder,
  activeTab = 'products',
  onSelectTab,
  onNavigate,
  onLogout,
}: AdminDashboardScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VisibilityFilter>('all');
  const [hidingProduct, setHidingProduct] = useState<FlowerProduct | null>(null);

  // B4 F17: Collapsible 3-step guide with localStorage persistence
  const [guideCollapsed, setGuideCollapsed] = useState(() => {
    try {
      return localStorage.getItem('flower-admin-guide-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleGuide = () => {
    setGuideCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('flower-admin-guide-collapsed', String(next));
      } catch {
        // ignore quota / storage errors
      }
      return next;
    });
  };

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
      {/* Admin Header with Navigation and Tabs */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-2 px-4 py-3.5 md:px-8">
          <span className="font-serif text-[19px] font-semibold md:text-2xl">Tiệm Hoa · Quản trị</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="min-h-11 rounded-xl border border-line px-3 text-xs font-medium text-forest hover:bg-cream transition-colors"
            >
              Xem menu khách
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Đăng xuất quản lý"
              className="min-h-11 rounded-xl border border-line px-3 text-xs font-medium text-forest hover:bg-cream transition-colors"
            >
              <span className="md:hidden">Thoát</span>
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        {onSelectTab && (
          <div className="mx-auto flex max-w-[1120px] gap-2 px-4 pb-2.5 md:px-8 overflow-x-auto">
            <button
              type="button"
              aria-current={activeTab === 'products' ? 'page' : undefined}
              onClick={() => onSelectTab('products')}
              className={`min-h-11 rounded-xl px-4 text-xs font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-forest text-ivory'
                  : 'bg-paper text-forest border border-line hover:bg-cream'
              }`}
            >
              Mẫu hoa
            </button>
            <button
              type="button"
              aria-current={activeTab === 'categories' ? 'page' : undefined}
              onClick={() => onSelectTab('categories')}
              className={`min-h-11 rounded-xl px-4 text-xs font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'bg-forest text-ivory'
                  : 'bg-paper text-forest border border-line hover:bg-cream'
              }`}
            >
              Danh mục
            </button>
            <button
              type="button"
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              onClick={() => onSelectTab('settings')}
              className={`min-h-11 rounded-xl px-4 text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-forest text-ivory'
                  : 'bg-paper text-forest border border-line hover:bg-cream'
              }`}
            >
              Cài đặt tiệm
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1120px] space-y-5 px-4 pt-5 md:px-8 md:pt-8">
        {bannerMessage && (
          <FeedbackBanner
            variant="success"
            title="Cập nhật danh mục thành công"
            message={bannerMessage}
            onDismiss={onDismissBanner}
          />
        )}

        {/* Collapsible 3-step owner guide (B4 F17) */}
        <section className="rounded-2xl border border-line bg-cream/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleGuide}
              aria-expanded={!guideCollapsed}
              className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal hover:text-forest transition-colors text-left"
            >
              <HelpCircle className="size-4 text-forest shrink-0" />
              <span>Hướng dẫn nhanh (3 bước)</span>
              {guideCollapsed ? (
                <ChevronDown className="size-4 text-stone" />
              ) : (
                <ChevronUp className="size-4 text-stone" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleGuide}
              className="text-xs text-stone hover:text-charcoal p-1"
            >
              {guideCollapsed ? 'Xem chi tiết' : 'Thu gọn'}
            </button>
          </div>

          {!guideCollapsed && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3 pt-3 border-t border-line/60 text-xs text-stone leading-relaxed">
              <div className="rounded-xl bg-paper p-3 border border-line/50">
                <p className="font-semibold text-charcoal text-[13px] mb-1">1. Thêm mẫu & chụp ảnh</p>
                <p>Bấm nút <strong>"Thêm mẫu hoa"</strong>, tải ảnh chụp bó hoa trực tiếp từ điện thoại.</p>
              </div>
              <div className="rounded-xl bg-paper p-3 border border-line/50">
                <p className="font-semibold text-charcoal text-[13px] mb-1">2. Đặt giá & danh mục</p>
                <p>Nhập giá bán và chọn danh mục chính (Hoa bó, Giỏ hoa, v.v.) để khách dễ tìm.</p>
              </div>
              <div className="rounded-xl bg-paper p-3 border border-line/50">
                <p className="font-semibold text-charcoal text-[13px] mb-1">3. Bật hiển thị tức thì</p>
                <p>Bật <strong>"Đang hiện"</strong> để khách quét mã QR tại tiệm nhìn thấy mẫu ngay.</p>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="font-serif text-[34px] font-semibold leading-tight md:text-[44px]">Danh sách mẫu hoa</h1>
          {onAddProduct && (
            <Button
              disabled={busy}
              onClick={onAddProduct}
              leftIcon={<Plus className="size-4" />}
              className="w-full text-xs md:w-auto"
            >
              Thêm mẫu hoa
            </Button>
          )}
        </div>

        {/* Filters and search */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3 md:flex-row md:items-center">
          <div role="group" aria-label="Lọc theo trạng thái hiển thị" className="flex shrink-0 gap-1.5">
            {([
              { id: 'all', label: 'Tất cả' },
              { id: 'visible', label: 'Đang hiện' },
              { id: 'hidden', label: 'Đã ẩn' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={
                  'min-h-11 rounded-xl border px-3 text-xs font-medium text-forest transition-colors ' +
                  (statusFilter === tab.id
                    ? 'border-transparent bg-forest-soft'
                    : 'border-line bg-paper hover:bg-cream')
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tên hoa hoặc mã mẫu…"
              aria-label="Tìm mẫu hoa trong danh sách quản lý"
              className="min-h-11 w-full rounded-xl border border-line bg-white px-3 pr-11 text-[13px] focus:outline-none focus:border-forest"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-0 top-0 flex size-11 items-center justify-center text-stone hover:text-charcoal"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {filteredProducts.length ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <div className="hidden grid-cols-[40fr_15fr_15fr_30fr] gap-4 bg-cream px-4 py-4 text-xs font-medium text-stone md:grid">
              <span>Mẫu hoa</span>
              <span>Giá bán</span>
              <span>Trạng thái</span>
              <span className="text-right">Thao tác</span>
            </div>
            {filteredProducts.map((product, idx) => (
              <article
                key={product.id}
                className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-3 p-3.5 border-b border-line last:border-b-0 md:grid-cols-[40fr_15fr_15fr_30fr] md:gap-4 md:px-4 hover:bg-cream/30 transition-colors"
              >
                <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                  {onMoveOrder && (
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        aria-label={`Chuyển lên: ${product.name}`}
                        disabled={busy || idx === 0}
                        onClick={() => onMoveOrder(product.id, 'up')}
                        className="size-6 rounded border border-line flex items-center justify-center text-forest hover:bg-cream disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Chuyển xuống: ${product.name}`}
                        disabled={busy || idx === filteredProducts.length - 1}
                        onClick={() => onMoveOrder(product.id, 'down')}
                        className="size-6 rounded border border-line flex items-center justify-center text-forest hover:bg-cream disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                  )}

                  <FlowerImage
                    src={product.images[0]}
                    alt={product.name}
                    className="size-12 shrink-0 rounded-[10px]"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="break-words text-sm font-medium">{product.name}</h2>
                      {product.isFeatured && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold inline-flex items-center gap-0.5">
                          <Star className="size-2.5 fill-amber-500 text-amber-500" />
                          Nổi bật
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone">
                      {product.code} · {product.primaryCategory}
                    </p>
                  </div>
                </div>

                <span className="text-[13px] font-medium tabular-nums">{formatVND(product.price)}</span>

                <div className="flex items-center gap-2 md:contents">
                  <span
                    className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-medium ${
                      product.isVisible ? 'bg-forest-soft text-forest' : 'bg-cream text-stone'
                    }`}
                  >
                    {product.isVisible ? 'Đang hiện' : 'Đã ẩn'}
                  </span>

                  <div className="flex items-center gap-1.5 md:justify-end">
                    {onToggleFeatured && (
                      <button
                        type="button"
                        aria-label={product.isFeatured ? `Bỏ nổi bật ${product.name}` : `Đánh dấu nổi bật ${product.name}`}
                        disabled={busy}
                        onClick={() => onToggleFeatured(product.id)}
                        className={`min-h-11 rounded-xl border px-2.5 text-xs inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
                          product.isFeatured
                            ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'border-line text-stone hover:bg-cream hover:text-charcoal'
                        }`}
                        title={product.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                      >
                        <Star
                          className={`size-3.5 ${
                            product.isFeatured ? 'fill-amber-500 text-amber-500' : 'text-stone'
                          }`}
                        />
                        <span className="hidden lg:inline text-[11px]">
                          {product.isFeatured ? 'Nổi bật' : 'Thường'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label={`Chỉnh sửa ${product.name}`}
                      disabled={busy}
                      onClick={() => onEditProduct(product)}
                      className="min-h-11 rounded-xl border border-line px-3 text-xs text-forest hover:bg-cream disabled:opacity-50"
                    >
                      Sửa
                    </button>

                    <button
                      type="button"
                      aria-label={product.isVisible ? `Ẩn mẫu ${product.name}` : `Hiện mẫu ${product.name}`}
                      disabled={busy}
                      onClick={() => {
                        if (product.isVisible) {
                          setHidingProduct(product);
                        } else {
                          onToggleVisibility(product.id);
                        }
                      }}
                      className="min-h-11 rounded-xl border border-line px-3 text-xs text-forest hover:bg-cream disabled:opacity-50"
                    >
                      {product.isVisible ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="flower"
            title="Không có mẫu hoa nào trong mục này"
            description="Bạn có thể xóa từ khóa tìm kiếm hoặc thêm một mẫu hoa mới."
            actionLabel="Xem tất cả mẫu trong tiệm"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        )}
      </main>

      {/* Accessible Hide Product Confirmation Dialog (A5) */}
      <DialogModal
        open={Boolean(hidingProduct)}
        onClose={() => setHidingProduct(null)}
        title="Ẩn mẫu hoa này?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone leading-relaxed">
            Mẫu hoa <strong className="text-charcoal font-semibold">"{hidingProduct?.name}"</strong> ({hidingProduct?.code}) sẽ tạm thời không hiển thị cho khách xem khi quét mã QR tại quầy. Bạn có thể bật hiển thị lại bất kỳ lúc nào.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setHidingProduct(null)}
            >
              Giữ hiển thị
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-danger text-ivory border-danger hover:bg-danger/90"
              onClick={() => {
                if (hidingProduct) {
                  onToggleVisibility(hidingProduct.id);
                  setHidingProduct(null);
                }
              }}
            >
              Ẩn mẫu hoa
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
