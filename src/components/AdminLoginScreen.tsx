import { LockKeyhole } from 'lucide-react';
import { Button } from './ui/Primitives';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  onBackToCatalog: () => void;
}

export function AdminLoginScreen({ onLoginSuccess, onBackToCatalog }: AdminLoginScreenProps) {
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-20">
      <section className="space-y-5 rounded-2xl border border-line bg-paper p-6">
        <LockKeyhole aria-hidden="true" className="size-6 text-forest" />
        <h1 className="font-serif text-3xl font-semibold">Quản trị thử nghiệm</h1>
        <p className="text-stone">Bạn có thể thử thêm, sửa và ẩn mẫu hoa. Thay đổi chỉ có trong phiên này.</p>
        <Button type="button" fullWidth onClick={onLoginSuccess}>Mở bản quản trị demo</Button>
        <Button type="button" variant="ghost" fullWidth onClick={onBackToCatalog}>Quay về danh mục</Button>
      </section>
    </main>
  );
}
