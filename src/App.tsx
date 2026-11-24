import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { AppScreen, CategoryItem, FilterCategory, FlowerProduct, ShopSettings } from './types/flower';
import { INITIAL_FLOWERS } from './data/mockFlowers';
import { DEFAULT_SHOP_SETTINGS } from './config/shop';
import { CustomerHeader } from './components/CustomerHeader';
import { CustomerFooter } from './components/CustomerFooter';
import { CatalogScreen } from './components/CatalogScreen';
import { ProductDetailScreen } from './components/ProductDetailScreen';
import { Toast } from './components/ui/Primitives';
import { LiveAdmin } from './components/LiveAdmin';

import { AdminDashboardScreen } from './components/AdminDashboardScreen';

// Only load demo and prototyping screens in development mode
const AdminLoginScreen = import.meta.env.DEV
  ? lazy(() =>
      import('./components/AdminLoginScreen').then((m) => ({ default: m.AdminLoginScreen }))
    )
  : null;
const AdminFlowerFormScreen = import.meta.env.DEV
  ? lazy(() =>
      import('./components/AdminFlowerFormScreen').then((m) => ({ default: m.AdminFlowerFormScreen }))
    )
  : null;
const DesignSystemScreen = import.meta.env.DEV
  ? lazy(() =>
      import('./components/DesignSystemScreen').then((m) => ({ default: m.DesignSystemScreen }))
    )
  : null;

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

function screenFor(path: string, signedIn: boolean, isProd: boolean): AppScreen {
  if (isAdminPath(path)) {
    if (!signedIn) return 'admin-login';
    return path === '/admin' ? 'admin-dashboard' : 'admin-form';
  }
  if (path.startsWith('/flowers/')) return 'detail';
  if (path === '/design-system') {
    return isProd ? 'catalog' : 'design-system';
  }
  return 'catalog';
}

const paths: Record<AppScreen, string> = {
  catalog: '/',
  'admin-login': '/admin',
  'admin-dashboard': '/admin',
  'admin-form': '/admin/flowers/new',
  'design-system': '/design-system',
  detail: '/',
  'admin-categories': '/admin/categories',
  'admin-settings': '/admin/settings',
};

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (import.meta.env.PROD && isAdminPath(pathname)) {
    return <LiveAdmin />;
  }

  return <CatalogApp />;
}

function CatalogApp() {
  const useDatabase = import.meta.env.PROD;
  const [products, setProducts] = useState<FlowerProduct[]>(() =>
    import.meta.env.PROD ? [] : INITIAL_FLOWERS
  );
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>(
    useDatabase ? 'loading' : 'ready'
  );
  const [retryCount, setRetryCount] = useState(0);
  const [path, setPath] = useState(window.location.pathname);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Customer browsing state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('Tất cả');

  // Deep linked product state if direct load or not in initial list
  const [deepLinkProduct, setDeepLinkProduct] = useState<FlowerProduct | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);

  // Focus management tracker (A5)
  const lastProductCodeRef = useRef<string | null>(null);

  // Admin management state (demo mode)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminBanner, setAdminBanner] = useState<string | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const screen = screenFor(path, isAdminAuthenticated, useDatabase);

  // Load products, categories, and settings in parallel for public catalog (import.meta.env.PROD)
  useEffect(() => {
    if (!useDatabase) return;
    const controller = new AbortController();
    const signal = controller.signal;

    setCatalogStatus('loading');
    Promise.all([
      fetch('/api/public/products', { signal }).then((res) => {
        if (!res.ok) throw new Error('Không tải được danh mục');
        return res.json() as Promise<FlowerProduct[]>;
      }),
      fetch('/api/public/categories', { signal })
        .then((res) => (res.ok ? (res.json() as Promise<CategoryItem[]>) : []))
        .catch(() => []),
      fetch('/api/public/settings', { signal })
        .then((res) => (res.ok ? (res.json() as Promise<ShopSettings>) : DEFAULT_SHOP_SETTINGS))
        .catch(() => DEFAULT_SHOP_SETTINGS),
    ])
      .then(([prods, cats, sets]) => {
        if (signal.aborted) return;
        setProducts(prods);
        if (cats.length > 0) setCategories(cats);
        setSettings(sets);
        setCatalogStatus('ready');
      })
      .catch(() => {
        if (!signal.aborted) setCatalogStatus('error');
      });

    return () => controller.abort();
  }, [useDatabase, retryCount]);

  // Deep linking: fetch /api/public/products/:code if not in products list
  useEffect(() => {
    if (!useDatabase || !path.startsWith('/flowers/')) {
      setDeepLinkProduct(null);
      return;
    }

    const code = path.slice('/flowers/'.length).trim().toLowerCase();
    if (!code) return;

    const existing = products.find((p) => p.isVisible && p.code.toLowerCase() === code);
    if (existing) {
      setDeepLinkProduct(existing);
      return;
    }

    // Direct deep-link load or unlisted in memory
    const controller = new AbortController();
    setDeepLinkLoading(true);

    fetch(`/api/public/products/${encodeURIComponent(code)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Mẫu hoa không tồn tại');
        return res.json() as Promise<FlowerProduct>;
      })
      .then((item) => {
        if (controller.signal.aborted) return;
        if (item && item.isVisible) {
          setDeepLinkProduct(item);
        } else {
          setDeepLinkProduct(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDeepLinkProduct(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDeepLinkLoading(false);
      });

    return () => controller.abort();
  }, [useDatabase, path, products]);

  // Focus management: when returning from detail to catalog, focus last product card or welcome heading (A5)
  useEffect(() => {
    if (screen === 'catalog' && lastProductCodeRef.current) {
      const targetCode = lastProductCodeRef.current;
      lastProductCodeRef.current = null;
      requestAnimationFrame(() => {
        const targetBtn = document.querySelector<HTMLButtonElement>(
          `button[data-product-code="${targetCode}"]`
        );
        if (targetBtn) {
          targetBtn.focus({ preventScroll: false });
        } else {
          const welcomeHeading = document.getElementById('welcome-heading');
          welcomeHeading?.focus({ preventScroll: true });
        }
      });
    }
  }, [screen]);

  // Sync navigation events and online status
  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('popstate', updatePath);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const go = (nextPath: string) => {
    if (useDatabase && isAdminPath(nextPath)) {
      window.location.assign(nextPath);
      return;
    }
    if (window.location.pathname !== nextPath) window.history.pushState(null, '', nextPath);
    setPath(nextPath);
    window.scrollTo(0, 0);
  };

  const navigateTo = (nextScreen: AppScreen) => go(paths[nextScreen]);

  const openContact = () => {
    const contact = document.getElementById('lien-he');
    contact?.focus({ preventScroll: true });
    contact?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectProduct = (product: FlowerProduct) => {
    lastProductCodeRef.current = product.code;
    go(`/flowers/${product.code}`);
  };

  const handleToggleVisibility = (productId: string) => {
    const target = products.find((item) => item.id === productId);
    if (!target) return;

    const nextVisible = !target.isVisible;
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;
        return {
          ...item,
          isVisible: nextVisible,
          updatedAt: 'Vừa xong',
        };
      })
    );

    const label = `${target.name} (${target.code})`;
    showToast(nextVisible ? `Đã bật hiển thị: ${label}` : `Đã tạm ẩn: ${label}`);
  };

  const handleToggleFeatured = (productId: string) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, isFeatured: !item.isFeatured } : item
      )
    );
  };

  const handleMoveOrder = (productId: string, direction: 'up' | 'down') => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === productId);
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleSaveFlower = (
    data: Omit<FlowerProduct, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? { ...data, id: existingId, updatedAt: 'Vừa xong' }
            : item
        )
      );
      setAdminBanner(`Đã lưu thay đổi cho mẫu hoa "${data.name}" (${data.code}).`);
      showToast(`Đã cập nhật ${data.code}`);
    } else {
      const newProduct: FlowerProduct = {
        ...data,
        id: `fl-${Date.now()}`,
        updatedAt: 'Vừa xong',
      };
      setProducts((prev) => [newProduct, ...prev]);
      setAdminBanner(`Đã thêm mẫu hoa mới "${data.name}" (${data.code}) vào danh mục tiệm.`);
      showToast(`Đã thêm mẫu mới ${data.code}`);
    }

    navigateTo('admin-dashboard');
  };

  // Find selected product for detail view
  const selectedProduct =
    deepLinkProduct ||
    products.find((p) => p.isVisible && `/flowers/${p.code}`.toLowerCase() === path.toLowerCase());

  const editingProduct = products.find((p) => path === `/admin/flowers/${p.id}/edit`) ?? null;
  const isCustomerLayout = screen === 'catalog' || screen === 'detail' || screen === 'design-system';
  const waitingForCatalog = isCustomerLayout && catalogStatus !== 'ready';

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-charcoal">
      {/* Skip-to-content accessibility link (A5) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-forest focus:text-ivory focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-forest/50 text-sm font-medium"
      >
        Chuyển đến nội dung chính
      </a>

      {isCustomerLayout && (
        <CustomerHeader
          currentScreen={screen}
          settings={settings}
          showDevTools={!useDatabase}
          isAdminAuthenticated={isAdminAuthenticated}
          onNavigate={navigateTo}
          onOpenZalo={openContact}
        />
      )}

      <div className="flex-1">
        {!isOnline && (
          <p role="status" className="px-4 py-2 text-center text-xs bg-cream border-b border-line text-stone">
            Bạn đang ngoại tuyến. Bạn vẫn có thể xem các mẫu hoa đã tải trong bộ nhớ đệm.
          </p>
        )}

        {waitingForCatalog && (
          <main id="main-content" tabIndex={-1} className="mx-auto max-w-xl px-4 py-16 text-center outline-none">
            <p role="status" className="text-sm text-stone">
              {catalogStatus === 'loading' ? 'Đang tải danh mục hoa…' : 'Chưa tải được danh mục hoa.'}
            </p>
            {catalogStatus === 'error' && (
              <button
                type="button"
                className="mt-4 min-h-11 rounded-xl border border-line bg-paper px-4 text-xs font-medium text-forest hover:bg-cream"
                onClick={() => {
                  setCatalogStatus('loading');
                  setRetryCount((count) => count + 1);
                }}
              >
                Thử lại
              </button>
            )}
          </main>
        )}

        {!waitingForCatalog && screen === 'catalog' && (
          <CatalogScreen
            products={products}
            categories={categories}
            settings={settings}
            isDemoMode={!useDatabase}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {screen === 'detail' && selectedProduct && (
          <ProductDetailScreen
            product={selectedProduct}
            allProducts={products}
            settings={settings}
            isDemoMode={!useDatabase}
            onBack={() => {
              go('/');
            }}
            onSelectProduct={handleSelectProduct}
            onCopiedCode={(code) => showToast(`Đã sao chép mã mẫu ${code}`)}
            onSharedLink={(method) =>
              showToast(
                method === 'clipboard'
                  ? 'Đã sao chép đường dẫn mẫu hoa'
                  : 'Đã mở chia sẻ mẫu hoa'
              )
            }
            onOpenZalo={openContact}
          />
        )}

        {!waitingForCatalog && screen === 'detail' && !selectedProduct && !deepLinkLoading && (
          <main id="main-content" tabIndex={-1} className="mx-auto max-w-xl px-4 py-16 text-center outline-none">
            <h1 className="font-serif text-2xl font-semibold text-charcoal">
              Mẫu hoa hiện không hiển thị hoặc không tồn tại
            </h1>
            <p className="text-sm text-stone mt-2">
              Mẫu hoa này có thể đã được tiệm tạm ẩn hoặc mã liên kết không đúng.
            </p>
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateTo('catalog');
              }}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 text-sm font-medium text-ivory hover:bg-forest-hover transition-colors"
            >
              Quay về danh mục hoa
            </a>
          </main>
        )}

        {/* Demo-only screens wrapped in Suspense (excluded from production runtime) */}
        {!import.meta.env.PROD && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-stone">Đang tải…</div>}>
            {!waitingForCatalog && screen === 'design-system' && DesignSystemScreen && (
              <DesignSystemScreen
                sampleProduct={products[0] ?? INITIAL_FLOWERS[0]}
                onNavigate={navigateTo}
                onOpenSampleDetail={() =>
                  handleSelectProduct(products.find((product) => product.isVisible) ?? INITIAL_FLOWERS[0])
                }
                onOpenAdminAdd={() => navigateTo('admin-form')}
              />
            )}

            {screen === 'admin-login' && AdminLoginScreen && (
              <AdminLoginScreen
                onLoginSuccess={() => {
                  setIsAdminAuthenticated(true);
                  showToast('Chào mừng trở lại trang quản lý Tiệm Hoa');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBackToCatalog={() => navigateTo('catalog')}
              />
            )}

            {screen === 'admin-dashboard' && (
              <AdminDashboardScreen
                products={products}
                bannerMessage={adminBanner}
                onDismissBanner={() => setAdminBanner(null)}
                onAddProduct={() => navigateTo('admin-form')}
                onEditProduct={(product) => go(`/admin/flowers/${product.id}/edit`)}
                onToggleVisibility={handleToggleVisibility}
                onToggleFeatured={handleToggleFeatured}
                onMoveOrder={handleMoveOrder}
                onNavigate={navigateTo}
                onLogout={() => {
                  setIsAdminAuthenticated(false);
                  setAdminBanner(null);
                  navigateTo('catalog');
                  showToast('Đã đăng xuất khỏi trang quản lý');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {screen === 'admin-form' && AdminFlowerFormScreen && (editingProduct || path === paths['admin-form']) && (
              <AdminFlowerFormScreen
                key={path}
                editingProduct={editingProduct}
                existingProducts={products}
                categories={categories}
                onSave={handleSaveFlower}
                onCancel={() => navigateTo('admin-dashboard')}
              />
            )}

            {screen === 'admin-form' && !editingProduct && path !== paths['admin-form'] && (
              <main id="main-content" tabIndex={-1} className="mx-auto max-w-xl px-4 py-16 text-center outline-none">
                <h1 className="text-2xl font-semibold">Không tìm thấy mẫu hoa</h1>
                <button
                  type="button"
                  onClick={() => navigateTo('admin-dashboard')}
                  className="mt-4 min-h-11 underline"
                >
                  Về trang quản lý
                </button>
              </main>
            )}
          </Suspense>
        )}
      </div>

      {isCustomerLayout && (
        <CustomerFooter
          settings={settings}
          showDevTools={!useDatabase}
          isAdminAuthenticated={isAdminAuthenticated}
          onNavigate={navigateTo}
        />
      )}

      <Toast message={toastMessage} visible={Boolean(toastMessage)} />
    </div>
  );
}
