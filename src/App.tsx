import { useEffect, useRef, useState } from 'react';
import type { AppScreen, FilterCategory, FlowerProduct } from './types/flower';
import { INITIAL_FLOWERS } from './data/mockFlowers';
import { CustomerHeader } from './components/CustomerHeader';
import { CustomerFooter } from './components/CustomerFooter';
import { CatalogScreen } from './components/CatalogScreen';
import { ProductDetailScreen } from './components/ProductDetailScreen';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { AdminDashboardScreen } from './components/AdminDashboardScreen';
import { AdminFlowerFormScreen } from './components/AdminFlowerFormScreen';
import { DesignSystemScreen } from './components/DesignSystemScreen';
import { Toast } from './components/ui/Primitives';

function screenFor(path: string, signedIn: boolean): AppScreen {
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!signedIn) return 'admin-login';
    return path === '/admin' ? 'admin-dashboard' : 'admin-form';
  }
  if (path.startsWith('/flowers/')) return 'detail';
  if (path === '/design-system') return 'design-system';
  return 'catalog';
}

const paths: Record<AppScreen, string> = {
  catalog: '/',
  'admin-login': '/admin',
  'admin-dashboard': '/admin',
  'admin-form': '/admin/flowers/new',
  'design-system': '/design-system',
  detail: '/',
};

export default function App() {
  const useDatabase = import.meta.env.PROD;
  const [products, setProducts] = useState<FlowerProduct[]>(useDatabase ? [] : INITIAL_FLOWERS);
  const [catalogStatus, setCatalogStatus] = useState(useDatabase ? 'loading' : 'ready');
  const [retryCount, setRetryCount] = useState(0);
  const [path, setPath] = useState(window.location.pathname);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Customer browsing state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('Tất cả');

  // Admin management state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminBanner, setAdminBanner] = useState<string | null>(null);

  // Subtle toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const screen = screenFor(path, isAdminAuthenticated);

  useEffect(() => {
    if (!useDatabase) return;
    const controller = new AbortController();
    fetch('/api/public/products', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Không tải được danh mục');
        return response.json();
      })
      .then((items: FlowerProduct[]) => {
        if (controller.signal.aborted) return;
        setProducts(items);
        setCatalogStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogStatus('error');
      });
    return () => controller.abort();
  }, [useDatabase, retryCount]);

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
    if (window.location.pathname !== nextPath) window.history.pushState(null, '', nextPath);
    setPath(nextPath);
    window.scrollTo(0, 0);
  };
  const navigateTo = (nextScreen: AppScreen) => go(paths[nextScreen]);
  const openContact = () => {
    const contact = document.getElementById('lien-he');
    contact?.focus({ preventScroll: true });
    contact?.scrollIntoView();
  };

  const handleSelectProduct = (product: FlowerProduct) => {
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
    showToast(
      nextVisible ? `Đã bật hiển thị: ${label}` : `Đã tạm ẩn: ${label}`
    );
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
      setAdminBanner(
        `Đã lưu thay đổi cho mẫu hoa "${data.name}" (${data.code}).`
      );
      showToast(`Đã cập nhật ${data.code}`);
    } else {
      const newProduct: FlowerProduct = {
        ...data,
        id: `fl-${Date.now()}`,
        updatedAt: 'Vừa xong',
      };
      setProducts((prev) => [newProduct, ...prev]);
      setAdminBanner(
        `Đã thêm mẫu hoa mới "${data.name}" (${data.code}) vào danh mục tiệm.`
      );
      showToast(`Đã thêm mẫu mới ${data.code}`);
    }

    navigateTo('admin-dashboard');
  };

  const selectedProduct = products.find((p) => p.isVisible && `/flowers/${p.code}`.toLowerCase() === path.toLowerCase());
  const editingProduct = products.find((p) => path === `/admin/flowers/${p.id}/edit`) ?? null;

  const isCustomerLayout =
    screen === 'catalog' || screen === 'detail' || screen === 'design-system';
  const waitingForCatalog = isCustomerLayout && catalogStatus !== 'ready';
  const adminUnavailable = useDatabase && !isCustomerLayout;

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-charcoal">
      {isCustomerLayout && (
        <CustomerHeader
          currentScreen={screen}
          isAdminAuthenticated={isAdminAuthenticated}
          onNavigate={navigateTo}
          onOpenZalo={openContact}
        />
      )}

      <div className="flex-1">
        {!isOnline && (
          <p role="status" className="px-4 py-2 text-center bg-white">
            Bạn đang ngoại tuyến. Bạn vẫn có thể xem dữ liệu mẫu đã tải.
          </p>
        )}
        {waitingForCatalog && (
          <main className="mx-auto max-w-xl px-4 py-16 text-center">
            <p role="status">{catalogStatus === 'loading' ? 'Đang tải danh mục hoa…' : 'Chưa tải được danh mục hoa.'}</p>
            {catalogStatus === 'error' && (
              <button type="button" className="mt-4 min-h-11 underline" onClick={() => {
                setCatalogStatus('loading');
                setRetryCount((count) => count + 1);
              }}>Thử lại</button>
            )}
          </main>
        )}
        {adminUnavailable && (
          <main className="mx-auto max-w-xl px-4 py-16 text-center">
            <h1 className="text-2xl font-semibold">Khu quản trị đang được chuẩn bị</h1>
            <a href="/" className="mt-4 inline-flex min-h-11 items-center underline">Quay về danh mục</a>
          </main>
        )}
        {!waitingForCatalog && screen === 'catalog' && (
          <CatalogScreen
            products={products}
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
            onBack={() => navigateTo('catalog')}
            onSelectProduct={handleSelectProduct}
            onCopiedCode={(code) => showToast(`Đã sao chép mã mẫu ${code}`)}
            onOpenZalo={openContact}
          />
        )}
        {!waitingForCatalog && screen === 'detail' && !selectedProduct && (
          <main className="mx-auto max-w-xl px-4 py-16 text-center">
            <h1 className="text-2xl font-semibold">Mẫu hoa hiện không hiển thị</h1>
            <a href="/" onClick={(event) => { event.preventDefault(); navigateTo('catalog'); }} className="mt-4 inline-flex min-h-11 items-center underline">Quay về danh mục</a>
          </main>
        )}

        {!waitingForCatalog && screen === 'design-system' && (
          <DesignSystemScreen
            sampleProduct={products[0] ?? INITIAL_FLOWERS[0]}
            onNavigate={navigateTo}
            onOpenSampleDetail={() => handleSelectProduct(products.find((product) => product.isVisible) ?? INITIAL_FLOWERS[0])}
            onOpenAdminAdd={() => navigateTo('admin-form')}
          />
        )}

        {!adminUnavailable && screen === 'admin-login' && (
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

        {screen === 'admin-form' && (editingProduct || path === paths['admin-form']) && (
          <AdminFlowerFormScreen
            key={path}
            editingProduct={editingProduct}
            existingProducts={products}
            onSave={handleSaveFlower}
            onCancel={() => navigateTo('admin-dashboard')}
          />
        )}
        {screen === 'admin-form' && !editingProduct && path !== paths['admin-form'] && (
          <main className="mx-auto max-w-xl px-4 py-16 text-center">
            <h1 className="text-2xl font-semibold">Không tìm thấy mẫu hoa</h1>
            <button type="button" onClick={() => navigateTo('admin-dashboard')} className="mt-4 min-h-11 underline">Về trang quản lý</button>
          </main>
        )}
      </div>

      {isCustomerLayout && (
        <CustomerFooter
          isAdminAuthenticated={isAdminAuthenticated}
          onNavigate={navigateTo}
        />
      )}

      <Toast message={toastMessage} visible={Boolean(toastMessage)} />
    </div>
  );
}
