import { useMemo } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import type { FilterCategory, FlowerProduct } from '../types/flower';
import { FILTER_CATEGORIES } from '../data/mockFlowers';
import { normalizeVietnamese } from '../utils/format';
import { CategoryChip, EmptyState, ProductCard } from './ui/Primitives';

interface CatalogScreenProps {
  products: FlowerProduct[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: FilterCategory;
  onCategoryChange: (cat: FilterCategory) => void;
  onSelectProduct: (product: FlowerProduct) => void;
}

export function CatalogScreen({
  products,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onSelectProduct,
}: CatalogScreenProps) {
  // Customers only see visible arrangements
  const visibleProducts = useMemo(
    () => products.filter((item) => item.isVisible),
    [products]
  );

  // Category counts for helpful context
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tất cả': visibleProducts.length };
    for (const cat of FILTER_CATEGORIES) {
      if (cat !== 'Tất cả') {
        counts[cat] = visibleProducts.filter(
          (p) => p.primaryCategory === cat || p.categories.includes(cat)
        ).length;
      }
    }
    return counts;
  }, [visibleProducts]);

  // Filter by category and diacritic-tolerant search query (name or code)
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeVietnamese(searchQuery);
    const compactQuery = normalizedQuery.replace(/[-\s]/g, '');

    return visibleProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === 'Tất cả' ||
        product.primaryCategory === selectedCategory ||
        product.categories.includes(selectedCategory);

      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const normalizedName = normalizeVietnamese(product.name);
      const normalizedCode = normalizeVietnamese(product.code);
      const compactCode = normalizedCode.replace(/[-\s]/g, '');
      const normalizedCategory = normalizeVietnamese(product.categories.join(' '));

      return (
        normalizedName.includes(normalizedQuery) ||
        normalizedCode.includes(normalizedQuery) ||
        compactCode.includes(compactQuery) ||
        normalizedCategory.includes(normalizedQuery)
      );
    });
  }, [visibleProducts, selectedCategory, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== 'Tất cả';

  const handleResetFilters = () => {
    onSearchChange('');
    onCategoryChange('Tất cả');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8">
      {/* Subtle, Compact Welcome Section — Keeps catalog immediately accessible */}
      <section
        aria-labelledby="welcome-heading"
        className="pb-5 sm:pb-7 border-b border-line/80 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
      >
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-forest mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sage" />
            <span>Menu hoa tươi tại quầy · DEMO</span>
          </p>
          <h1
            id="welcome-heading"
            className="font-serif text-[28px] sm:text-4xl lg:text-[42px] font-semibold text-charcoal leading-[1.16] tracking-tight"
          >
            Hoa đẹp cho những khoảnh khắc đặc biệt
          </h1>
          <p className="mt-2 text-sm sm:text-[15.5px] text-stone leading-relaxed">
            Mời bạn xem các mẫu hoa hiện có tại tiệm. Khi chọn được mẫu ưng ý, bạn chỉ cần đưa{' '}
            <span className="text-charcoal font-medium">mã mẫu</span> cho nhân viên để được chuẩn bị chu đáo.
          </p>
        </div>

        {/* Quiet Editorial Note on Desktop */}
        <div className="hidden lg:flex items-center gap-3.5 rounded-2xl bg-cream/70 border border-line px-4 py-3 max-w-xs shrink-0">
          <img
            src="/flowers/placeholder.png"
            alt=""
            aria-hidden="true"
            className="w-12 h-14 rounded-lg object-cover border border-line shrink-0"
          />
          <div className="text-xs leading-relaxed text-stone">
            <p className="font-medium text-charcoal">Hoa tươi mới mỗi sáng</p>
            <p className="mt-0.5">
              Có thể điều chỉnh màu giấy gói và thiệp viết tay miễn phí tại quầy.
            </p>
          </div>
        </div>
      </section>

      {/* Product Discovery: Search + Responsive Category Chips */}
      <section aria-label="Tìm kiếm và lọc mẫu hoa" className="pt-5 sm:pt-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3.5">
          {/* Prominent Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search
              className="w-4.5 h-4.5 text-stone absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tên hoa hoặc mã mẫu..."
              aria-label="Tìm tên hoa hoặc mã mẫu"
              className="w-full min-h-[48px] pl-11 pr-11 py-2.5 rounded-2xl bg-paper border border-line-strong text-[15px] text-charcoal placeholder:text-muted hover:border-sage focus:border-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/20 transition-colors"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="w-11 h-11 absolute right-1 top-1/2 -translate-y-1/2 rounded-xl inline-flex items-center justify-center text-stone hover:text-charcoal hover:bg-cream/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Result Count Summary */}
          <div className="flex items-center justify-between md:justify-end gap-3 text-xs sm:text-sm text-stone md:ml-auto">
            <span aria-live="polite">
              Đang hiển thị{' '}
              <strong className="font-semibold text-charcoal tabular-nums">
                {filteredProducts.length}
              </strong>{' '}
              mẫu hoa
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[36px] px-2.5 rounded-lg text-forest font-medium hover:bg-forest-soft/70 transition-colors"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Horizontally Scrollable Category Chips on Mobile, Well-Spaced on Desktop */}
        <div
          role="region"
          aria-label="Danh mục hoa"
          className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-1 sm:mx-0 sm:px-0 sm:flex-wrap"
        >
          {FILTER_CATEGORIES.map((category) => (
            <CategoryChip
              key={category}
              label={category}
              active={selectedCategory === category}
              count={categoryCounts[category]}
              onClick={() => onCategoryChange(category)}
            />
          ))}
        </div>
      </section>

      {/* Flower Catalog Grid */}
      <section aria-label="Danh sách mẫu hoa" className="pt-5 sm:pt-7">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-7">
            {filteredProducts.map((flower) => (
              <ProductCard
                key={flower.id}
                product={flower}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              icon="search"
              title="Không tìm thấy mẫu hoa phù hợp"
              description={
                searchQuery.trim()
                  ? `Chưa có mẫu hoa nào khớp với "${searchQuery.trim()}". Bạn có thể thử tìm theo tên khác (như Hồng, Hướng dương) hoặc nhập mã mẫu (như BH-001).`
                  : 'Hiện chưa có mẫu hoa nào trong danh mục này. Mời bạn xem các danh mục khác của tiệm.'
              }
              actionLabel="Xem tất cả mẫu hoa"
              onAction={handleResetFilters}
            />
          </div>
        )}
      </section>
    </main>
  );
}
