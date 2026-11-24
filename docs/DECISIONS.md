# Architecture Decision Records (ADRs) - Flower QR Menu

Tài liệu này ghi nhận các quyết định kiến trúc cốt lõi đã được thảo luận, thống nhất và triển khai trong dự án **Flower QR Menu**.

---

## ADR-001: Lưu trữ ảnh sản phẩm dạng WebP BLOB trong SQLite D1 thay vì Cloudflare R2

- **Trạng thái:** [CONFIRMED] Đã triển khai (`migrations/0002_product_images.sql`, `worker/index.js`, `worker/webp.js`).
- **Bối cảnh:**
  - Quy mô catalogue của tiệm hoa là từ 20 đến 100 mẫu hoa.
  - Lưu lượng khách tham chiếu dưới 100 khách ghé tiệm/ngày.
  - Khi dùng Cloudflare R2 (S3-compatible Object Storage), hệ thống phải cấu hình thêm 1 dịch vụ, quản lý phân quyền S3 API, xử lý bài toán orphan files khi transaction thất bại, và có nguy cơ phát sinh chi phí giao dịch Class A/B.
  - Ngược lại, Cloudflare D1 cung cấp **5 GB dung lượng miễn phí**.
- **Quyết định:**
  - Ảnh hoa sau khi được nén phía client (WebP, tối đa 150 KB, trung bình 30–70 KB) sẽ được Worker kiểm tra định dạng và lưu trữ trực tiếp dưới dạng `imageData BLOB` trong bảng `products` của Cloudflare D1.
  - Kèm theo cột `imageHash TEXT` (SHA-256 rút gọn) để phục vụ định danh phiên bản và caching ETag.
- **Hệ quả & Đánh giá:**
  - **Tối giản hạ tầng:** Giảm từ 2 dịch vụ độc lập (D1 + R2) xuống còn 1 dịch vụ duy nhất (D1).
  - **Tính nguyên khối (Atomicity):** Thao tác thêm/sửa hoa cùng với ảnh diễn ra trong 1 câu lệnh SQL duy nhất (`RETURNING ...`), không bao giờ bị tình trạng ảnh đã lưu vào storage nhưng CSDL ghi lỗi (hoàn toàn triệt tiêu orphan media).
  - **Dung lượng tối ưu:** 100 mẫu hoa x 70 KB = 7 MB, chỉ chiếm **0.14%** hạn mức 5 GB miễn phí của D1.
  - **Sao lưu hoàn hảo:** Script sao lưu `scripts/backup-d1.ps1` xuất ra 1 file SQL duy nhất chứa đầy đủ toàn bộ catalogue và ảnh sản phẩm mà không cần đồng bộ 2 nguồn khác nhau.

---

## ADR-002: Xác thực Quản trị bằng Cloudflare Zero Trust Access & RS256 JWT Verification

- **Trạng thái:** [CONFIRMED] Đã triển khai (`worker/admin-access.js`).
- **Bối cảnh:**
  - Cần bảo vệ các đường dẫn `/admin`, `/admin/*` và toàn bộ API thay đổi dữ liệu `/api/admin/*`.
  - Việc tự viết hệ thống authentication (tài khoản/mật khẩu, mã hóa bcrypt, bảng users, reset password) tốn nhiều thời gian, dễ xuất hiện lỗ hổng bảo mật, và chủ tiệm thường quên mật khẩu.
- **Quyết định:**
  - Sử dụng giải pháp quản lý danh tính **Cloudflare Zero Trust Access** tại tầng mạng biên (Edge Gateway). Chủ shop đăng nhập bằng mã Email OTP gửi về hòm thư đã đăng ký.
  - Phía serverless Worker, module `worker/admin-access.js` sử dụng thư viện chuẩn `jose` để xác minh chữ ký số RS256 của token JWT trong header `Cf-Access-Jwt-Assertion` thông qua JWKS endpoint (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`).
  - Hỗ trợ biến môi trường `ADMIN_EMAIL` (danh sách email cho phép, phân tách bằng dấu phẩy, không phân biệt hoa thường).
- **Hệ quả & Đánh giá:**
  - Miễn phí cho tối đa 50 người dùng (chủ tiệm chỉ cần 1–2 tài khoản).
  - Chống hoàn toàn brute force, credential stuffing và giả mạo header trên môi trường production.
  - Không cần lưu trữ bất kỳ mật khẩu nào trong cơ sở dữ liệu.

---

## ADR-003: Khóa lạc quan (Optimistic Locking) với Cột `version` và HTTP 409 Conflict

- **Trạng thái:** [CONFIRMED] Đã triển khai (`migrations/0003_production_readiness.sql`, `worker/index.js`).
- **Bối cảnh:**
  - Chủ tiệm có thể mở trang quản trị đồng thời trên máy tính tại quầy và điện thoại di động khi đang cắm hoa.
  - Nếu hai thiết bị cùng sửa một mẫu hoa, thiết bị lưu sau có thể vô tình ghi đè làm mất thông tin của thiết bị lưu trước (Lost Update Problem).
- **Quyết định:**
  - Bổ sung cột `version INTEGER NOT NULL DEFAULT 1` vào bảng `products`.
  - Mọi yêu cầu `PATCH /api/admin/products/:id` bắt buộc phải gửi trường `expectedVersion`.
  - Câu lệnh cập nhật thực thi:
    ```sql
    UPDATE products SET ..., version = version + 1
    WHERE id = ? AND version = ?
    RETURNING ...
    ```
  - Nếu `version` trong CSDL khác với `expectedVersion`, Worker từ chối ghi và trả về mã lỗi `HTTP 409 Conflict` kèm mã `VERSION_CONFLICT` và toàn bộ bản ghi mới nhất (`latest`).
- **Hệ quả & Đánh giá:**
  - Bảo toàn tính toàn vẹn dữ liệu, loại bỏ 100% rủi ro mất dữ liệu do ghi đè vô tình.
  - Giao diện người dùng nhận được dữ liệu mới nhất để thông báo thân thiện cho chủ tiệm tải lại.

---

## ADR-004: Chống trùng lặp Thao tác Ghi bằng `Idempotency-Key` và Partial Unique Index

- **Trạng thái:** [CONFIRMED] Đã triển khai (`migrations/0003_production_readiness.sql`, `worker/index.js`).
- **Bối cảnh:**
  - Khi chủ tiệm bấm nút "Lưu mẫu hoa" trên điện thoại qua sóng 4G chập chờn, người dùng có xu hướng bấm liên tiếp nhiều lần nếu mạng chậm.
  - Điều này dẫn đến việc tạo ra nhiều mẫu hoa trùng lặp trên menu.
- **Quyết định:**
  - Phía Client gửi header `Idempotency-Key` (chuỗi ngẫu nhiên 8–128 ký tự UUID).
  - Phía Database tạo chỉ mục một phần duy nhất:
    ```sql
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_idempotency
      ON products(idempotencyKey)
      WHERE idempotencyKey IS NOT NULL;
    ```
  - Khi Worker nhận được yêu cầu trùng lặp `Idempotency-Key`, Worker phát hiện và trả về ngay bản ghi sản phẩm đã tạo trước đó kèm header `Idempotency-Replayed: true` với mã `HTTP 200`.
- **Hệ quả & Đánh giá:**
  - Không bao giờ bị nhân đôi sản phẩm dù người dùng bấm nút Lưu bao nhiêu lần liên tục.

---

## ADR-005: Chiến lược Caching Ảnh `private, no-cache` + ETag Revalidation

- **Trạng thái:** [CONFIRMED] Đã triển khai (`worker/index.js`).
- **Bối cảnh:**
  - Các tệp ảnh hoa cần được tải cực nhanh trên điện thoại của khách hàng.
  - Tuy nhiên, nếu dùng cache tĩnh dài hạn (`Cache-Control: public, max-age=31536000`), khi chủ tiệm chụp ảnh mới hoặc sửa đổi mẫu hoa, khách hàng cũ quét lại mã QR sẽ bị dính ảnh cũ trong bộ nhớ đệm trình duyệt di động.
- **Quyết định:**
  - Endpoint phân phối ảnh hoa `/api/public/images/:id?v=<hash>` phục vụ với tiêu đề:
    `Cache-Control: private, no-cache`
    `ETag: "${imageHash || updatedAt}"`
  - Trình duyệt lưu bản sao ảnh vào cache, nhưng trước khi hiển thị sẽ gửi một request nhẹ (header `If-None-Match`) lên Cloudflare Worker.
  - Nếu hash không đổi, Worker lập tức phản hồi `HTTP 304 Not Modified` với **0 byte dữ liệu truyền tải**, trình duyệt sử dụng ngay ảnh trong cache.
  - Khi chủ tiệm thay đổi ảnh, URL ảnh nhận query string `v=<newHash>` và `ETag` mới, trình duyệt tải ảnh mới tức thì.
- **Hệ quả & Đánh giá:**
  - Trải nghiệm mở menu tức thì không độ trễ.
  - Cập nhật ảnh chính xác trong từng mili-giây, không bao giờ phải hướng dẫn khách hàng "xóa bộ nhớ đệm trình duyệt".
