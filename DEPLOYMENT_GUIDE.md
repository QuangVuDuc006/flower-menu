# Hướng dẫn Triển khai Production (Cloudflare Deployment Guide)

Tài liệu này hướng dẫn chi tiết cách thiết lập hạ tầng, triển khai mã nguồn, cấu hình bảo mật Cloudflare Zero Trust Access, tạo mã QR in ấn và vận hành sao lưu/khôi phục cho dự án **Flower QR Menu**.

---

## 1. Đánh giá Khả năng tương thích Gói Miễn phí (Free-Tier Compatibility)

Dự án được tối ưu hóa đặc biệt cho các cửa hàng hoa quy mô vừa và nhỏ với lưu lượng tham chiếu **dưới 100 khách ghé tiệm/ngày** (khoảng 20–100 mẫu hoa).

| Dịch vụ Cloudflare | Hạn mức gói Free (Miễn phí) | Mức sử dụng ước tính của Tiệm Hoa | Đánh giá |
|---|---|---|---|
| **Cloudflare Workers** | 100.000 requests/ngày | ~1.000 – 3.000 requests/ngày | Dư dả (>97% hạn mức còn trống) |
| **Cloudflare D1 (Database)** | 5.000.000 lượt đọc/ngày<br>100.000 lượt ghi/ngày<br>5 GB dung lượng lưu trữ | ~5.000 lượt đọc/ngày<br>< 50 lượt ghi/ngày<br>< 15 MB dung lượng cho 100 ảnh WebP | Dư dả (>99% hạn mức còn trống), **100% không phát sinh phí** |
| **Cloudflare Zero Trust Access** | Miễn phí cho 50 người dùng đầu tiên | 1 – 2 người dùng (Chủ tiệm + Quản lý) | Miễn phí trọn đời |
| **Băng thông & SSL/TLS** | Không giới hạn băng thông, chứng chỉ SSL miễn phí | Phục vụ hình ảnh và web tĩnh tức thì | Miễn phí |

> [!NOTE]
> Nhờ quyết định kiến trúc lưu trữ ảnh nén WebP (30–70 KB/ảnh) dạng BLOB trực tiếp trong D1, hệ thống **không cần kích hoạt Cloudflare R2**, loại bỏ hoàn toàn các rủi ro phát sinh chi phí lưu trữ thẻ tín dụng hay cấu hình S3 phức tạp.

---

## 2. Các bước Chuẩn bị & Cài đặt Ban đầu

### 2.1. Đăng nhập Cloudflare CLI (Wrangler)
Đảm bảo bạn đã cài đặt Node.js và đăng nhập vào tài khoản Cloudflare của cửa hàng:
```powershell
npx wrangler login
```
Trình duyệt sẽ mở ra để bạn cấp quyền cho Wrangler truy cập vào tài khoản Cloudflare.

---

## 3. Khởi tạo Cơ sở dữ liệu Cloudflare D1

### 3.1. Tạo CSDL trên Cloudflare
Chạy lệnh tạo database `flower-menu-prod`:
```powershell
npx wrangler d1 create flower-menu-prod
```
Wrangler sẽ xuất thông tin tương tự:
```text
[[d1_databases]]
binding = "DB"
database_name = "flower-menu-prod"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3.2. Cập nhật `wrangler.jsonc`
Mở tệp `wrangler.jsonc` và kiểm tra cấu hình binding khớp với `database_id` vừa tạo:
```jsonc
{
  "name": "flower-qr-menu",
  "main": "worker/index.js",
  "keep_vars": true,
  "compatibility_date": "2026-11-22",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "flower-menu-prod",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

### 3.3. Thực thi Database Migrations trên Production
Áp dụng toàn bộ lược đồ CSDL từ migration `0001` đến `0003`:
```powershell
npm run db:migrate:remote
```
Wrangler sẽ áp dụng:
1. `0001_products.sql`: Bảng sản phẩm cơ sở.
2. `0002_product_images.sql`: Cột `imageData BLOB` lưu ảnh WebP.
3. `0003_production_readiness.sql`: Bảng danh mục (`categories`), cài đặt (`site_settings`), khóa lạc quan (`version`), chống trùng lặp (`idempotencyKey`), và đánh chỉ mục tối ưu tìm kiếm.

---

## 4. Cấu hình Bảo vệ Quản trị bằng Cloudflare Zero Trust Access

Khu vực quản trị (`/admin`, `/admin/*`, `/api/admin/*`) được bảo vệ nghiêm ngặt bằng chính sách Email OTP tại tầng mạng (Cloudflare Edge) và xác thực chữ ký số RS256 JWT ở tầng Worker.

### 4.1. Thiết lập Ứng dụng Zero Trust (Zero Trust Dashboard)
1. Đăng nhập vào [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Chọn **Access** → **Applications** → Bấm **Add an application** → Chọn **Self-hosted**.
3. **Application Configuration:**
   - **Application name:** `Flower Menu Admin`
   - **Session Duration:** Chọn `1 month` (để chủ tiệm không phải nhận mã OTP quá thường xuyên trên điện thoại cá nhân).
   - **Application domain:** Nhập domain của shop (Ví dụ: `tiemhoa.vn`).
   - **Path:** Nhập `admin*` (để bảo vệ `/admin`, `/admin/*`).
   - Bấm **Add additional path**: Nhập domain và Path `api/admin*` (để bảo vệ toàn bộ API quản trị).
4. **Policy Configuration:**
   - **Policy name:** `Only Shop Owner Email`
   - **Action:** `Allow`
   - **Configure rules:**
     - **Selector:** `Emails`
     - **Value:** Điền địa chỉ email chính thức của chủ shop (Ví dụ: `chushop@gmail.com`).
5. Bấm **Next** cho đến khi hoàn tất và bấm **Save**.

### 4.2. Lấy thông tin xác thực
- **Team Subdomain (`ACCESS_TEAM`):** Xem tại mục **Settings** → **Custom Pages** hoặc URL đăng nhập Zero Trust (Ví dụ: `https://my-flower-shop.cloudflareaccess.com` thì team là `my-flower-shop`).
- **Application AUD (`ACCESS_ADMIN_AUD`):** Bấm vào ứng dụng `Flower Menu Admin` vừa tạo → Xem trường **Audience (AUD) tag** (chuỗi 64 ký tự hex).

---

## 5. Cấu hình Secrets và Biến Môi trường trên Worker

Để Worker kiểm tra chữ ký JWT một cách an toàn mà không lộ thông tin vào mã nguồn, cấu hình các secrets qua Wrangler:

```powershell
# 1. Tên Team Zero Trust
npx wrangler secret put ACCESS_TEAM
# Nhập giá trị: my-flower-shop

# 2. Mã Audience của ứng dụng Access
npx wrangler secret put ACCESS_ADMIN_AUD
# Nhập chuỗi AUD hex

# 3. Danh sách email được phép quản trị (hỗ trợ 1 email hoặc nhiều email phân tách bằng dấu phẩy)
npx wrangler secret put ADMIN_EMAIL
# Nhập: chushop@gmail.com
```

---

## 6. Cấu hình Tên miền Riêng (Custom Domain) & HTTPS

1. Trong [Cloudflare Dashboard](https://dash.cloudflare.com/), chọn **Workers & Pages** → Chọn Worker `flower-qr-menu`.
2. Chuyển sang tab **Settings** → **Domains & Routes** → Bấm **Add** → **Custom Domain**.
3. Điền tên miền của cửa hàng (Ví dụ: `menu.tiemhoa.vn` hoặc `tiemhoa.vn`).
4. Cloudflare sẽ tự động cấp phát chứng chỉ SSL/TLS miễn phí, kích hoạt HTTP/2, HTTP/3 và tự động chuyển hướng mọi truy cập `http://` sang `https://`.

---

## 7. Chiến lược Caching & Hiệu năng (Performance & Cache Control)

Kiến trúc caching được cấu hình sẵn trong `worker/index.js` tuân thủ nghiêm ngặt các nguyên tắc:

1. **Dữ liệu động API (`/api/public/*`, `/api/admin/*`):**
   - Thiết lập header `Cache-Control: no-store`.
   - Đảm bảo khi chủ tiệm sửa giá hay ẩn mẫu hoa, khách hàng quét mã QR sẽ thấy thông tin cập nhật tức thì, không bị dính cache cũ.
2. **Hình ảnh hoa tươi (`/api/public/images/:id?v=<hash>`):**
   - Thiết lập header `Cache-Control: private, no-cache` kèm `ETag: "${imageHash || updatedAt}"`.
   - Trình duyệt lưu ảnh cục bộ nhưng luôn gửi `If-None-Match` lên server để kiểm tra. Nếu ảnh chưa đổi, Worker trả về `304 Not Modified` (0 byte tải qua mạng, phản hồi trong vài mili-giây).
   - Khi chủ shop đổi ảnh mới, `imageHash` thay đổi lập tức, khách hàng được nhận ảnh mới ngay mà không cần xóa bộ nhớ đệm điện thoại.

---

## 8. Tạo Mã QR Chuẩn In ấn (Standee & Sticker Quầy)

Trước khi in ấn bảng QR đặt tại cửa hàng, chạy script tạo mã QR với URL chính thức:

```powershell
# Chạy tạo mã QR trỏ tới domain chính thức của shop
npm run qr:generate -- --url https://tiemhoa.vn/
```

Script sẽ kiểm tra URL chặt chẽ (bắt buộc HTTPS, từ chối localhost/pages.dev) và xuất 2 tệp ra thư mục `dist-qr/`:
- `dist-qr/qr-menu.svg`: Định dạng vector siêu nét, dùng cho xưởng in thiết kế standee mica để bàn, bảng hiệu hoặc in bạt khổ lớn không bao giờ vỡ nét.
- `dist-qr/qr-menu.png`: Định dạng bitmap 1024x1024 chuẩn Level H (chịu được xước/mất nét tới 30%), phù hợp làm sticker dán quầy hoặc gửi qua Zalo/Facebook.

---

## 9. Quy trình Sao lưu & Khôi phục Thảm họa (Backup & Disaster Recovery)

### 9.1. Sao lưu CSDL Định kỳ hoặc Trước khi Cập nhật lớn
Sử dụng script PowerShell tự động trong dự án:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-d1.ps1
```
Script sẽ xuất toàn bộ dữ liệu (bảng, danh mục, thông tin tiệm và toàn bộ khối nhị phân ảnh WebP) vào tệp `backups/flower-menu-prod-<timestamp>.sql`.

### 9.2. Khôi phục Dữ liệu (Restore)
Nếu xảy ra sự cố thao tác nhầm trên production, khôi phục bằng lệnh:
```powershell
npx wrangler d1 execute flower-menu-prod --remote --file="backups/flower-menu-prod-<timestamp>.sql"
```
Sau đó kiểm tra lại số lượng sản phẩm và ảnh:
```powershell
npx wrangler d1 execute flower-menu-prod --remote --command="SELECT count(*) AS total_products, count(imageData) AS total_images FROM products;"
```

---

## 10. Chiến lược Rollback & Tính Bất biến của CSDL

1. **Rollback giao diện và Worker:**
   Nếu bản deploy mới gặp vấn đề giao diện, có thể rollback tức thì về phiên bản ổn định trước đó trong vài giây mà không cần build lại:
   ```powershell
   npx wrangler rollback
   ```
2. **Nguyên tắc Migration không phá hủy (Non-destructive migrations):**
   Mọi script migration trong dự án (`0001` đến `0003`) chỉ thực hiện thêm cột (`ALTER TABLE ... ADD COLUMN`) hoặc tạo bảng mới (`CREATE TABLE IF NOT EXISTS`), tuyệt đối **không DROP COLUMN hoặc DROP TABLE**, đảm bảo an toàn 100% cho dữ liệu hiện có khi thực hiện rollback phiên bản Worker.

---

## 11. Xử lý Sự cố Thường gặp (Troubleshooting)

| Hiện tượng | Nguyên nhân | Hướng xử lý |
|---|---|---|
| **Lỗi 403 khi vào `/admin`** | Chưa có phiên đăng nhập Cloudflare Access hoặc email không nằm trong danh sách được phép. | Kiểm tra biến `ADMIN_EMAIL` trên Worker và Rule `Emails` trong Zero Trust Dashboard đã khớp chính xác với email của chủ shop hay chưa. |
| **Lỗi 409 Conflict khi bấm Lưu sản phẩm** | Mẫu hoa vừa được sửa ở một máy tính hoặc tab khác (Khóa lạc quan phát hiện lệch `version`). | Tải lại trang (F5) để lấy dữ liệu mới nhất, sau đó điền lại thông tin cần sửa và bấm Lưu. |
| **Lỗi 413 Payload Too Large khi tải ảnh** | Ảnh WebP vượt quá kích thước 150 KB. | Giao diện đã có bộ nén tự động. Nếu ảnh vẫn quá lớn, chủ shop chỉ cần chụp bớt góc rộng hoặc giảm độ phân giải camera trước khi tải lên. |
| **Lỗi 404 Không tìm thấy ảnh hoa** | Sản phẩm đang ở chế độ "Ẩn" (`isVisible = 0`) hoặc chưa có ảnh. | Vào trang quản trị bật hiển thị sản phẩm hoặc tải ảnh mới cho mẫu hoa. |
