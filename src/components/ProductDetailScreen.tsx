import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Flower2, MessageCircleHeart, Sparkles } from 'lucide-react';
import type { FlowerProduct } from '../types/flower';
import { copyTextToClipboard, formatVND } from '../utils/format';
import { Button, FlowerImage, ProductCard, ZaloIcon } from './ui/Primitives';

interface ProductDetailScreenProps {
  product: FlowerProduct;
  allProducts: FlowerProduct[];
  onBack: () => void;
  onSelectProduct: (product: FlowerProduct) => void;
  onCopiedCode: (code: string) => void;
  onOpenZalo: () => void;
}

export function ProductDetailScreen({
  product,
  allProducts,
  onBack,
  onSelectProduct,
  onCopiedCode,
  onOpenZalo,
}: ProductDetailScreenProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    setActiveImageIndex(0);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  const handleCopyCode = async () => {
    setCopyError('');
    if (!(await copyTextToClipboard(product.code))) {
      setCopyError('Chưa sao chép được. Bạn có thể chọn mã mẫu và sao chép thủ công.');
      return;
    }
    setCopied(true);
    onCopiedCode(product.code);
    window.setTimeout(() => setCopied(false), 3000);
  };

  const relatedProducts = allProducts
    .filter((item) => item.isVisible && item.id !== product.id)
    .sort((a, b) => {
      const aSame = a.primaryCategory === product.primaryCategory ? 0 : 1;
      const bSame = b.primaryCategory === product.primaryCategory ? 0 : 1;
      return aSame - bSame;
    })
    .slice(0, 4);

  const activeImage = product.images[activeImageIndex] || product.images[0];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-7">
      {/* Intuitive Back Navigation */}
      <div className="mb-4 sm:mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 min-h-[44px] px-3.5 -ml-2 rounded-xl text-sm font-medium text-charcoal hover:bg-cream transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-forest" />
          <span>Quay lại danh mục</span>
        </button>
      </div>

      {/* Main Product Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-12 items-start">
        {/* Left Column: Flower Photography Gallery */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="rounded-2xl overflow-hidden bg-paper border border-line p-2 sm:p-3 shadow-[0_12px_34px_-16px_rgba(48,54,49,0.12)]">
            <div className="rounded-xl overflow-hidden">
              <FlowerImage
                src={activeImage}
                alt={`${product.name} — Mã ${product.code}`}
                className="aspect-[4/5] w-full"
              />
            </div>
          </div>

          {/* Optional Additional Photographs */}
          {product.images.length > 1 && (
            <div
              role="group"
              aria-label="Ảnh chi tiết mẫu hoa"
              className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5"
            >
              {product.images.map((imgUrl, idx) => {
                const isSelected = idx === activeImageIndex;
                return (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`Xem ảnh ${idx + 1} của ${product.name}`}
                    aria-pressed={isSelected}
                    className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      isSelected
                        ? 'border-forest ring-2 ring-forest/20'
                        : 'border-line opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Product Information & Staff Consultation Code */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-6">
          {/* Category Badges & Code */}
          <div className="space-y-3 border-b border-line pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {product.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 rounded-full bg-cream border border-line text-xs font-medium text-charcoal"
                >
                  {cat}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-semibold text-charcoal leading-[1.15]">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-baseline justify-between gap-4 pt-1">
              <div>
                <span className="text-2xl sm:text-3xl font-semibold text-forest tabular-nums">
                  {formatVND(product.price)}
                </span>
                <span className="block text-xs text-stone mt-1">
                  Giá minh họa · Dữ liệu DEMO
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-paper border border-line-strong text-xs font-medium text-stone">
                Mã mẫu:{' '}
                <strong className="text-charcoal font-semibold tracking-wider tabular-nums">
                  {product.code}
                </strong>
              </div>
            </div>
          </div>

          {/* Description & Floral Notes */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone mb-2">
                Giới thiệu mẫu hoa
              </h2>
              <p className="text-[15.5px] text-charcoal/90 leading-relaxed">
                {product.description ||
                  'Mẫu hoa tươi được thiết kế thủ công tại tiệm với hoa nhập mới trong ngày. Quý khách có thể trao đổi thêm với nhân viên để điều chỉnh màu giấy gói theo ý thích.'}
              </p>
            </div>

            {product.stemsNote && (
              <div className="rounded-xl bg-cream/65 border border-line px-4 py-3.5 flex items-start gap-3">
                <Flower2 className="w-4.5 h-4.5 text-forest shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium text-charcoal">Hoa & phụ kiện chính: </span>
                  <span className="text-stone">{product.stemsNote}</span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Card: Show / Copy Code for Shop Staff */}
          <div className="rounded-2xl bg-paper border border-line-strong p-5 sm:p-6 space-y-4 shadow-[0_8px_24px_-12px_rgba(48,54,49,0.1)]">
            <div className="flex items-center justify-between gap-3 bg-cream/75 rounded-xl px-4 py-3.5 border border-line">
              <div>
                <span className="text-xs text-stone block">Mã mẫu hoa của bạn</span>
                <span className="text-2xl sm:text-[26px] font-bold tracking-wider text-charcoal tabular-nums">
                  {product.code}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-soft border border-rose/45 text-xs font-medium text-charcoal">
                <Sparkles className="w-3.5 h-3.5 text-rose-deep" />
                Đưa nhân viên xem
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleCopyCode}
              leftIcon={
                copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-4.5 h-4.5" />
                )
              }
            >
              {copied ? `Đã sao chép mã ${product.code}` : 'Sao chép mã mẫu'}
            </Button>

            {copyError && <p role="alert" className="text-sm text-charcoal">{copyError}</p>}

            <div className="flex items-start gap-2.5 pt-0.5 text-sm text-stone leading-relaxed">
              <MessageCircleHeart className="w-4.5 h-4.5 text-forest shrink-0 mt-0.5" />
              <p>
                <strong className="font-medium text-charcoal">
                  Hãy đưa mã mẫu này cho nhân viên để được tư vấn.
                </strong>{' '}
                Bạn cũng có thể sao chép mã để gửi nhanh qua Zalo của tiệm.
              </p>
            </div>

            <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <span className="text-stone">Cần hỏi trước khi ghé tiệm?</span>
              <button
                type="button"
                onClick={onOpenZalo}
                className="min-h-[40px] px-3 rounded-lg inline-flex items-center gap-1.5 font-medium text-forest hover:bg-forest-soft/75 transition-colors"
              >
                <ZaloIcon className="w-4 h-4" />
                <span>Liên hệ Zalo · Mã {product.code}</span>
              </button>
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="secondary"
              size="md"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Quay lại xem các mẫu khác
            </Button>
          </div>
        </div>
      </div>

      {/* Related Flower Suggestions */}
      {relatedProducts.length > 0 && (
        <section
          aria-labelledby="related-flowers-heading"
          className="mt-14 sm:mt-20 pt-10 border-t border-line"
        >
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <h2
              id="related-flowers-heading"
              className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal"
            >
              Các mẫu hoa tương tự
            </h2>
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-2 text-sm font-medium text-forest hover:underline"
            >
              Xem toàn bộ
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-7">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
