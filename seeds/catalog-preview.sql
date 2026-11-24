INSERT INTO products (id, code, name, price, primaryCategory, categories, images, description, updatedAt)
VALUES
  ('lan-001', 'LAN-001', 'Lan Hồng Phấn', 890000, 'Hoa theo yêu cầu', '["Hoa theo yêu cầu"]', '["/flowers/lan-001.jpg"]', 'Lan hồng phấn rủ nhẹ trong chậu trắng sọc dọc.', '2026-11-22'),
  ('lan-002', 'LAN-002', 'Lan Trắng Ánh Kim', 1290000, 'Hoa theo yêu cầu', '["Hoa theo yêu cầu"]', '["/flowers/lan-002.jpg"]', 'Lan trắng xếp tán rộng trên chậu chân đế màu vàng đồng.', '2026-11-22'),
  ('lan-003', 'LAN-003', 'Lan Xanh Hồng Song Sắc', 1590000, 'Hoa theo yêu cầu', '["Hoa theo yêu cầu"]', '["/flowers/lan-003.jpg"]', 'Lan xanh lam phối hồng, nổi bật trên chậu dáng hình học.', '2026-11-22'),
  ('lan-004', 'LAN-004', 'Lan Tím Trắng Thanh Nhã', 2290000, 'Hoa theo yêu cầu', '["Hoa theo yêu cầu"]', '["/flowers/lan-004.jpg"]', 'Các cành lan tím và trắng xếp tầng trong chậu trắng cao.', '2026-11-22'),
  ('lan-005', 'LAN-005', 'Lan Vàng Đại Sảnh', 4890000, 'Hoa theo yêu cầu', '["Hoa theo yêu cầu"]', '["/flowers/lan-005.jpg"]', 'Chậu lan vàng nhiều tầng với tán rộng, phù hợp làm điểm nhấn ở sảnh.', '2026-11-22')
ON CONFLICT(id) DO NOTHING;
