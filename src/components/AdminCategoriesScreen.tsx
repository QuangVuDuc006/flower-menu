import { useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Plus, Tag, Trash2 } from 'lucide-react';
import type { AppScreen, CategoryItem } from '../types/flower';
import { Button, DialogModal, EmptyState, FeedbackBanner, InputField } from './ui/Primitives';

interface AdminCategoriesScreenProps {
  categories: CategoryItem[];
  bannerMessage: string | null;
  onDismissBanner: () => void;
  busy?: boolean;
  onAddCategory: (name: string) => Promise<void> | void;
  onUpdateCategory: (id: string, updates: Partial<CategoryItem>) => Promise<void> | void;
  onDeleteCategory: (id: string) => Promise<void> | void;
  onMoveCategory?: (id: string, direction: 'up' | 'down') => Promise<void> | void;
  activeTab?: 'products' | 'categories' | 'settings';
  onSelectTab?: (tab: 'products' | 'categories' | 'settings') => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

export function AdminCategoriesScreen({
  categories,
  bannerMessage,
  onDismissBanner,
  busy = false,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onMoveCategory,
  activeTab = 'categories',
  onSelectTab,
  onNavigate,
  onLogout,
}: AdminCategoriesScreenProps) {
  const [newCatName, setNewCatName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setAddError('Tên danh mục cần có từ 2 đến 50 ký tự.');
      return;
    }
    const duplicate = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setAddError('Tên danh mục này đã tồn tại trong tiệm.');
      return;
    }
    setAddError('');
    setLocalBusy(true);
    try {
      await onAddCategory(trimmed);
      setNewCatName('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Chưa thêm được danh mục. Vui lòng thử lại.');
    } finally {
      setLocalBusy(false);
    }
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setEditError('Tên danh mục cần có từ 2 đến 50 ký tự.');
      return;
    }
    const duplicate = categories.some(
      (c) => c.id !== editingCategory.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setEditError('Tên danh mục này đã trùng với một danh mục khác.');
      return;
    }
    setEditError('');
    setLocalBusy(true);
    try {
      await onUpdateCategory(editingCategory.id, { name: trimmed });
      setEditingCategory(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Chưa cập nhật được danh mục. Vui lòng thử lại.');
    } finally {
      setLocalBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    setLocalBusy(true);
    try {
      await onDeleteCategory(deletingCategory.id);
      setDeletingCategory(null);
    } catch {
      // error handled by parent or banner
    } finally {
      setLocalBusy(false);
    }
  };

  const isActionBusy = busy || localBusy;

  return (
    <div className="min-h-screen bg-ivory pb-16">
      {/* Admin Header */}
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

      <main className="mx-auto max-w-[1120px] space-y-6 px-4 pt-5 md:px-8 md:pt-8">
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
            Quản lý danh mục
          </h1>
          <p className="text-sm text-stone max-w-2xl leading-relaxed">
            Danh mục giúp khách hàng dễ dàng lọc xem các mẫu hoa theo nhu cầu. Bạn có thể thêm, đổi tên,
            sắp xếp thứ tự hoặc tạm ẩn danh mục.
          </p>
        </div>

        {/* Add Category Form */}
        <div className="rounded-2xl border border-line bg-paper p-4 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-charcoal mb-3 flex items-center gap-2">
            <Plus className="size-4 text-forest" />
            <span>Thêm danh mục mới</span>
          </h2>
          <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <InputField
                label="Tên danh mục"
                placeholder="Ví dụ: Hoa khai trương, Lan hồ điệp..."
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (addError) setAddError('');
                }}
                error={addError}
                maxLength={50}
                disabled={isActionBusy}
              />
            </div>
            <div className="sm:self-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isActionBusy || !newCatName.trim()}
                isLoading={isActionBusy}
                className="w-full sm:w-auto"
              >
                Thêm danh mục
              </Button>
            </div>
          </form>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
              <Tag className="size-4 text-forest" />
              <span>Danh sách danh mục ({categories.length})</span>
            </h2>
          </div>

          {categories.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-paper divide-y divide-line">
              {categories.map((cat, index) => {
                const count = cat.productCount ?? 0;
                const canDelete = count === 0;
                return (
                  <article
                    key={cat.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-cream/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col gap-1 shrink-0">
                        {onMoveCategory && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              aria-label={`Chuyển danh mục ${cat.name} lên trên`}
                              disabled={isActionBusy || index === 0}
                              onClick={() => onMoveCategory(cat.id, 'up')}
                              className="size-7 rounded-lg border border-line flex items-center justify-center text-forest hover:bg-cream disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Chuyển danh mục ${cat.name} xuống dưới`}
                              disabled={isActionBusy || index === categories.length - 1}
                              onClick={() => onMoveCategory(cat.id, 'down')}
                              className="size-7 rounded-lg border border-line flex items-center justify-center text-forest hover:bg-cream disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-[15px] text-charcoal break-words">
                            {cat.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              cat.isActive
                                ? 'bg-forest-soft text-forest border-forest/20'
                                : 'bg-cream text-stone border-line-strong'
                            }`}
                          >
                            {cat.isActive ? 'Đang hiện' : 'Đang ẩn'}
                          </span>
                        </div>
                        <p className="text-xs text-stone mt-0.5">
                          {count > 0 ? `${count} mẫu hoa trong mục này` : 'Chưa có mẫu hoa nào'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                      <button
                        type="button"
                        aria-label={`Đổi tên danh mục ${cat.name}`}
                        disabled={isActionBusy}
                        onClick={() => openEditModal(cat)}
                        className="min-h-11 rounded-xl border border-line px-3 text-xs font-medium text-forest hover:bg-cream inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Edit2 className="size-3.5" />
                        <span>Sửa tên</span>
                      </button>

                      <button
                        type="button"
                        aria-label={cat.isActive ? `Ẩn danh mục ${cat.name}` : `Hiện danh mục ${cat.name}`}
                        disabled={isActionBusy}
                        onClick={() => onUpdateCategory(cat.id, { isActive: !cat.isActive })}
                        className="min-h-11 rounded-xl border border-line px-3 text-xs font-medium text-forest hover:bg-cream disabled:opacity-50"
                      >
                        {cat.isActive ? 'Ẩn' : 'Hiện'}
                      </button>

                      <button
                        type="button"
                        aria-label={`Xóa danh mục ${cat.name}`}
                        disabled={isActionBusy || !canDelete}
                        title={
                          !canDelete
                            ? `Không thể xóa vì đang có ${count} mẫu hoa thuộc danh mục này. Hãy chuyển các mẫu sang danh mục khác trước.`
                            : undefined
                        }
                        onClick={() => setDeletingCategory(cat)}
                        className={`min-h-11 rounded-xl border px-3 text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                          canDelete
                            ? 'border-line text-danger hover:bg-danger-soft/40'
                            : 'border-line bg-cream/50 text-stone/60 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Trash2 className="size-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="Chưa có danh mục nào"
              description="Hãy thêm danh mục đầu tiên để phân loại mẫu hoa trên menu."
            />
          )}
        </div>
      </main>

      {/* Edit Category Name Modal */}
      <DialogModal
        open={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title="Chỉnh sửa danh mục"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <InputField
            label="Tên danh mục *"
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
              if (editError) setEditError('');
            }}
            error={editError}
            maxLength={50}
            disabled={isActionBusy}
            autoFocus
          />
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isActionBusy}
              onClick={() => setEditingCategory(null)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isActionBusy || !editName.trim()}
              isLoading={isActionBusy}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* Confirm Delete Category Modal */}
      <DialogModal
        open={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        title="Xóa danh mục?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone leading-relaxed">
            Bạn có chắc muốn xóa danh mục{' '}
            <strong className="text-charcoal font-semibold">"{deletingCategory?.name}"</strong> khỏi
            tiệm? Hành động này không thể hoàn tác.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isActionBusy}
              onClick={() => setDeletingCategory(null)}
            >
              Không xóa
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-danger text-ivory border-danger hover:bg-danger/90"
              disabled={isActionBusy}
              isLoading={isActionBusy}
              onClick={confirmDelete}
            >
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
