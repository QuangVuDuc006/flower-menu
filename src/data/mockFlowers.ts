import type { FilterCategory, FlowerProduct, ProductCategory } from '../types/flower';

export const FILTER_CATEGORIES: FilterCategory[] = [
  'Tất cả',
  'Hoa bó',
  'Hoa giỏ',
  'Hoa sinh nhật',
  'Hoa chúc mừng',
  'Hoa theo yêu cầu',
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Hoa bó',
  'Hoa giỏ',
  'Hoa sinh nhật',
  'Hoa chúc mừng',
  'Hoa theo yêu cầu',
];

export const INITIAL_FLOWERS: FlowerProduct[] = [
  {
    id: 'fl-bh-001',
    code: 'BH-001',
    name: 'Hồng Dịu Dàng',
    price: 350000,
    primaryCategory: 'Hoa bó',
    categories: ['Hoa bó', 'Hoa sinh nhật'],
    images: ['/flowers/placeholder.png'],
    description:
      'Bó hoa hồng phấn nhẹ nhàng phối cùng hồng chùm kem và lá bạc khuynh diệp thơm dịu. Tông màu ngọt ngào, trang nhã, rất phù hợp để tặng sinh nhật, kỷ niệm hoặc gửi lời cảm ơn chân thành.',
    stemsNote: 'Hồng phấn Đà Lạt, hồng chùm kem, lá bạc khuynh diệp, giấy gói kem mờ',
    isVisible: true,
    updatedAt: 'Hôm nay',
  },
  {
    id: 'fl-bh-002',
    code: 'BH-002',
    name: 'Nắng Ban Mai',
    price: 290000,
    primaryCategory: 'Hoa bó',
    categories: ['Hoa bó', 'Hoa chúc mừng', 'Hoa sinh nhật'],
    images: ['/flowers/placeholder.png'],
    description:
      'Sắc vàng tươi sáng của hoa hướng dương kết hợp cùng cúc tana trắng nhỏ xinh và lá xanh tự nhiên. Mang theo năng lượng tích cực, ấm áp cho dịp tốt nghiệp, chúc mừng hoặc ngày mới.',
    stemsNote: 'Hướng dương loại A, cúc tana trắng, lá bạc, nơ lụa xanh xô thơm',
    isVisible: true,
    updatedAt: 'Hôm nay',
  },
  {
    id: 'fl-bh-003',
    code: 'BH-003',
    name: 'Mùa Yêu Thương',
    price: 450000,
    primaryCategory: 'Hoa bó',
    categories: ['Hoa bó', 'Hoa sinh nhật'],
    images: ['/flowers/placeholder.png'],
    description:
      'Sự hòa quyện mềm mại giữa hồng vườn dáng mẫu đơn, cát tường trắng và sắc hồng phấn đầy đặn. Bó hoa có phom dáng bồng bềnh, lãng mạn cho những dịp thật đặc biệt.',
    stemsNote: 'Hồng Ohara hồng phấn, cát tường kép trắng, lá phụ theo mùa',
    isVisible: true,
    updatedAt: 'Hôm qua',
  },
  {
    id: 'fl-bh-004',
    code: 'BH-004',
    name: 'Thanh Xuân',
    price: 390000,
    primaryCategory: 'Hoa bó',
    categories: ['Hoa bó', 'Hoa sinh nhật', 'Hoa theo yêu cầu'],
    images: ['/flowers/placeholder.png'],
    description:
      'Cẩm tú cầu xanh kem dịu mắt điểm xuyết cùng hoa tulip trắng và hoa thanh liễu nhỏ. Thiết kế thanh thoát, tinh tế dành tặng người yêu thích vẻ đẹp nhẹ nhàng, hiện đại.',
    stemsNote: 'Cẩm tú cầu Đà Lạt, tulip trắng, thanh liễu, giấy gói xanh khói - kem',
    isVisible: true,
    updatedAt: '2 ngày trước',
  },
  {
    id: 'fl-hg-001',
    code: 'HG-001',
    name: 'Giỏ Hoa Bình Yên',
    price: 550000,
    primaryCategory: 'Hoa giỏ',
    categories: ['Hoa giỏ', 'Hoa sinh nhật', 'Hoa chúc mừng'],
    images: ['/flowers/placeholder.png'],
    description:
      'Giỏ mây đan thủ công cắm đầy hoa hồng kem bơ, cát tường trắng, mõm sói và lá bạc mềm mại. Thuận tiện trưng bày trên bàn làm việc hoặc phòng khách từ 4–6 ngày.',
    stemsNote: 'Hồng kem dâu, cát tường trắng, mõm sói trắng, giỏ mây đan tự nhiên',
    isVisible: true,
    updatedAt: 'Hôm nay',
  },
  {
    id: 'fl-hc-001',
    code: 'HC-001',
    name: 'Ngày Rực Rỡ',
    price: 650000,
    primaryCategory: 'Hoa chúc mừng',
    categories: ['Hoa chúc mừng', 'Hoa giỏ'],
    images: ['/flowers/placeholder.png'],
    description:
      'Giỏ hoa chúc mừng tông cam đào – vàng ấm áp với hồng Juliet, mao lương, đồng tiền kem và lá xanh phóng khoáng. Sang trọng, tươi vui cho dịp khai trương, thăng chức và mừng tân gia.',
    stemsNote: 'Hồng cam đào, đồng tiền kem nhụy đen, mao lương vàng bơ, giỏ mây lớn',
    isVisible: true,
    updatedAt: 'Hôm nay',
  },
  {
    id: 'fl-hg-002',
    code: 'HG-002',
    name: 'Vườn Xuân Nhỏ',
    price: 480000,
    primaryCategory: 'Hoa giỏ',
    categories: ['Hoa giỏ', 'Hoa sinh nhật'],
    images: ['/flowers/placeholder.png'],
    description:
      'Giỏ hoa nhỏ xinh tựa khu vườn ban sớm với cẩm chướng hồng pastel, hồng chùm và hoa baby trắng li ti. Món quà gần gũi, duyên dáng phù hợp tặng mẹ, cô giáo hoặc bạn bè.',
    stemsNote: 'Cẩm chướng hồng phấn, hồng chùm kem, hoa baby trắng, giỏ mây quai xách',
    isVisible: true,
    updatedAt: '3 ngày trước',
  },
  {
    id: 'fl-ty-001',
    code: 'TY-001',
    name: 'Sắc Trắng Tinh Khôi',
    price: 420000,
    primaryCategory: 'Hoa theo yêu cầu',
    categories: ['Hoa theo yêu cầu', 'Hoa bó'],
    images: ['/flowers/placeholder.png'],
    description:
      'Bó hoa rum trắng thanh lịch phối cùng hồng trắng và mao lương, thắt nơ lụa xanh rừng sâu. Có thể điều chỉnh số lượng bông và màu giấy gói theo mong muốn riêng của quý khách tại quầy.',
    stemsNote: 'Hoa rum trắng, hồng trắng Đà Lạt, lá khuynh diệp, nơ lụa xanh đậm',
    isVisible: true,
    updatedAt: '3 ngày trước',
  },
  {
    id: 'fl-bh-005',
    code: 'BH-005',
    name: 'Chiều Thu Dịu Êm',
    price: 370000,
    primaryCategory: 'Hoa bó',
    categories: ['Hoa bó', 'Hoa theo yêu cầu'],
    images: ['/flowers/placeholder.png'],
    description:
      'Bó hồng nâu trà sữa ấm áp điểm cỏ đuôi thỏ mềm và cát tường kem. Mẫu hoa theo mùa đang tạm ẩn khi tiệm chờ đợt hoa mới về vào sáng mai.',
    stemsNote: 'Hồng cappuccino, cát tường kem, cỏ đuôi thỏ khô tự nhiên',
    isVisible: false,
    updatedAt: '4 ngày trước',
  },
];

export const SAMPLE_GALLERY_CHOICES: { label: string; url: string }[] = [
  { label: 'Ảnh mẫu hoa', url: '/flowers/placeholder.png' },
];

export const SHOP_INFO = {
  name: 'Tiệm Hoa',
  tagline: 'Hoa tươi mỗi ngày',
  hours: '',
  address: '',
  zaloUrl: import.meta.env.VITE_ZALO_URL ?? '',
};
