export type ProductCategory =
  | 'Hoa bó'
  | 'Hoa giỏ'
  | 'Hoa sinh nhật'
  | 'Hoa chúc mừng'
  | 'Hoa theo yêu cầu';

export type FilterCategory = 'Tất cả' | ProductCategory;

export interface FlowerProduct {
  id: string;
  code: string;
  name: string;
  price: number;
  primaryCategory: ProductCategory;
  categories: ProductCategory[];
  images: string[];
  description: string;
  stemsNote?: string;
  isVisible: boolean;
  updatedAt: string;
}

export type AppScreen =
  | 'catalog'
  | 'detail'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-form'
  | 'design-system';
