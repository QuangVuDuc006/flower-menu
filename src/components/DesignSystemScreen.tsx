import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Search,
} from 'lucide-react';
import type { AppScreen, FlowerProduct } from '../types/flower';
import {
  BotanicalEmblem,
  Button,
  CategoryChip,
  DialogModal,
  EmptyState,
  FeedbackBanner,
  InputField,
  ProductCard,
  ProductCardSkeleton,
  StatusBadge,
  ZaloIcon,
} from './ui/Primitives';

interface DesignSystemScreenProps {
  sampleProduct: FlowerProduct;
  onNavigate: (screen: AppScreen) => void;
  onOpenSampleDetail: () => void;
  onOpenAdminAdd: () => void;
}

const COLOR_TOKENS = [
  {
    name: 'Warm Ivory',
    hex: '#FAF8F4',
    role: 'Nền chính toàn trang',
    swatchClass: 'bg-ivory border-line-strong',
  },
  {
    name: 'Soft Cream',
    hex: '#F1EDE5',
    role: 'Bề mặt phụ, thẻ danh mục, vùng nhấn dịu',
    swatchClass: 'bg-cream border-line-strong',
  },
  {
    name: 'Warm Paper',
    hex: '#FDFCF9',
    role: 'Bề mặt thẻ sản phẩm, biểu mẫu, hộp thoại',
    swatchClass: 'bg-paper border-line-strong',
  },
  {
    name: 'Deep Forest Green',
    hex: '#355E4B',
    role: 'Nút hành động chính, giá bán, trạng thái chọn',
    swatchClass: 'bg-forest border-forest',
  },
  {
    name: 'Sage Green',
    hex: '#839B87',
    role: 'Chi tiết thực vật, viền tương tác nhẹ',
    swatchClass: 'bg-sage border-sage',
  },
  {
    name: 'Dusty Rose',
    hex: '#DCA5AD',
    role: 'Điểm nhấn trang trí tinh tế, nhãn phụ',
    swatchClass: 'bg-rose border-rose',
  },
  {
    name: 'Charcoal',
    hex: '#303631',
    role: 'Văn bản chính, tiêu đề độ tương phản cao',
    swatchClass: 'bg-charcoal border-charcoal',
  },
  {
    name: 'Warm Stone',
    hex: '#5F6761',
    role: 'Văn bản phụ, chú thích dễ đọc',
    swatchClass: 'bg-stone border-stone',
  },
];

export function DesignSystemScreen({
  sampleProduct,
  onNavigate,
  onOpenSampleDetail,
  onOpenAdminAdd,
}: DesignSystemScreenProps) {
  const [demoChip, setDemoChip] = useState<'Tất cả' | 'Hoa bó' | 'Hoa giỏ'>('Hoa bó');
  const [demoCopied, setDemoCopied] = useState(false);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-9 pb-12 space-y-12">
      {/* Header & Screen Directory */}
      <section className="pb-8 border-b border-line space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-xl text-sm font-medium text-charcoal hover:bg-cream transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-forest" />
            <span>Quay về danh mục khách xem</span>
          </button>
          <span className="px-3 py-1 rounded-full bg-cream border border-line text-xs font-medium text-stone">
            Modern Botanical Minimalism · UI System v1.0
          </span>
        </div>

        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 text-forest">
            <BotanicalEmblem className="w-7 h-7" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tiệm Hoa Design System & Flows
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-charcoal leading-tight">
            Hệ thống thiết kế & Các màn hình chính
          </h1>
          <p className="text-[15.5px] text-stone leading-relaxed">
            Bộ thành phần giao diện tái sử dụng được thiết kế thống nhất cho cả danh mục khách hàng (quét mã QR tại tiệm) và trang quản lý tối giản dành cho chủ tiệm.
          </p>
        </div>

        {/* Quick Prototype Screen Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {[
            {
              code: 'Screen A',
              title: 'Danh mục hoa',
              desc: 'Trang chủ khách xem',
              action: () => onNavigate('catalog'),
            },
            {
              code: 'Screen B',
              title: 'Chi tiết mẫu hoa',
              desc: 'Xem ảnh & sao chép mã',
              action: onOpenSampleDetail,
            },
            {
              code: 'Screen C',
              title: 'Quản lý tiệm',
              desc: 'Danh sách của chủ tiệm',
              action: () => onNavigate('admin-dashboard'),
            },
            {
              code: 'Screen D',
              title: 'Thêm / Sửa hoa',
              desc: 'Biểu mẫu tải ảnh & mã tự động',
              action: onOpenAdminAdd,
            },
            {
              code: 'Screen E',
              title: 'Đăng nhập chủ tiệm',
              desc: 'Xác thực tối giản',
              action: () => onNavigate('admin-login'),
            },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={item.action}
              className="text-left rounded-2xl bg-paper border border-line hover:border-forest p-4 transition-all group flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between text-xs text-forest font-semibold">
                <span>{item.code}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </div>
              <div>
                <p className="font-semibold text-charcoal text-sm">{item.title}</p>
                <p className="text-xs text-stone mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 1. Color Tokens */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
            1. Bảng màu (Color Tokens)
          </h2>
          <p className="text-sm text-stone mt-1">
            Tông màu tự nhiên lấy cảm hứng từ giấy gói kem ấm, lá khuynh diệp và cánh hồng khô, đảm bảo độ tương phản chữ dễ đọc cho mọi lứa tuổi.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {COLOR_TOKENS.map((token) => (
            <div
              key={token.hex}
              className="rounded-2xl bg-paper border border-line p-3.5 space-y-3"
            >
              <div className={`h-16 rounded-xl border ${token.swatchClass}`} />
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-charcoal">{token.name}</span>
                  <code className="text-xs text-stone">{token.hex}</code>
                </div>
                <p className="text-xs text-stone mt-1 leading-relaxed">{token.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Typography Scale */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
            2. Hệ thống chữ tiếng Việt (Typography Scale)
          </h2>
          <p className="text-sm text-stone mt-1">
            Kết hợp <strong>Cormorant Garamond</strong> cho tiêu đề chọn lọc và <strong>Be Vietnam Pro</strong> cho giao diện tiếng Việt rõ dấu, dễ đọc trên màn hình nhỏ.
          </p>
        </div>
        <div className="rounded-2xl bg-paper border border-line divide-y divide-line">
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs text-stone w-48 shrink-0">
              Display Serif · 42px / 1.16
            </span>
            <p className="font-serif text-3xl sm:text-[42px] font-semibold text-charcoal leading-[1.16] flex-1">
              Hoa đẹp cho những khoảnh khắc đặc biệt
            </p>
          </div>
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs text-stone w-48 shrink-0">
              Heading Serif · 30px / 1.2
            </span>
            <p className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal flex-1">
              Giỏ Hoa Bình Yên — Sắc Trắng Tinh Khôi
            </p>
          </div>
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs text-stone w-48 shrink-0">
              Card Title Sans · 16.5px / 500
            </span>
            <p className="text-[16.5px] font-medium text-charcoal flex-1">
              Hồng Dịu Dàng · Nắng Ban Mai · Mùa Yêu Thương
            </p>
          </div>
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs text-stone w-48 shrink-0">
              Price & Code · Tabular Nums
            </span>
            <p className="text-lg font-semibold text-forest tabular-nums flex-1">
              350.000đ · 550.000đ · Mã mẫu: BH-001 / HG-001
            </p>
          </div>
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <span className="text-xs text-stone w-48 shrink-0">
              Body UI · 15px / 1.6
            </span>
            <p className="text-[15px] text-stone leading-relaxed flex-1">
              Hãy đưa mã mẫu này cho nhân viên để được tư vấn và chuẩn bị bó hoa tươi ưng ý nhất.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Spacing, Border Radii & Responsive Layout Rules */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
          3. Khoảng cách, Bo góc & Quy tắc đáp ứng (Responsive Grid)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-paper border border-line p-5 space-y-2">
            <h3 className="text-sm font-semibold text-charcoal">Mobile (375px – 390px)</h3>
            <p className="text-xs text-stone leading-relaxed">
              Lưới danh mục <strong>2 cột</strong> (khoảng cách 14px), thanh danh mục cuộn ngang mượt, vùng chạm tối thiểu <strong>44×44px</strong>, giá và tên xếp dọc không bị cắt chữ.
            </p>
          </div>
          <div className="rounded-2xl bg-paper border border-line p-5 space-y-2">
            <h3 className="text-sm font-semibold text-charcoal">Tablet (768px)</h3>
            <p className="text-xs text-stone leading-relaxed">
              Lưới danh mục <strong>3 cột</strong> (khoảng cách 24px), thanh tìm kiếm và bộ lọc nằm cân đối, danh sách quản lý chuyển sang hàng ngang thoáng mắt.
            </p>
          </div>
          <div className="rounded-2xl bg-paper border border-line p-5 space-y-2">
            <h3 className="text-sm font-semibold text-charcoal">Desktop (1440px)</h3>
            <p className="text-xs text-stone leading-relaxed">
              Khung chuẩn <strong>1280px</strong> căn giữa, lưới <strong>4 cột</strong> (khoảng cách 28px), trang chi tiết chia 2 cột đối xứng với hộp mã mẫu cố định khi cuộn.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Buttons, Chips & Status Badges */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
          4. Nút bấm, Nhãn danh mục & Trạng thái hiển thị
        </h2>
        <div className="rounded-2xl bg-paper border border-line p-5 sm:p-6 space-y-6">
          <div className="space-y-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone block">
              Buttons & Interactive States (Chiều cao chạm ≥ 44px)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                leftIcon={demoCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={() => {
                  setDemoCopied(true);
                  window.setTimeout(() => setDemoCopied(false), 2000);
                }}
              >
                {demoCopied ? 'Đã sao chép mã BH-001' : 'Sao chép mã mẫu'}
              </Button>
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Thêm mẫu hoa
              </Button>
              <Button variant="secondary" leftIcon={<EyeOff className="w-4 h-4" />}>
                Ẩn mẫu
              </Button>
              <Button
                variant="outline"
                leftIcon={<ZaloIcon className="w-4 h-4 text-forest" />}
              >
                Liên hệ Zalo
              </Button>
              <Button variant="primary" isLoading>
                Đang lưu...
              </Button>
              <Button variant="primary" disabled>
                Tạm khóa
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone block">
                Category Chips
              </span>
              <div className="flex flex-wrap gap-2">
                {(['Tất cả', 'Hoa bó', 'Hoa giỏ'] as const).map((label) => (
                  <CategoryChip
                    key={label}
                    label={label}
                    active={demoChip === label}
                    count={label === 'Tất cả' ? 8 : 4}
                    onClick={() => setDemoChip(label)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone block">
                Visibility Status Indicators
              </span>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <StatusBadge isVisible={true} />
                <StatusBadge isVisible={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Inputs & Validation States */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
          5. Ô nhập liệu & Thông báo kiểm tra lỗi
        </h2>
        <div className="rounded-2xl bg-paper border border-line p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <InputField
            label="Ô tìm kiếm mặc định"
            placeholder="Tìm tên hoa hoặc mã mẫu..."
            leadingIcon={<Search className="w-4 h-4" />}
            readOnly
          />
          <InputField
            label="Mã mẫu tự động"
            hint="Tự động"
            value="BH-006"
            readOnly
            helperText="Tự động tạo theo danh mục Hoa bó."
          />
          <InputField
            label="Trạng thái báo lỗi thân thiện"
            value=""
            placeholder="Ví dụ: 350.000"
            readOnly
            error="Vui lòng nhập giá bán hợp lệ bằng VNĐ."
          />
        </div>
      </section>

      {/* 6. Product Card vs Image Loading State */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
          6. Thẻ sản phẩm & Trạng thái tải ảnh (Cards & Loading)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs font-medium text-stone mb-2">Thẻ hoàn chỉnh (Interactive)</p>
            <ProductCard
              product={sampleProduct}
              onSelect={onOpenSampleDetail}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-stone mb-2">Trạng thái đang tải ảnh (Skeleton)</p>
            <ProductCardSkeleton />
          </div>
          <div className="col-span-2 flex flex-col justify-between rounded-2xl bg-paper border border-line p-5 space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone">
                Trạng thái phản hồi lưu dữ liệu & Hộp thoại
              </p>
              <FeedbackBanner
                variant="success"
                title="Đã lưu mẫu hoa thành công"
                message="Mẫu hoa Hồng Dịu Dàng (BH-001) đã được hiển thị trên danh mục khách xem."
              />
              <FeedbackBanner
                variant="error"
                title="Không thể lưu thay đổi"
                message="Vui lòng tải lên ít nhất 1 ảnh chụp mẫu hoa trước khi lưu."
              />
            </div>
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-line">
              <span className="text-xs text-stone">Kiểm thử hộp thoại xác nhận:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDemoDialogOpen(true)}
                leftIcon={<Eye className="w-4 h-4 text-forest" />}
              >
                Mở hộp thoại mẫu
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Empty Search Result State */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal">
          7. Trạng thái tìm kiếm trống (Empty State)
        </h2>
        <EmptyState
          icon="search"
          title="Không tìm thấy mẫu hoa phù hợp"
          description="Thử tìm bằng tên hoa khác (như Hồng, Hướng dương) hoặc xóa bộ lọc để xem toàn bộ danh mục của tiệm."
          actionLabel="Xem tất cả mẫu hoa"
          onAction={() => onNavigate('catalog')}
        />
      </section>

      <DialogModal
        open={demoDialogOpen}
        onClose={() => setDemoDialogOpen(false)}
        title="Xác nhận ẩn mẫu hoa?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone leading-relaxed">
            Khi tạm ẩn, khách hàng quét mã QR tại tiệm sẽ không nhìn thấy mẫu hoa này cho đến khi bạn bật hiển thị trở lại.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => setDemoDialogOpen(false)}>
              Giữ hiển thị
            </Button>
            <Button variant="primary" onClick={() => setDemoDialogOpen(false)}>
              Đồng ý tạm ẩn
            </Button>
          </div>
        </div>
      </DialogModal>
    </main>
  );
}
