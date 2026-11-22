import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { FlowerProduct, ProductCategory } from '../types/flower';
import {
  PRODUCT_CATEGORIES,
  SAMPLE_GALLERY_CHOICES,
} from '../data/mockFlowers';
import { formatVND, generateProductCode } from '../utils/format';
import {
  BotanicalEmblem,
  Button,
  DialogModal,
  FeedbackBanner,
  InputField,
  TextareaField,
} from './ui/Primitives';

interface AdminFlowerFormScreenProps {
  editingProduct: FlowerProduct | null;
  existingProducts: FlowerProduct[];
  onSave: (data: Omit<FlowerProduct, 'id' | 'updatedAt'>, existingId?: string) => void;
  onCancel: () => void;
}

const QUICK_PRICES = [290000, 350000, 450000, 550000, 650000];

export function AdminFlowerFormScreen({
  editingProduct,
  existingProducts,
  onSave,
  onCancel,
}: AdminFlowerFormScreenProps) {
  const isEditMode = Boolean(editingProduct);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(editingProduct?.name ?? '');
  const [primaryCategory, setPrimaryCategory] = useState<ProductCategory>(
    editingProduct?.primaryCategory ?? 'Hoa bó'
  );
  const [extraCategories, setExtraCategories] = useState<ProductCategory[]>(
    editingProduct
      ? editingProduct.categories.filter((c) => c !== editingProduct.primaryCategory)
      : []
  );
  const [priceDigits, setPriceDigits] = useState<string>(
    editingProduct ? String(editingProduct.price) : ''
  );
  const [description, setDescription] = useState(editingProduct?.description ?? '');
  const [stemsNote, setStemsNote] = useState(editingProduct?.stemsNote ?? '');
  const [images, setImages] = useState<string[]>(editingProduct?.images ?? []);
  const [isVisible, setIsVisible] = useState<boolean>(
    editingProduct ? editingProduct.isVisible : true
  );

  const [showSamplePicker, setShowSamplePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [errors, setErrors] = useState<{
    images?: string;
    name?: string;
    price?: string;
  }>({});

  // Automatically generate code for new flowers based on selected primary category
  const productCode = useMemo(() => {
    if (editingProduct) return editingProduct.code;
    return generateProductCode(primaryCategory, existingProducts);
  }, [editingProduct, primaryCategory, existingProducts]);

  const numericPrice = useMemo(() => {
    const parsed = parseInt(priceDigits.replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [priceDigits]);

  const formattedInputPrice = useMemo(() => {
    const clean = priceDigits.replace(/\D/g, '');
    if (!clean) return '';
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }, [priceDigits]);

  const hasDirtyChanges = useMemo(() => {
    if (!editingProduct) {
      return Boolean(name.trim() || priceDigits || description.trim() || images.length > 0);
    }
    return (
      name !== editingProduct.name ||
      stemsNote !== (editingProduct.stemsNote ?? '') ||
      extraCategories.join('|') !== editingProduct.categories.filter((c) => c !== editingProduct.primaryCategory).join('|') ||
      primaryCategory !== editingProduct.primaryCategory ||
      numericPrice !== editingProduct.price ||
      description !== editingProduct.description ||
      isVisible !== editingProduct.isVisible ||
      images.join('|') !== editingProduct.images.join('|')
    );
  }, [
    editingProduct,
    name,
    primaryCategory,
    numericPrice,
    description,
    isVisible,
    images,
    priceDigits,
    stemsNote,
    extraCategories,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, images: 'Ch?n ?nh JPG, PNG ho?c WebP c? dung l??ng t?i ?a 5 MB.' }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const url = reader.result;
          const image = new Image();
          image.onload = () => {
            setImages((prev) => [...prev, url]);
            setErrors((prev) => ({ ...prev, images: undefined }));
          };
          image.onerror = () => setErrors((prev) => ({ ...prev, images: 'Kh?ng ??c ???c ?nh. Vui l?ng ch?n ?nh kh?c.' }));
          image.src = url;
        }
      };
      reader.onerror = () => setErrors((prev) => ({ ...prev, images: 'Kh?ng ??c ???c t?p ?nh. Vui l?ng th? l?i.' }));
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleAddSampleImage = (url: string) => {
    if (!images.includes(url)) {
      setImages((prev) => [...prev, url]);
    }
    setErrors((prev) => ({ ...prev, images: undefined }));
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMakePrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      copy.unshift(picked);
      return copy;
    });
  };

  const toggleExtraCategory = (cat: ProductCategory) => {
    if (cat === primaryCategory) return;
    setExtraCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleRequestCancel = () => {
    if (hasDirtyChanges) {
      setConfirmCancelOpen(true);
    } else {
      onCancel();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const nextErrors: { images?: string; name?: string; price?: string } = {};

    if (images.length === 0) {
      nextErrors.images = 'Vui lòng tải lên ít nhất 1 ảnh chụp mẫu hoa.';
    }
    if (name.trim().length < 2 || name.trim().length > 100) {
      nextErrors.name = 'Vui lòng nhập tên mẫu hoa (ví dụ: Hồng Dịu Dàng).';
    }
    if (!Number.isSafeInteger(numericPrice) || numericPrice <= 0) {
      nextErrors.price = 'Vui lòng nhập giá bán hợp lệ bằng VNĐ (ví dụ: 350.000).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setIsSaving(true);

    const allCategories: ProductCategory[] = [
      primaryCategory,
      ...extraCategories.filter((c) => c !== primaryCategory),
    ];

    window.setTimeout(() => {
      setIsSaving(false);
      onSave(
        {
          code: productCode,
          name: name.trim(),
          price: numericPrice,
          primaryCategory,
          categories: allCategories,
          images,
          description: description.trim(),
          stemsNote: stemsNote.trim() || undefined,
          isVisible,
        },
        editingProduct?.id
      );
    }, 320);
  };

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <div className="min-h-screen bg-ivory pb-20">
      {/* Simple Reassuring Header */}
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRequestCancel}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-xl text-sm font-medium text-charcoal hover:bg-cream transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-forest" />
            <span>Quay lại danh sách</span>
          </button>
          <div className="inline-flex items-center gap-2 text-xs text-stone">
            <BotanicalEmblem className="w-5 h-5" />
            <span>{isEditMode ? 'Chỉnh sửa mẫu hoa' : 'Thêm mẫu mới'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal">
            {isEditMode ? 'Chỉnh sửa mẫu hoa' : 'Thêm mẫu hoa mới'}
          </h1>
          <p className="text-sm text-stone mt-1.5 leading-relaxed">
            Điền các thông tin cơ bản bên dưới. Sau khi lưu, mẫu hoa sẽ được cập nhật ngay trên menu quét mã QR tại tiệm.
          </p>
        </div>

        {hasAnyError && (
          <div className="mb-6">
            <FeedbackBanner
              variant="error"
              title="Chưa thể lưu mẫu hoa"
              message="Bạn vui lòng kiểm tra lại các mục được đánh dấu màu đỏ bên dưới."
            />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Section 1: Upload Flower Images */}
          <section className="rounded-2xl bg-paper border border-line p-5 sm:p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-charcoal">
                1. Ảnh chụp mẫu hoa <span className="text-danger">*</span>
              </h2>
              <span className="text-xs text-stone">{images.length} ảnh đã chọn</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="sr-only"
              id="flower-image-upload"
            />

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((imgSrc, idx) => (
                  <div
                    key={`${imgSrc.slice(0, 36)}-${idx}`}
                    className={`relative aspect-[4/5] rounded-xl overflow-hidden border bg-cream group ${
                      idx === 0 ? 'border-forest ring-2 ring-forest/20' : 'border-line'
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={`Ảnh mẫu hoa ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-forest text-ivory text-[10px] font-medium">
                        Ảnh chính
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMakePrimaryImage(idx)}
                        className="absolute bottom-2 left-2 right-2 py-1 rounded-md bg-ivory/92 text-[11px] font-medium text-charcoal hover:bg-ivory transition-colors"
                      >
                        Đặt làm ảnh chính
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label={`Xóa ảnh ${idx + 1}`}
                      className="w-8 h-8 absolute top-1.5 right-1.5 rounded-lg bg-charcoal/75 text-ivory inline-flex items-center justify-center hover:bg-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Friendly Upload Area */}
            <div
              className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                errors.images
                  ? 'border-danger bg-danger-soft/30'
                  : 'border-line-strong bg-ivory/75 hover:border-sage'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-cream mx-auto flex items-center justify-center text-forest mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-charcoal">
                Chạm để tải ảnh hoa từ điện thoại hoặc máy tính
              </p>
              <p className="text-xs text-stone mt-1">
                Nên chọn ảnh chụp rõ bó hoa dưới ánh sáng tự nhiên (tỷ lệ dọc 4:5 đẹp nhất).
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<ImagePlus className="w-4 h-4 text-forest" />}
                >
                  Chọn ảnh từ thiết bị
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSamplePicker((prev) => !prev)}
                >
                  {showSamplePicker ? 'Ẩn kho ảnh mẫu' : 'Dùng ảnh mẫu thử nghiệm'}
                </Button>
              </div>
            </div>

            {/* Quick Sample Picker for Easy Prototype Testing */}
            {showSamplePicker && (
              <div className="rounded-xl bg-cream/65 border border-line p-3.5 space-y-2.5">
                <p className="text-xs font-medium text-charcoal">
                  Chạm vào một ảnh dưới đây để thêm nhanh khi thử nghiệm:
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SAMPLE_GALLERY_CHOICES.map((sample) => {
                    const selected = images.includes(sample.url);
                    return (
                      <button
                        key={sample.url}
                        type="button"
                        onClick={() => handleAddSampleImage(sample.url)}
                        className={`relative aspect-[4/5] rounded-lg overflow-hidden border-2 transition-all ${
                          selected ? 'border-forest opacity-65' : 'border-line hover:border-sage'
                        }`}
                        title={sample.label}
                      >
                        <img
                          src={sample.url}
                          alt={sample.label}
                          className="w-full h-full object-cover"
                        />
                        {selected && (
                          <span className="absolute inset-0 bg-forest/35 flex items-center justify-center text-ivory">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {errors.images && (
              <p role="alert" className="text-xs text-danger font-medium">
                {errors.images}
              </p>
            )}
          </section>

          {/* Section 2: Name, Category, Auto Code & Price */}
          <section className="rounded-2xl bg-paper border border-line p-5 sm:p-6 space-y-5">
            <h2 className="text-base font-semibold text-charcoal">
              2. Thông tin mẫu hoa
            </h2>

            <InputField
              label="Tên mẫu hoa *"
              placeholder="Ví dụ: Hồng Dịu Dàng, Giỏ Hoa Bình Yên..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              error={errors.name}
            />

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-charcoal block">
                Danh mục chính *
              </label>
              <div
                role="radiogroup"
                aria-label="Chọn danh mục chính"
                className="flex flex-wrap gap-2"
              >
                {PRODUCT_CATEGORIES.map((category) => {
                  const selected = primaryCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setPrimaryCategory(category);
                        setExtraCategories((prev) => prev.filter((c) => c !== category));
                      }}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        selected
                          ? 'bg-forest text-ivory border-forest'
                          : 'bg-ivory text-charcoal border-line-strong hover:border-sage'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Additional Occasion Tags */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-stone block">
                Hiển thị thêm ở mục dịp tặng (không bắt buộc):
              </span>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.filter((c) => c !== primaryCategory).map((cat) => {
                  const checked = extraCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleExtraCategory(cat)}
                      aria-pressed={checked}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${
                        checked
                          ? 'bg-forest-soft text-forest border-forest/35'
                          : 'bg-ivory/70 text-stone border-line hover:text-charcoal'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Automatically Generated Product Code */}
            <div className="rounded-xl bg-cream/70 border border-line px-4 py-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-stone flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-forest" />
                  Mã mẫu hoa (tự động tạo)
                </span>
                <p className="text-xs text-stone mt-0.5">
                  Khách hàng sẽ đọc mã này cho nhân viên tại quầy.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-lg bg-paper border border-line-strong text-base font-bold tracking-wider text-charcoal tabular-nums shrink-0">
                {productCode}
              </span>
            </div>

            {/* Price in VND */}
            <div className="space-y-2">
              <InputField
                label="Giá bán (VNĐ) *"
                inputMode="numeric"
                placeholder="Ví dụ: 350.000"
                value={formattedInputPrice}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 9);
                  setPriceDigits(rawDigits);
                  if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                error={errors.price}
                trailingElement={
                  <span className="text-sm font-semibold text-stone pr-1">đ</span>
                }
                helperText={
                  numericPrice > 0
                    ? `Hiển thị cho khách xem: ${formatVND(numericPrice)}`
                    : 'Chỉ cần nhập số, dấu chấm phân cách hàng nghìn sẽ tự động hiển thị.'
                }
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-xs text-stone mr-1">Chọn nhanh:</span>
                {QUICK_PRICES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPriceDigits(String(preset));
                      setErrors((prev) => ({ ...prev, price: undefined }));
                    }}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium border tabular-nums transition-colors ${
                      numericPrice === preset
                        ? 'bg-forest-soft text-forest border-forest/35'
                        : 'bg-ivory text-stone border-line hover:text-charcoal'
                    }`}
                  >
                    {formatVND(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Description & Stems */}
            <TextareaField
              label="Mô tả ngắn"
              hint="Không bắt buộc"
              rows={3}
              placeholder="Ví dụ: Bó hồng phấn Đà Lạt phối lá bạc khuynh diệp, phù hợp tặng sinh nhật hoặc kỷ niệm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <InputField
              label="Thành phần hoa chính"
              hint="Không bắt buộc"
              placeholder="Ví dụ: Hồng kem dâu, cát tường trắng, giỏ mây đan"
              value={stemsNote}
              onChange={(e) => setStemsNote(e.target.value)}
            />
          </section>

          {/* Section 3: Visibility Toggle */}
          <section className="rounded-2xl bg-paper border border-line p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
                  {isVisible ? (
                    <Eye className="w-4.5 h-4.5 text-forest" />
                  ) : (
                    <EyeOff className="w-4.5 h-4.5 text-stone" />
                  )}
                  <span>
                    {isVisible ? 'Hiển thị trên menu khách xem' : 'Đang tạm ẩn mẫu hoa này'}
                  </span>
                </h2>
                <p className="text-sm text-stone leading-relaxed">
                  {isVisible
                    ? 'Khách quét mã QR tại tiệm sẽ nhìn thấy mẫu hoa và giá bán ngay lập tức.'
                    : 'Mẫu hoa vẫn được lưu trong tiệm nhưng tạm thời chưa hiện cho khách xem.'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isVisible}
                aria-label="Bật hoặc tắt hiển thị mẫu hoa"
                onClick={() => setIsVisible((prev) => !prev)}
                className={`relative w-14 h-8 rounded-full transition-colors shrink-0 mt-0.5 ${
                  isVisible ? 'bg-forest' : 'bg-line-strong'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-paper shadow transition-transform ${
                    isVisible ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleRequestCancel}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Check className="w-5 h-5" />}
            >
              Lưu mẫu hoa
            </Button>
          </div>
        </form>
      </main>

      {/* Gentle Discard Confirmation Dialog */}
      <DialogModal
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        title="Hủy thay đổi chưa lưu?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone leading-relaxed">
            Thông tin mẫu hoa bạn vừa nhập chưa được lưu. Bạn có muốn tiếp tục chỉnh sửa hay quay lại danh sách?
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmCancelOpen(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button variant="primary" onClick={onCancel}>
              Hủy thay đổi
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
