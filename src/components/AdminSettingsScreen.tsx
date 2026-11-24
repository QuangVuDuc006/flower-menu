import { useEffect, useMemo, useState } from 'react';
import { Check, Settings, Store } from 'lucide-react';
import type { AppScreen, ShopSettings } from '../types/flower';
import { sanitizeZaloUrl } from '../config/shop';
import { Button, DialogModal, FeedbackBanner, InputField, TextareaField } from './ui/Primitives';

interface AdminSettingsScreenProps {
  settings: ShopSettings;
  bannerMessage: string | null;
  onDismissBanner: () => void;
  busy?: boolean;
  onSaveSettings: (settings: ShopSettings) => Promise<void> | void;
  activeTab?: 'products' | 'categories' | 'settings';
  onSelectTab?: (tab: 'products' | 'categories' | 'settings') => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

export function AdminSettingsScreen({
  settings,
  bannerMessage,
  onDismissBanner,
  busy = false,
  onSaveSettings,
  activeTab = 'settings',
  onSelectTab,
  onNavigate,
  onLogout,
}: AdminSettingsScreenProps) {
  const [formData, setFormData] = useState<ShopSettings>(settings);
  const [errors, setErrors] = useState<{ shopName?: string; zaloUrl?: string }>({});
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  // Sync state if incoming settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    return (
      formData.shopName !== settings.shopName ||
      formData.tagline !== settings.tagline ||
      formData.hours !== settings.hours ||
      formData.address !== settings.address ||
      formData.zaloUrl !== settings.zaloUrl ||
      formData.contactNote !== settings.contactNote ||
      formData.priceNote !== settings.priceNote ||
      formData.welcomeHeading !== settings.welcomeHeading ||
      formData.welcomeSubtitle !== settings.welcomeSubtitle
    );
  }, [formData, settings]);

  // Warn on tab/browser close if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (field: keyof ShopSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleGuardedNavigate = (navAction: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => navAction);
      setConfirmLeaveOpen(true);
    } else {
      navAction();
    }
  };

  const validate = (): boolean => {
    const nextErrors: { shopName?: string; zaloUrl?: string } = {};

    if (!formData.shopName.trim()) {
      nextErrors.shopName = 'Vui lòng nhập tên tiệm hoa.';
    }

    const trimmedZalo = formData.zaloUrl.trim();
    if (trimmedZalo) {
      const sanitized = sanitizeZaloUrl(trimmedZalo);
      if (!sanitized) {
        nextErrors.zaloUrl = 'Đường dẫn Zalo phải bắt đầu bằng https:// (ví dụ: https://zalo.me/0901234567)';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || busy || localBusy) return;

    setLocalBusy(true);
    try {
      await onSaveSettings({
        ...formData,
        shopName: formData.shopName.trim(),
        tagline: formData.tagline.trim(),
        hours: formData.hours.trim(),
        address: formData.address.trim(),
        zaloUrl: formData.zaloUrl.trim(),
        contactNote: formData.contactNote.trim(),
        priceNote: formData.priceNote.trim(),
        welcomeHeading: formData.welcomeHeading.trim(),
        welcomeSubtitle: formData.welcomeSubtitle.trim(),
      });
    } catch {
      // Handled by parent
    } finally {
      setLocalBusy(false);
    }
  };

  const isSaving = busy || localBusy;

  return (
    <div className="min-h-screen bg-ivory pb-20">
      {/* Admin Header */}
      <header className="bg-paper border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-2 px-4 py-3.5 md:px-8">
          <span className="font-serif text-[19px] font-semibold md:text-2xl">Tiệm Hoa · Quản trị</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleGuardedNavigate(() => onNavigate('catalog'))}
              className="min-h-11 rounded-xl border border-line px-3 text-xs font-medium text-forest hover:bg-cream transition-colors"
            >
              Xem menu khách
            </button>
            <button
              type="button"
              onClick={() => handleGuardedNavigate(onLogout)}
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
              onClick={() => handleGuardedNavigate(() => onSelectTab('products'))}
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
              onClick={() => handleGuardedNavigate(() => onSelectTab('categories'))}
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

      <main className="mx-auto max-w-[800px] space-y-6 px-4 pt-5 md:px-8 md:pt-8">
        {bannerMessage && (
          <FeedbackBanner
            variant="success"
            title="Thành công"
            message={bannerMessage}
            onDismiss={onDismissBanner}
          />
        )}

        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[34px] font-semibold leading-tight md:text-[44px]">
            Cài đặt tiệm hoa
          </h1>
          <p className="text-sm text-stone max-w-2xl leading-relaxed">
            Thông tin tại đây sẽ hiển thị trực tiếp trên đầu trang, chân trang và ghi chú hỗ trợ khách hàng
            khi xem danh mục hoa tại tiệm.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Section 1: Basic Shop Identity */}
          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
              <Store className="size-4 text-forest" />
              <span>Thông tin nhận diện tiệm</span>
            </h2>

            <InputField
              label="Tên tiệm hoa *"
              placeholder="Ví dụ: Tiệm Hoa Xinh"
              value={formData.shopName}
              onChange={(e) => handleChange('shopName', e.target.value)}
              error={errors.shopName}
              disabled={isSaving}
              required
            />

            <InputField
              label="Khẩu hiệu / Giới thiệu ngắn"
              placeholder="Ví dụ: Hoa tươi mỗi ngày · Đặt hoa theo yêu cầu"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              disabled={isSaving}
            />

            <InputField
              label="Giờ mở cửa"
              hint="Không bắt buộc"
              placeholder="Ví dụ: 08:00 – 21:00 hàng ngày"
              value={formData.hours}
              onChange={(e) => handleChange('hours', e.target.value)}
              disabled={isSaving}
            />

            <InputField
              label="Địa chỉ tiệm"
              hint="Không bắt buộc"
              placeholder="Ví dụ: 123 Đường Hoa, Phường Bến Nghé, Quận 1, TP.HCM"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              disabled={isSaving}
            />
          </section>

          {/* Section 2: Contact & Notes */}
          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
              <Settings className="size-4 text-forest" />
              <span>Liên hệ & Ghi chú khách hàng</span>
            </h2>

            <InputField
              label="Đường dẫn Zalo tư vấn"
              hint="Để trống nếu chưa dùng"
              placeholder="https://zalo.me/0901234567"
              value={formData.zaloUrl}
              onChange={(e) => handleChange('zaloUrl', e.target.value)}
              error={errors.zaloUrl}
              helperText="Định dạng chuẩn: https://zalo.me/số_điện_thoại hoặc liên kết Zalo OA của tiệm."
              disabled={isSaving}
            />

            <TextareaField
              label="Ghi chú liên hệ / Hướng dẫn khách"
              hint="Hiển thị ở chân trang"
              rows={2}
              placeholder="Ví dụ: Quý khách vui lòng lưu lại mã hoa để nhân viên phục vụ nhanh chóng nhất."
              value={formData.contactNote}
              onChange={(e) => handleChange('contactNote', e.target.value)}
              disabled={isSaving}
            />

            <InputField
              label="Ghi chú giá bán"
              hint="Hiển thị ở trang chi tiết mẫu hoa"
              placeholder="Ví dụ: Giá đã bao gồm thiệp chúc mừng và phụ kiện cơ bản."
              value={formData.priceNote}
              onChange={(e) => handleChange('priceNote', e.target.value)}
              disabled={isSaving}
            />
          </section>

          {/* Section 3: Welcome Editorial Note */}
          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
              <Settings className="size-4 text-forest" />
              <span>Lời chào đầu trang menu</span>
            </h2>

            <InputField
              label="Tiêu đề lời chào"
              placeholder="Ví dụ: Hoa đẹp cho những khoảnh khắc đặc biệt"
              value={formData.welcomeHeading}
              onChange={(e) => handleChange('welcomeHeading', e.target.value)}
              disabled={isSaving}
            />

            <TextareaField
              label="Nội dung lời chào"
              rows={3}
              placeholder="Ví dụ: Mời bạn xem các mẫu hoa hiện có tại tiệm. Khi chọn được mẫu ưng ý, bạn chỉ cần đưa mã mẫu cho nhân viên..."
              value={formData.welcomeSubtitle}
              onChange={(e) => handleChange('welcomeSubtitle', e.target.value)}
              disabled={isSaving}
            />
          </section>

          {/* Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div>
              {isDirty && (
                <span className="text-xs text-stone">
                  Bạn có thay đổi chưa lưu.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!isDirty || isSaving}
                onClick={() => setFormData(settings)}
              >
                Khôi phục
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!isDirty || isSaving}
                isLoading={isSaving}
                leftIcon={<Check className="size-4" />}
              >
                Lưu cài đặt
              </Button>
            </div>
          </div>
        </form>
      </main>

      {/* Unsaved Changes Confirmation Modal */}
      <DialogModal
        open={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        title="Rời khỏi trang khi chưa lưu?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone leading-relaxed">
            Bạn có các chỉnh sửa trong phần cài đặt tiệm chưa được lưu. Nếu rời đi bây giờ, các thay đổi sẽ bị mất.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmLeaveOpen(false)}
            >
              Ở lại chỉnh sửa
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-danger text-ivory border-danger hover:bg-danger/90"
              onClick={() => {
                setConfirmLeaveOpen(false);
                if (pendingNavigation) {
                  pendingNavigation();
                  setPendingNavigation(null);
                }
              }}
            >
              Bỏ thay đổi & Rời đi
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
