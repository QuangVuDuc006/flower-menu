# Danh Mục Bàn Giao Khách Hàng & Khai Trương (Handover Checklist)

Tài liệu này xác định rõ ràng ranh giới giữa các **hạng mục kỹ thuật đã hoàn thành & kiểm định (Verified Engineering)** và các **thông tin thực tế của chủ tiệm cần hoàn thiện trước ngày khai trương ([OPEN] Owner Inputs)**.

---

## 1. Hạng mục Kỹ thuật đã Hoàn thành & Kiểm định (Verified Engineering Items)

Toàn bộ các yêu cầu kỹ thuật nền tảng, mã nguồn, bảo mật và cơ sở dữ liệu đã được hoàn thiện và kiểm thử tự động:

- [x] **Kiến trúc & Mã nguồn:**
  - React 19 + TypeScript + Tailwind CSS v4 tải trang tức thì trên di động.
  - Không phát sinh lỗi kiểu (`npm run typecheck` đạt 0 lỗi).
  - Không phát sinh lỗi cú pháp hay cảnh báo (`npm run lint` đạt 0 lỗi).
  - Bản build production hoàn tất (`npm run build`).
- [x] **Cơ sở dữ liệu & Migrations:**
  - Migration `0001_products.sql`: Lược đồ sản phẩm ban đầu.
  - Migration `0002_product_images.sql`: Cột `imageData BLOB` lưu ảnh WebP.
  - Migration `0003_production_readiness.sql`: Bảng `categories`, `site_settings`, đánh chỉ mục, hỗ trợ `version` và `idempotencyKey`.
- [x] **Độ tin cậy & Chống lỗi nghiệp vụ:**
  - Khóa lạc quan (Optimistic Locking): Ngăn chặn ghi đè mất dữ liệu giữa nhiều thiết bị (HTTP 409).
  - Chống trùng lặp (Idempotent): Ngăn tạo đúp sản phẩm khi bấm Lưu nhiều lần qua 4G chập chờn.
  - Trình xác thực ảnh WebP thuần JS (`worker/webp.js`): Kiểm tra cấu trúc khối RIFF/VP8/VP8L/VP8X, chặn ảnh giả mạo hoặc vượt 150 KB.
  - Chiến lược ETag Caching: Trả về `304 Not Modified` giúp tiết kiệm 100% băng thông tải lại ảnh chưa đổi.
- [x] **Bảo mật & Quản trị:**
  - Kiểm tra chữ ký số RS256 JWT (`jose`) bảo vệ toàn bộ API quản trị `/api/admin/*`.
  - Tuyệt đối không chứa mật khẩu hay API key nhạy cảm trong mã nguồn (`.gitignore` đã loại trừ `.env` và `.dev.vars`).
- [x] **Công cụ Vận hành:**
  - CLI tạo mã QR chuẩn in ấn (`scripts/generate-qr.mjs`) tạo ra cả vector SVG và bitmap PNG 1024px.
  - Script sao lưu & khôi phục CSDL 1 dòng lệnh (`scripts/backup-d1.ps1`).
- [x] **Tài liệu Hướng dẫn:**
  - Sổ tay cho chủ tiệm trên điện thoại bằng Tiếng Việt (`SHOP_OWNER_GUIDE.md`).
  - Hướng dẫn triển khai Production và Zero Trust (`DEPLOYMENT_GUIDE.md`).
  - Hồ sơ quyết định kiến trúc (`docs/DECISIONS.md`).

---

## 2. Thông tin Chủ Tiệm Cần Cung Cấp & Hoàn Thiện ([OPEN] Owner Inputs)

Đây là các thông tin thực tế từ cửa hàng cần được nhập trước khi chính thức khai trương Standee quét mã tại quầy:

### 2.1. Thông tin Nhận diện Cửa hàng
- [ ] **Tên cửa hàng chính thức:** (Hiện đang dùng mặc định: *"Tiệm Hoa"*).
- [ ] **Câu giới thiệu / Slogan của tiệm:** (Ví dụ: *"Hoa tươi mỗi ngày - Thiết kế theo yêu cầu"*).
- [ ] **Địa chỉ cụ thể của tiệm:** (Để hiển thị ở chân trang menu cho khách dễ liên hệ).
- [ ] **Giờ mở cửa:** (Ví dụ: `07:30 - 21:00 hàng ngày`).

### 2.2. Kênh Liên Hệ Zalo Thực Tế
- [ ] **Đường link Zalo chính xác:** (Dạng `https://zalo.me/<so-dien-thoai-tiem>`).
  - *Kiểm tra thực tế:* Dùng cả 1 điện thoại iPhone và 1 điện thoại Android bấm vào nút "Tư vấn qua Zalo" để xác nhận mở đúng phòng chat của tiệm.

### 2.3. Tên Miền & Tài Khoản Quản Trị
- [ ] **Tên miền riêng của tiệm (Custom Domain):** (Ví dụ: `tiemhoatuoi.vn` hoặc `menu.tiemhoatuoi.vn`).
- [ ] **Email của chủ tiệm:** Địa chỉ email chính xác để nhận mã OTP đăng nhập vào trang quản trị Cloudflare Access.

### 2.4. Dữ liệu Ảnh Hoa Thật của Cửa Hàng
- [ ] **Chụp và tải ảnh hoa thật:** Chủ tiệm tự chụp từ 20 đến 40 mẫu hoa thực tế của cửa hàng và tải lên qua trang quản trị (thay thế hoàn toàn dữ liệu hoa mẫu demo).
- [ ] **Xác nhận mức giá niêm yết:** Kiểm tra giá các mẫu hoa hiển thị trên menu đã đúng với bảng giá bán tại quầy.
- [ ] **Cập nhật danh mục:** Xác nhận các danh mục hoa thực tế của tiệm (Hoa bó, Hoa giỏ, Hoa khai trương, Lan hồ điệp...).

### 2.5. Kiểm Tra Thực Tế Standee Mã QR tại Quầy
- [ ] **Tạo file in mã QR từ tên miền thật:** Chạy lệnh `npm run qr:generate -- --url https://<ten-mien-that>/`.
- [ ] **In thử Standee:** Đem file SVG/PNG đi in mẫu standee để bàn hoặc decal dán quầy.
- [ ] **Test quét thực tế tại cửa hàng:**
  - Quét thử bằng camera iPhone ở khoảng cách 30 cm – 80 cm.
  - Quét thử bằng camera Android / ứng dụng Zalo / Google Lens.
  - Kiểm tra xem mã QR có bị lóa bởi ánh sáng đèn trần tại quầy hay không.

---

## 3. Biên bản Nghiệm thu Bàn giao (Sign-off)

| Hạng mục | Người kiểm tra | Trạng thái | Ngày xác nhận |
|---|---|---|---|
| Hạ tầng & Mã nguồn | Kỹ sư DevOps / AI Agent | ĐẠT (Passed) | 25/11/2026 |
| Kiểm thử Tự động & API | QA Verifier | ĐẠT (Passed) | 25/11/2026 |
| Cung cấp Ảnh hoa & Giá thật | Chủ cửa hàng | Đang chờ ([OPEN]) | ___/___/2026 |
| In ấn Standee & Khai trương | Chủ cửa hàng | Đang chờ ([OPEN]) | ___/___/2026 |
