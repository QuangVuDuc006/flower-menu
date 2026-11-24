# Flower QR Menu (Menu Hoa Điện Tử Quét Mã QR)

> **Website danh mục hoa tươi trên di động, truy cập tức thì bằng mã QR đặt tại cửa hàng.**
> Khách hàng quét mã xem ảnh thật và giá niêm yết mà không cần cài app hay đăng ký tài khoản.

---

## 1. Tổng quan & Phạm vi dự án (Scope)

Dự án giải quyết bài toán tư vấn tại quầy cho tiệm hoa: thay vì tìm ảnh cũ trong điện thoại cá nhân hoặc để khách tìm mẫu trên mạng xã hội, cửa hàng đặt một standee mã QR tại quầy. Khách mở camera điện thoại quét mã là xem được toàn bộ mẫu hoa hiện có cùng mức giá rõ ràng.

### Phạm vi chức năng (In-Scope)
- **Danh mục mẫu hoa mobile-first:** Hiển thị lưới ảnh sắc nét, tên hoa, mã mẫu (VD: `LAN-001`), và giá tiền VNĐ rõ ràng.
- **Bộ lọc & Tìm kiếm:** Lọc theo danh mục linh hoạt (Hoa bó, Hoa giỏ, Hoa sinh nhật...), tìm nhanh theo tên hoặc mã mẫu.
- **Chi tiết mẫu hoa:** Xem ảnh lớn, mô tả, sao chép mã mẫu để đưa nhân viên cắm hoa theo đúng yêu cầu.
- **Liên hệ Zalo tại chân trang:** Nút liên hệ mở trực tiếp Zalo của tiệm để khách gửi mã mẫu cần tư vấn.
- **Trang quản trị cho chủ tiệm trên điện thoại (`/admin`):**
  - Đăng nhập bảo mật qua mã xác thực gửi về Email (Cloudflare Zero Trust Access).
  - Tải ảnh chụp trực tiếp từ camera/thư viện điện thoại (tự động chuyển đổi tối ưu sang WebP).
  - Cập nhật giá, đổi ảnh, ghim mẫu nổi bật, ẩn/hiện mẫu hoa khi hết hoa.
  - Quản lý danh mục và thông tin tiệm (giờ mở cửa, địa chỉ, link Zalo).

### Những gì KHÔNG thuộc phạm vi (Out-of-Scope)
Dự án là **menu số tra cứu mẫu hoa tại quầy**, **KHÔNG PHẢI sàn thương mại điện tử**:
- ❌ Không có giỏ hàng, đặt hàng trực tuyến, thanh toán online (VNPAY/Momo).
- ❌ Không có tài khoản khách hàng, tích điểm hay đăng nhập người mua.
- ❌ Không có chatbot AI hay hệ thống quản lý tồn kho/vận chuyển phức tạp.

---

## 2. Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ | Lý do lựa chọn |
|---|---|---|
| **Giao diện (Frontend)** | React 19 + TypeScript + Vite | Hiệu năng cao, tải trang tức thì trên di động, trải nghiệm mượt mà. |
| **Giao diện & Styling** | Tailwind CSS v4 | Thiết kế tối giản, bảng màu nhẹ nhàng (`#355E4B`, `#FAF8F4`), chuẩn touch target 44px. |
| **Backend API** | Cloudflare Workers (Static Assets) | Serverless chạy tại biên (Edge), độ trễ cực thấp tại Việt Nam. |
| **Cơ sở dữ liệu** | Cloudflare D1 (SQLite) | Lưu trữ thông tin sản phẩm và dữ liệu ảnh WebP BLOB trong cùng 1 CSDL, 100% miễn phí cho shop nhỏ. |
| **Bảo mật Quản trị** | Cloudflare Zero Trust Access + `jose` (RS256) | Xác thực Email OTP tại edge, kiểm tra chữ ký số JWT ở Worker backend. |
| **Tạo mã QR** | `qrcode` (Node.js ES module CLI) | Xuất vector SVG sắc nét và PNG 1024x1024 chuẩn in ấn (Level H redundancy). |

---

## 3. Cài đặt & Chạy môi trường Local

### Yêu cầu môi trường
- **Node.js:** Phiên bản 20 LTS trở lên (`node -v`)
- **Trình quản lý gói:** `npm` đi kèm Node.js

### Các bước cài đặt
```powershell
# 1. Clone repository và cài đặt thư viện
git clone <repo-url>
cd Flower_Menu
npm install

# 2. Khởi tạo file cấu hình môi trường từ mẫu
cp .env.example .env
cp .dev.vars.example .dev.vars

# 3. Chạy migration tạo bảng CSDL cho môi trường local
npm run db:migrate:local

# 4. Khởi động giao diện phát triển (Vite Dev Server)
npm run dev
```

Mở trình duyệt truy cập:
- **Khách hàng:** `http://localhost:5173/`
- **Quản trị:** `http://localhost:5173/admin` (Ở môi trường local, giao diện tích hợp chế độ mô phỏng hoặc kết nối Worker).

---

## 4. Các lệnh NPM Scripts

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Khởi chạy Vite dev server phục vụ frontend. |
| `npm run build` | Biên dịch tối ưu hóa production bundle vào thư mục `dist/`. |
| `npm run preview` | Xem trước bản build production tại local. |
| `npm run lint` | Kiểm tra cú pháp và lỗi code nhanh chóng với `oxlint`. |
| `npm run typecheck` | Kiểm tra toàn bộ kiểu TypeScript (`tsc --noEmit`). |
| `npm test` / `npm run test:api` | Chạy bộ kiểm thử tự động API, WebP validator và kịch bản E2E. |
| `npm run db:migrate:local` | Áp dụng database migrations vào D1 local (`.wrangler/`). |
| `npm run db:migrate:remote` | Áp dụng database migrations vào Cloudflare D1 Production trên đám mây. |
| `npm run qr:generate` | Tạo mã QR chuẩn in ấn (SVG + PNG 1024px) trỏ về domain chính thức. |
| `npm run verify` | Chạy toàn bộ quy trình kiểm định chất lượng: Typecheck + Lint + Test + Build. |
| `npm run deploy` | Biên dịch giao diện và triển khai lên Cloudflare Workers. |

---

## 5. Quy trình Quản lý CSDL (Database Migrations)

Các tệp migration nằm trong thư mục `migrations/` và được thực thi theo thứ tự số:
1. `0001_products.sql`: Khởi tạo bảng `products` ban đầu (id, code, name, price, categories, images...).
2. `0002_product_images.sql`: Bổ sung cột `imageData BLOB` để lưu trữ ảnh WebP trực tiếp trong D1.
3. `0003_production_readiness.sql`: Bổ sung khóa lạc quan (`version`), chống trùng lặp (`idempotencyKey`), cờ nổi bật (`isFeatured`), thứ tự (`sortOrder`), bảng `categories` và bảng `site_settings`.

```powershell
# Áp dụng cho local
npm run db:migrate:local

# Áp dụng cho production trên Cloudflare
npm run db:migrate:remote
```

---

## 6. Sao lưu & Khôi phục dữ liệu (Backup & Disaster Recovery)

Dự án cung cấp script PowerShell tự động sao lưu toàn bộ cơ sở dữ liệu D1 (cả thông tin và dữ liệu ảnh nhị phân) thành 1 tệp `.sql`:

```powershell
# Sao lưu cơ sở dữ liệu Production đám mây
powershell -ExecutionPolicy Bypass -File scripts/backup-d1.ps1

# Sao lưu cơ sở dữ liệu Local
powershell -ExecutionPolicy Bypass -File scripts/backup-d1.ps1 -Local
```

Chi tiết hướng dẫn khôi phục và phục hồi dữ liệu xem tại [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## 7. Tài liệu hướng dẫn liên quan

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md): Hướng dẫn chi tiết triển khai lên Cloudflare, cấu hình Zero Trust Access, Domain và HTTPS.
- [SHOP_OWNER_GUIDE.md](SHOP_OWNER_GUIDE.md): Hướng dẫn sử dụng giao diện quản trị dành riêng cho chủ tiệm hoa bằng điện thoại (Tiếng Việt dễ hiểu).
- [docs/DECISIONS.md](docs/DECISIONS.md): Hồ sơ quyết định kiến trúc (ADRs: D1 BLOB image, Access RS256 JWT, Optimistic Locking, ETag cache).
- [docs/HANDOVER_CHECKLIST.md](docs/HANDOVER_CHECKLIST.md): Danh mục kiểm tra bàn giao khách hàng và nghiệm thu sản phẩm.
