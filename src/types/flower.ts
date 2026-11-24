export type ProductCategory = string;

export type FilterCategory = 'Tất cả' | ProductCategory;

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  hours: string;
  address: string;
  zaloUrl: string;
  contactNote: string;
  priceNote: string;
  welcomeHeading: string;
  welcomeSubtitle: string;
}

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
  isFeatured?: boolean;
  sortOrder?: number;
  version?: number;
  updatedAt: string;
}

export type AppScreen =
  | 'catalog'
  | 'detail'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-form'
  | 'admin-categories'
  | 'admin-settings'
  | 'design-system';
