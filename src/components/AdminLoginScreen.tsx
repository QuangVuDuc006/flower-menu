import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { SHOP_INFO } from '../data/mockFlowers';
import {
  BotanicalEmblem,
  Button,
  FeedbackBanner,
  InputField,
} from './ui/Primitives';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  onBackToCatalog: () => void;
}

export function AdminLoginScreen({
  onLoginSuccess,
  onBackToCatalog,
}: AdminLoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const handleFillDemo = () => {
    setUsername('chutiem');
    setPassword('tiemhoa123');
    setFieldErrors({});
    setAuthError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAuthError(null);

    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Vui lòng nhập tên đăng nhập hoặc số điện thoại chủ tiệm.';
    }
    if (!password.trim()) {
      errors.password = 'Vui lòng nhập mật khẩu quản lý.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    window.setTimeout(() => {
      const normalizedUser = username.trim().toLowerCase().replace(/\s+/g, '');
      const validUser =
        normalizedUser === 'chutiem' ||
        normalizedUser === 'admin' ||
        normalizedUser === '0909384621';
      const validPass = password === 'tiemhoa123' || password === '123456';

      setIsSubmitting(false);
      if (validUser && validPass) {
        onLoginSuccess();
      } else {
        setAuthError(
          'Thông tin đăng nhập chưa đúng. Bạn vui lòng kiểm tra lại hoặc nhấn "Điền tài khoản mẫu" bên dưới.'
        );
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col justify-between px-4 py-6 sm:py-10">
      <div className="max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-xl text-sm font-medium text-stone hover:text-charcoal hover:bg-cream transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay về danh mục khách xem</span>
        </button>
      </div>

      <main className="max-w-md w-full mx-auto my-6">
        <div className="rounded-2xl bg-paper border border-line p-6 sm:p-8 shadow-[0_14px_38px_-16px_rgba(48,54,49,0.12)]">
          <div className="flex flex-col items-center text-center pb-6 border-b border-line">
            <BotanicalEmblem className="w-11 h-11 mb-3" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cream text-xs font-medium text-stone mb-2">
              <LockKeyhole className="w-3 h-3 text-forest" />
              Khu vực dành riêng cho chủ tiệm
            </span>
            <h1 className="font-serif text-3xl font-semibold text-charcoal">
              Đăng nhập {SHOP_INFO.name}
            </h1>
            <p className="text-sm text-stone mt-1.5 leading-relaxed">
              Đăng nhập để thêm mẫu hoa mới, cập nhật giá bán hoặc ẩn/hiện mẫu hoa trên menu.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="pt-6 space-y-4">
            {authError && (
              <FeedbackBanner
                variant="error"
                message={authError}
                onDismiss={() => setAuthError(null)}
              />
            )}

            <InputField
              label="Tên đăng nhập hoặc số điện thoại"
              placeholder="Ví dụ: chutiem hoặc 0909384621"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              error={fieldErrors.username}
            />

            <InputField
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu quản lý"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={fieldErrors.password}
              trailingElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="min-w-[40px] min-h-[40px] rounded-lg inline-flex items-center justify-center text-stone hover:text-charcoal hover:bg-cream transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
              >
                Đăng nhập quản lý
              </Button>
            </div>
          </form>

          {/* Reassuring Demo Helper for Prototype Reviewers */}
          <div className="mt-6 pt-5 border-t border-line rounded-xl bg-cream/60 px-4 py-3.5 text-xs text-stone space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-charcoal inline-flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-forest" />
                Tài khoản thử nghiệm
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="min-h-[34px] px-2.5 rounded-lg bg-paper border border-line-strong text-forest font-medium hover:border-forest transition-colors"
              >
                Điền tài khoản mẫu
              </button>
            </div>
            <p>
              Tên đăng nhập: <code className="font-semibold text-charcoal">chutiem</code> · Mật khẩu:{' '}
              <code className="font-semibold text-charcoal">tiemhoa123</code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-stone mt-5">
          Khách xem hoa không cần đăng nhập tài khoản.
        </p>
      </main>

      <div className="h-4" aria-hidden="true" />
    </div>
  );
}
