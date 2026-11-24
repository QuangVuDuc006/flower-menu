import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ImagePlus,
  RefreshCw,
} from 'lucide-react';
import type { CategoryItem, FlowerProduct, ShopSettings } from '../types/flower';
import { PRODUCT_CATEGORIES } from '../data/mockFlowers';
import { prepareProductImage } from '../utils/productImage';
import { formatVND } from '../utils/format';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { AdminCategoriesScreen } from './AdminCategoriesScreen';
import { AdminSettingsScreen } from './AdminSettingsScreen';
import { Button, DialogModal, InputField, TextareaField } from './ui/Primitives';

const productsApiUrl = '/api/admin/products';
const categoriesApiUrl = '/api/admin/categories';
const settingsApiUrl = '/api/admin/settings';

export function adminImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/public/images/')) {
    return url.replace('/api/public/images/', '/api/admin/images/');
  }
  return url;
}

export function LiveAdmin() {
  const [products, setProducts] = useState<FlowerProduct[] | null>(null);
  const [categories, setCategories] = useState<CategoryItem[] | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  // Stable idempotency key for creation (A3)
  const [createIdempotencyKey, setCreateIdempotencyKey] = useState<string | null>(null);

  // Load data in parallel
  const loadData = async (signal?: AbortSignal) => {
    setError('');
    setAuthError(false);
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        fetch(productsApiUrl, { signal, redirect: 'error' }),
        fetch(categoriesApiUrl, { signal, redirect: 'error' }),
        fetch(settingsApiUrl, { signal, redirect: 'error' }),
      ]);

      if (prodRes.status === 401 || prodRes.status === 403 ||
          catRes.status === 401 || catRes.status === 403 ||
          setRes.status === 401 || setRes.status === 403) {
        setAuthError(true);
        return;
      }

      if (!prodRes.ok) throw new Error('Không tải được danh sách mẫu hoa.');
      if (!catRes.ok) throw new Error('Không tải được danh mục.');
      if (!setRes.ok) throw new Error('Không tải được cài đặt tiệm.');

      const [prods, cats, sets] = await Promise.all([
        prodRes.json() as Promise<FlowerProduct[]>,
        catRes.json() as Promise<CategoryItem[]>,
        setRes.json() as Promise<ShopSettings>,
      ]);

      setProducts(prods);
      setCategories(cats);
      setSettings(sets);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof Error && cause.message && cause.name !== 'TypeError'
          ? cause.message
          : 'Chưa tải được dữ liệu quản trị. Hãy kiểm tra kết nối mạng và thử lại.'
      );
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      controller.abort();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setCurrentPath(nextPath);
    window.scrollTo(0, 0);
  };

  // Determine current active editing product from URL
  const editingProductMatch = useMemo(() => {
    if (currentPath === '/admin/flowers/new') return 'new';
    const match = currentPath.match(/^\/admin\/flowers\/([^/]+)\/edit$/);
    if (match && products) {
      const found = products.find((p) => p.id === match[1]);
      return found ?? 'not-found';
    }
    return null;
  }, [currentPath, products]);

  // When opening new flower form, ensure stable idempotency key
  useEffect(() => {
    if (editingProductMatch === 'new') {
      if (!createIdempotencyKey) {
        setCreateIdempotencyKey(crypto.randomUUID());
      }
    } else {
      setCreateIdempotencyKey(null);
    }
  }, [editingProductMatch, createIdempotencyKey]);

  // Category Operations
  const handleAddCategory = async (name: string) => {
    setBusy(true);
    try {
      const res = await fetch(categoriesApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Không thể thêm danh mục.');
      }
      const newCat: CategoryItem = await res.json();
      setCategories((prev) => (prev ? [...prev, newCat] : [newCat]));
      setMessage(`Đã thêm danh mục "${newCat.name}".`);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<CategoryItem>) => {
    setBusy(true);
    try {
      const res = await fetch(`${categoriesApiUrl}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Không thể cập nhật danh mục.');
      }
      const updated: CategoryItem = await res.json();
      await loadData();
      setMessage(`Đã cập nhật danh mục "${updated.name}".`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${categoriesApiUrl}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Không thể xóa danh mục.');
      }
      setCategories((prev) => (prev ? prev.filter((c) => c.id !== id) : []));
      setMessage('Đã xóa danh mục thành công.');
    } finally {
      setBusy(false);
    }
  };

  const handleMoveCategory = async (id: string, direction: 'up' | 'down') => {
    if (!categories || categories.length < 2) return;
    const index = categories.findIndex((c) => c.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const currentCat = categories[index];
    const targetCat = categories[targetIndex];

    const currentOrder = currentCat.sortOrder ?? index;
    const targetOrder = targetCat.sortOrder ?? targetIndex;

    // Swap sort orders
    await handleUpdateCategory(currentCat.id, { sortOrder: targetOrder });
    await handleUpdateCategory(targetCat.id, { sortOrder: currentOrder });
  };

  // Settings Operations
  const handleSaveSettings = async (nextSettings: ShopSettings) => {
    setBusy(true);
    try {
      const res = await fetch(settingsApiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Không thể lưu cài đặt tiệm.');
      }
      const updated: ShopSettings = await res.json();
      setSettings(updated);
      setMessage('Đã lưu thành công cài đặt tiệm hoa.');
    } finally {
      setBusy(false);
    }
  };

  // Product visibility toggle
  const handleToggleVisibility = async (productId: string) => {
    if (!products) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setBusy(true);
    try {
      const res = await fetch(`${productsApiUrl}/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVisible: !product.isVisible,
          expectedVersion: product.version ?? 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Chưa cập nhật được trạng thái.');
      }
      const updated: FlowerProduct = await res.json();
      setProducts((prev) =>
        prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : null
      );
      setMessage(
        updated.isVisible
          ? `Đã hiện mẫu "${updated.name}" trên menu.`
          : `Đã tạm ẩn mẫu "${updated.name}".`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Có lỗi khi cập nhật.');
    } finally {
      setBusy(false);
    }
  };

  // Product featured toggle
  const handleToggleFeatured = async (productId: string) => {
    if (!products) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setBusy(true);
    try {
      const res = await fetch(`${productsApiUrl}/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFeatured: !product.isFeatured,
          expectedVersion: product.version ?? 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Chưa cập nhật được trạng thái nổi bật.');
      }
      const updated: FlowerProduct = await res.json();
      setProducts((prev) =>
        prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : null
      );
      setMessage(
        updated.isFeatured
          ? `Đã đánh dấu nổi bật mẫu "${updated.name}".`
          : `Đã bỏ nổi bật mẫu "${updated.name}".`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Có lỗi khi cập nhật.');
    } finally {
      setBusy(false);
    }
  };

  // Product reordering
  const handleMoveOrder = async (productId: string, direction: 'up' | 'down') => {
    if (!products || products.length < 2) return;
    const index = products.findIndex((p) => p.id === productId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const currentProd = products[index];
    const targetProd = products[targetIndex];

    const currentOrder = currentProd.sortOrder ?? index;
    const targetOrder = targetProd.sortOrder ?? targetIndex;

    setBusy(true);
    try {
      const res1 = await fetch(`${productsApiUrl}/${encodeURIComponent(currentProd.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sortOrder: targetOrder,
          expectedVersion: currentProd.version ?? 1,
        }),
      });
      if (!res1.ok) {
        const data = await res1.json().catch(() => null);
        throw new Error(data?.error || 'Chưa cập nhật được thứ tự.');
      }
      const res2 = await fetch(`${productsApiUrl}/${encodeURIComponent(targetProd.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sortOrder: currentOrder,
          expectedVersion: targetProd.version ?? 1,
        }),
      });
      if (!res2.ok) {
        const data = await res2.json().catch(() => null);
        throw new Error(data?.error || 'Chưa cập nhật được thứ tự.');
      }
      await loadData();
      setMessage('Đã cập nhật thứ tự mẫu hoa.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa cập nhật được thứ tự.');
    } finally {
      setBusy(false);
    }
  };

  // Authentication error screen (Strictly NO demo auth fallback!)
  if (authError) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm space-y-4">
          <div className="size-12 rounded-full bg-danger-soft text-danger mx-auto flex items-center justify-center">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">
            Yêu cầu xác thực quản trị
          </h1>
          <p className="text-sm text-stone leading-relaxed">
            Phiên đăng nhập quản trị tiệm hoa đã hết hạn hoặc bạn chưa có quyền truy cập. Vui lòng đăng nhập lại qua hệ thống Cloudflare Access.
          </p>
          <div className="pt-2">
            <a
              href="/admin"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-forest px-4 text-sm font-medium text-ivory hover:bg-forest-hover transition-colors"
            >
              Đăng nhập trang quản trị
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Initial loading state
  if (!products || !categories || !settings) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p role={error ? 'alert' : 'status'} className="text-sm text-stone">
          {error || 'Đang tải dữ liệu quản trị tiệm hoa…'}
        </p>
        {error && (
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-paper px-4 text-xs font-medium text-forest hover:bg-cream"
          >
            <RefreshCw className="size-3.5" />
            <span>Thử lại</span>
          </button>
        )}
      </main>
    );
  }

  // Sub-route: Editing / Adding Product Form
  if (editingProductMatch) {
    if (editingProductMatch === 'not-found') {
      return (
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-serif text-2xl font-semibold text-charcoal">Không tìm thấy mẫu hoa</h1>
          <p className="text-sm text-stone mt-2">Mẫu hoa này có thể đã bị xóa hoặc đường dẫn không đúng.</p>
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="mt-4"
          >
            Về danh sách mẫu hoa
          </Button>
        </main>
      );
    }

    const isNew = editingProductMatch === 'new';
    const currentProduct = isNew ? null : editingProductMatch;

    return (
      <ProductEditorView
        key={currentProduct?.id ?? 'new'}
        product={currentProduct}
        categories={categories}
        idempotencyKey={createIdempotencyKey}
        onCancel={() => navigate('/admin')}
        onSaved={(savedProduct, isCreated) => {
          setProducts((prev) => {
            if (!prev) return [savedProduct];
            return isCreated
              ? [savedProduct, ...prev]
              : prev.map((p) => (p.id === savedProduct.id ? savedProduct : p));
          });
          setMessage(
            isCreated
              ? `Đã thêm mẫu hoa mới "${savedProduct.name}" (${savedProduct.code}).`
              : `Đã lưu thay đổi cho mẫu hoa "${savedProduct.name}".`
          );
          navigate('/admin');
        }}
      />
    );
  }

  // Sub-route: Categories Management
  if (currentPath === '/admin/categories') {
    return (
      <AdminCategoriesScreen
        categories={categories}
        bannerMessage={message}
        onDismissBanner={() => setMessage(null)}
        busy={busy}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onMoveCategory={handleMoveCategory}
        activeTab="categories"
        onSelectTab={(tab) => {
          if (tab === 'products') navigate('/admin');
          if (tab === 'categories') navigate('/admin/categories');
          if (tab === 'settings') navigate('/admin/settings');
        }}
        onNavigate={(screen) => {
          if (screen === 'catalog') window.location.assign('/');
          if (screen === 'design-system') window.location.assign('/design-system');
        }}
        onLogout={() => window.location.assign('/cdn-cgi/access/logout')}
      />
    );
  }

  // Sub-route: Settings Management
  if (currentPath === '/admin/settings') {
    return (
      <AdminSettingsScreen
        settings={settings}
        bannerMessage={message}
        onDismissBanner={() => setMessage(null)}
        busy={busy}
        onSaveSettings={handleSaveSettings}
        activeTab="settings"
        onSelectTab={(tab) => {
          if (tab === 'products') navigate('/admin');
          if (tab === 'categories') navigate('/admin/categories');
          if (tab === 'settings') navigate('/admin/settings');
        }}
        onNavigate={(screen) => {
          if (screen === 'catalog') window.location.assign('/');
          if (screen === 'design-system') window.location.assign('/design-system');
        }}
        onLogout={() => window.location.assign('/cdn-cgi/access/logout')}
      />
    );
  }

  // Default: Products Dashboard
  return (
    <>
      {error && (
        <p role="alert" className="border-b border-line bg-danger-soft px-4 py-3 text-center text-sm text-danger">
          {error}
        </p>
      )}
      <AdminDashboardScreen
        products={products.map((item) => ({
          ...item,
          images: item.images.map(adminImageUrl),
        }))}
        bannerMessage={message}
        onDismissBanner={() => setMessage(null)}
        busy={busy}
        activeTab="products"
        onSelectTab={(tab) => {
          if (tab === 'products') navigate('/admin');
          if (tab === 'categories') navigate('/admin/categories');
          if (tab === 'settings') navigate('/admin/settings');
        }}
        onAddProduct={() => {
          setError('');
          navigate('/admin/flowers/new');
        }}
        onEditProduct={(product) => {
          setError('');
          navigate(`/admin/flowers/${product.id}/edit`);
        }}
        onToggleVisibility={handleToggleVisibility}
        onToggleFeatured={handleToggleFeatured}
        onMoveOrder={handleMoveOrder}
        onNavigate={(screen) => {
          if (screen === 'catalog') window.location.assign('/');
          if (screen === 'design-system') window.location.assign('/design-system');
        }}
        onLogout={() => window.location.assign('/cdn-cgi/access/logout')}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Dedicated Product Editor View with Optimistic Locking, Dirty State & Data Preservation
// ---------------------------------------------------------------------------

interface ProductEditorViewProps {
  product: FlowerProduct | null;
  categories: CategoryItem[];
  idempotencyKey: string | null;
  onCancel: () => void;
  onSaved: (product: FlowerProduct, isCreated: boolean) => void;
}

function ProductEditorView({
  product,
  categories,
  idempotencyKey,
  onCancel,
  onSaved,
}: ProductEditorViewProps) {
  const isEdit = Boolean(product);

  const availableCategoryNames = useMemo(() => {
    const active = categories.filter((c) => c.isActive).map((c) => c.name);
    return active.length > 0 ? active : PRODUCT_CATEGORIES;
  }, [categories]);

  // Form states
  const [name, setName] = useState(product?.name ?? '');
  const [priceString, setPriceString] = useState(product ? String(product.price) : '');
  const [primaryCategory, setPrimaryCategory] = useState(
    product?.primaryCategory ?? availableCategoryNames[0] ?? 'Hoa bó'
  );
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>(
    product ? product.categories.filter((c) => c !== product.primaryCategory) : []
  );
  const [description, setDescription] = useState(product?.description ?? '');
  const [stemsNote, setStemsNote] = useState(product?.stemsNote ?? '');
  const [isVisible, setIsVisible] = useState(product ? product.isVisible : true);

  // Images state: uploaded data URI or current image URL
  const [previewImage, setPreviewImage] = useState<string>(product?.images[0] ?? '');
  const [newUploadedDataUri, setNewUploadedDataUri] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [error, setError] = useState('');
  const [conflictData, setConflictData] = useState<{ message: string; latest?: FlowerProduct } | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Numeric price
  const numericPrice = useMemo(() => {
    const clean = priceString.replace(/\D/g, '');
    const parsed = parseInt(clean, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [priceString]);

  // Dirty state tracking (B2)
  const isDirty = useMemo(() => {
    if (!product) {
      return Boolean(name.trim() || priceString || description.trim() || stemsNote.trim() || newUploadedDataUri);
    }
    return (
      name !== product.name ||
      numericPrice !== product.price ||
      primaryCategory !== product.primaryCategory ||
      secondaryCategories.sort().join('|') !==
        product.categories.filter((c) => c !== product.primaryCategory).sort().join('|') ||
      description !== (product.description ?? '') ||
      stemsNote !== (product.stemsNote ?? '') ||
      isVisible !== product.isVisible ||
      Boolean(newUploadedDataUri)
    );
  }, [product, name, numericPrice, primaryCategory, secondaryCategories, description, stemsNote, isVisible, newUploadedDataUri, priceString]);

  // Warn on browser/tab close if dirty
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

  const handleSelectFile = async (file: File | undefined) => {
    if (!file) return;
    setPreparingImage(true);
    setError('');
    try {
      const dataUri = await prepareProductImage(file);
      setNewUploadedDataUri(dataUri);
      setPreviewImage(dataUri);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'Error'
          ? cause.message
          : 'Không đọc được ảnh này. Hãy chọn một tệp ảnh hợp lệ (JPG, PNG hoặc WebP).'
      );
    } finally {
      setPreparingImage(false);
    }
  };

  const toggleSecondaryCategory = (catName: string) => {
    setSecondaryCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleRequestCancel = () => {
    if (isDirty) {
      setConfirmCancelOpen(true);
    } else {
      onCancel();
    }
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || preparingImage) return;

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Tên mẫu hoa cần có từ 2 đến 100 ký tự.');
      return;
    }
    if (!Number.isSafeInteger(numericPrice) || numericPrice <= 0) {
      setError('Giá bán phải là số nguyên dương hợp lệ.');
      return;
    }
    if (!isEdit && !newUploadedDataUri) {
      setError('Vui lòng tải lên ảnh chụp thật cho mẫu hoa.');
      return;
    }

    setBusy(true);
    setError('');
    setConflictData(null);

    const allCategories = [
      primaryCategory,
      ...secondaryCategories.filter((c) => c !== primaryCategory),
    ];

    try {
      if (isEdit && product) {
        // PATCH with optimistic locking version (A1) & preserved fields (A2)
        const payload: Record<string, unknown> = {
          expectedVersion: product.version ?? 1,
          name: trimmedName,
          price: numericPrice,
          primaryCategory,
          categories: allCategories,
          description: description.trim(),
          stemsNote: stemsNote.trim() || undefined,
          isVisible,
          isFeatured: product.isFeatured ?? false,
          sortOrder: product.sortOrder ?? 0,
        };

        if (newUploadedDataUri) {
          payload.image = newUploadedDataUri;
        }

        const res = await fetch(`${productsApiUrl}/${encodeURIComponent(product.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 409) {
          const conflictRes = await res.json().catch(() => null);
          setConflictData({
            message:
              conflictRes?.error ||
              'Mẫu hoa vừa được cập nhật ở thiết bị hoặc tab khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu.',
            latest: conflictRes?.latest,
          });
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || 'Chưa lưu được thay đổi mẫu hoa.');
        }

        const saved: FlowerProduct = await res.json();
        onSaved(saved, false);
      } else {
        // POST with Idempotency-Key (A3)
        const payload = {
          name: trimmedName,
          price: numericPrice,
          primaryCategory,
          categories: allCategories,
          image: newUploadedDataUri,
          description: description.trim(),
          stemsNote: stemsNote.trim() || undefined,
          isVisible,
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (idempotencyKey) {
          headers['Idempotency-Key'] = idempotencyKey;
        }

        const res = await fetch(productsApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || 'Chưa thêm được mẫu hoa mới.');
        }

        const created: FlowerProduct = await res.json();
        onSaved(created, true);
      }
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message && cause.name !== 'TypeError'
          ? cause.message
          : 'Chưa thể lưu mẫu hoa. Vui lòng thử lại.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleApplyLatest = () => {
    if (conflictData?.latest) {
      const latest = conflictData.latest;
      setName(latest.name);
      setPriceString(String(latest.price));
      setPrimaryCategory(latest.primaryCategory);
      setSecondaryCategories(latest.categories.filter((c) => c !== latest.primaryCategory));
      setDescription(latest.description ?? '');
      setStemsNote(latest.stemsNote ?? '');
      setIsVisible(latest.isVisible);
      setPreviewImage(latest.images[0] ?? '');
      setNewUploadedDataUri(null);
      setConflictData(null);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-ivory pb-20">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <button
            type="button"
            onClick={handleRequestCancel}
            className="inline-flex items-center gap-2 min-h-11 px-3 -ml-3 rounded-xl text-sm font-medium text-charcoal hover:bg-cream transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-forest" />
            <span>Quay lại danh sách</span>
          </button>
          <span className="text-xs text-stone font-medium">
            {isEdit ? `Mã ${product?.code}` : 'Thêm mẫu hoa mới'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[980px] px-4 pt-6 sm:px-8 sm:pt-8 space-y-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal">
            {isEdit ? 'Chỉnh sửa mẫu hoa' : 'Thêm mẫu hoa mới'}
          </h1>
          <p className="text-sm text-stone mt-1">
            Điền các thông tin và tải ảnh chụp thực tế tại tiệm.
          </p>
        </div>

        {/* Optimistic locking conflict banner (A1) */}
        {conflictData && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-danger bg-danger-soft/60 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-danger shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-charcoal text-base">Xung đột dữ liệu</h3>
                <p className="text-sm text-charcoal leading-relaxed">{conflictData.message}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApplyLatest}
                leftIcon={<RefreshCw className="size-3.5" />}
              >
                Tải lại bản mới nhất
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancel}
              >
                Về danh sách
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          {/* Image Upload Section */}
          <section
            aria-label="Ảnh mẫu hoa"
            className="rounded-2xl border border-line bg-paper p-5 space-y-4 shadow-sm"
          >
            <h2 className="font-semibold text-charcoal text-base">
              Ảnh chụp mẫu <span className="text-danger">*</span>
            </h2>

            <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden border border-line bg-cream flex items-center justify-center">
              {previewImage ? (
                <img
                  src={adminImageUrl(previewImage)}
                  alt="Xem trước ảnh mẫu hoa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4 text-stone text-xs">
                  <ImagePlus className="size-8 mx-auto text-sage mb-2" />
                  <span>Chưa có ảnh</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy || preparingImage}
              className="sr-only"
              id="live-flower-image-upload"
              onChange={(e) => {
                void handleSelectFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              disabled={busy || preparingImage}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<ImagePlus className="size-4 text-forest" />}
            >
              {isEdit ? 'Chọn ảnh khác' : 'Tải ảnh từ thiết bị'}
            </Button>

            <p className="text-xs text-stone leading-relaxed text-center">
              {preparingImage
                ? 'Đang nén và tối ưu WebP…'
                : 'Định dạng JPG, PNG hoặc WebP. Hệ thống sẽ tự động tối ưu hóa hiển thị nhanh.'}
            </p>
          </section>

          {/* Product Details Section */}
          <section
            aria-label="Thông tin chi tiết"
            className="rounded-2xl border border-line bg-paper p-5 sm:p-6 space-y-5 shadow-sm"
          >
            <InputField
              label="Tên mẫu hoa *"
              placeholder="Ví dụ: Bó Hồng Phấn Dịu Dàng"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy || preparingImage}
              required
            />

            <InputField
              label="Giá bán (VNĐ) *"
              inputMode="numeric"
              placeholder="Ví dụ: 350000"
              value={priceString}
              onChange={(e) => setPriceString(e.target.value.replace(/\D/g, '').slice(0, 9))}
              helperText={
                numericPrice > 0
                  ? `Hiển thị trên menu: ${formatVND(numericPrice)}`
                  : 'Nhập số tiền VNĐ'
              }
              disabled={busy || preparingImage}
              required
            />

            {/* Primary Category Select */}
            <div className="space-y-1.5">
              <label htmlFor="primary-cat-select" className="text-sm font-medium text-charcoal block">
                Danh mục chính *
              </label>
              <select
                id="primary-cat-select"
                value={primaryCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrimaryCategory(val);
                  setSecondaryCategories((prev) => prev.filter((c) => c !== val));
                }}
                disabled={busy || preparingImage}
                className="w-full min-h-[46px] rounded-xl bg-paper border border-line-strong px-3.5 py-2.5 text-[15px] text-charcoal focus:outline-none focus:border-forest"
              >
                {availableCategoryNames.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Categories Checkboxes (A2) */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-stone block">
                Phân loại thêm (hiển thị khi lọc theo mục khác):
              </span>
              <div className="flex flex-wrap gap-2">
                {availableCategoryNames
                  .filter((cat) => cat !== primaryCategory)
                  .map((cat) => {
                    const checked = secondaryCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={checked}
                        disabled={busy || preparingImage}
                        onClick={() => toggleSecondaryCategory(cat)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${
                          checked
                            ? 'bg-forest-soft text-forest border-forest/35'
                            : 'bg-ivory/80 text-stone border-line hover:text-charcoal'
                        }`}
                      >
                        {checked && <Check className="size-3.5" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <TextareaField
              label="Mô tả mẫu hoa"
              hint="Không bắt buộc"
              rows={2}
              placeholder="Ví dụ: Tone hồng phấn nhẹ nhàng, phù hợp tặng sinh nhật, kỷ niệm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy || preparingImage}
            />

            <InputField
              label="Thành phần hoa chính"
              hint="Không bắt buộc"
              placeholder="Ví dụ: Hồng phấn Đà Lạt, cát tường, cúc tana"
              value={stemsNote}
              onChange={(e) => setStemsNote(e.target.value)}
              disabled={busy || preparingImage}
            />

            {/* Visibility Toggle */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="visibility-select" className="text-sm font-medium text-charcoal block">
                Trạng thái hiển thị trên menu QR
              </label>
              <select
                id="visibility-select"
                value={isVisible ? 'visible' : 'hidden'}
                onChange={(e) => setIsVisible(e.target.value === 'visible')}
                disabled={busy || preparingImage}
                className="w-full min-h-[46px] rounded-xl bg-paper border border-line-strong px-3.5 py-2.5 text-[15px] text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="visible">Hiển thị cho khách xem</option>
                <option value="hidden">Lưu ở trạng thái ẩn (chưa hiện)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || preparingImage}
                onClick={handleRequestCancel}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={preparingImage}
                isLoading={busy}
                leftIcon={<Check className="size-4" />}
              >
                {isEdit ? 'Lưu thay đổi' : 'Thêm mẫu hoa'}
              </Button>
            </div>
          </section>
        </form>
      </main>

      {/* Unsaved Changes Confirmation Modal */}
      <DialogModal
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        title="Hủy thay đổi chưa lưu?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone leading-relaxed">
            Bạn có các chỉnh sửa chưa được lưu cho mẫu hoa này. Bạn có muốn tiếp tục chỉnh sửa hay hủy bỏ thay đổi?
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmCancelOpen(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-danger text-ivory border-danger hover:bg-danger/90"
              onClick={() => {
                setConfirmCancelOpen(false);
                onCancel();
              }}
            >
              Hủy thay đổi
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
