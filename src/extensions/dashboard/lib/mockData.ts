/**
 * Shelf Arrangement Tool - Mock Data & Utilities
 */

import type {
  Product,
  CategoryConfig,
  PinnedProduct,
  Segment,
  RuleGroup,
} from '../types/shelfArrangement';

// ============================================================================
// MOCK PRODUCTS
// ============================================================================

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Classic Blue T-Shirt',
    sku: 'tshirt-blue-01',
    variantId: 'v-tshirt-blue-01',
    category: 'Shirts',
    inventory: 150,
    inventoryPercentage: 75,
    price: 29.99,
    color: 'Blue',
    size: 'M',
    publishDate: new Date('2025-01-15'),
    bestSellers: 1250,
    inStock: true,
    attributes: { brand: 'Premium', material: 'Cotton' },
  },
  {
    id: 'p2',
    name: 'Classic Blue T-Shirt',
    sku: 'tshirt-blue-01',
    variantId: 'v-tshirt-blue-02',
    category: 'Shirts',
    inventory: 80,
    inventoryPercentage: 40,
    price: 29.99,
    color: 'Blue',
    size: 'L',
    publishDate: new Date('2025-01-15'),
    bestSellers: 950,
    inStock: true,
    attributes: { brand: 'Premium', material: 'Cotton' },
  },
  {
    id: 'p3',
    name: 'Classic Blue T-Shirt',
    sku: 'tshirt-blue-01',
    variantId: 'v-tshirt-blue-03',
    category: 'Shirts',
    inventory: 10,
    inventoryPercentage: 5,
    price: 29.99,
    color: 'Blue',
    size: 'S',
    publishDate: new Date('2025-01-15'),
    bestSellers: 800,
    inStock: true,
    attributes: { brand: 'Premium', material: 'Cotton' },
  },
  {
    id: 'p4',
    name: 'Red Casual T-Shirt',
    sku: 'tshirt-red-01',
    variantId: 'v-tshirt-red-01',
    category: 'Shirts',
    inventory: 200,
    inventoryPercentage: 100,
    price: 24.99,
    color: 'Red',
    size: 'M',
    publishDate: new Date('2025-02-01'),
    bestSellers: 2100,
    inStock: true,
    attributes: { brand: 'Standard', material: 'Cotton-Blend' },
  },
  {
    id: 'p5',
    name: 'Red Casual T-Shirt',
    sku: 'tshirt-red-01',
    variantId: 'v-tshirt-red-02',
    category: 'Shirts',
    inventory: 50,
    inventoryPercentage: 25,
    price: 24.99,
    color: 'Red',
    size: 'L',
    publishDate: new Date('2025-02-01'),
    bestSellers: 1500,
    inStock: true,
    attributes: { brand: 'Standard', material: 'Cotton-Blend' },
  },
  {
    id: 'p6',
    name: 'Black Premium Shirt',
    sku: 'shirt-black-01',
    variantId: 'v-shirt-black-01',
    category: 'Shirts',
    inventory: 120,
    inventoryPercentage: 60,
    price: 49.99,
    color: 'Black',
    size: 'L',
    publishDate: new Date('2024-12-10'),
    bestSellers: 3200,
    inStock: true,
    attributes: { brand: 'Luxury', material: 'Polyester' },
  },
  {
    id: 'p7',
    name: 'White Basic Tee',
    sku: 'tee-white-01',
    variantId: 'v-tee-white-01',
    category: 'Shirts',
    inventory: 0,
    inventoryPercentage: 0,
    price: 19.99,
    color: 'White',
    size: 'S',
    publishDate: new Date('2025-03-01'),
    bestSellers: 500,
    inStock: false,
    attributes: { brand: 'Basic', material: 'Cotton' },
  },
  {
    id: 'p8',
    name: 'Green Polo Shirt',
    sku: 'polo-green-01',
    variantId: 'v-polo-green-01',
    category: 'Shirts',
    inventory: 95,
    inventoryPercentage: 47,
    price: 39.99,
    color: 'Green',
    size: 'M',
    publishDate: new Date('2025-02-15'),
    bestSellers: 1100,
    inStock: true,
    attributes: { brand: 'Sport', material: 'Cotton' },
  },
  {
    id: 'p9',
    name: 'Navy Blue Formal Shirt',
    sku: 'formal-navy-01',
    variantId: 'v-formal-navy-01',
    category: 'Shirts',
    inventory: 45,
    inventoryPercentage: 22,
    price: 59.99,
    color: 'Blue',
    size: 'XL',
    publishDate: new Date('2025-01-20'),
    bestSellers: 2800,
    inStock: true,
    attributes: { brand: 'Executive', material: 'Silk-Blend' },
  },
  {
    id: 'p10',
    name: 'Orange Summer Tee',
    sku: 'summer-orange-01',
    variantId: 'v-summer-orange-01',
    category: 'Shirts',
    inventory: 120,
    inventoryPercentage: 60,
    price: 22.99,
    color: 'Orange',
    size: 'S',
    publishDate: new Date('2025-03-10'),
    bestSellers: 600,
    inStock: true,
    attributes: { brand: 'Casual', material: 'Cotton' },
  },
];

// ============================================================================
// MOCK CONFIGURATION
// ============================================================================

export const MOCK_DEFAULT_CONFIG: CategoryConfig = {
  categoryId: 'cat-shirts-001',
  categoryName: 'Shirts',
  filterRuleGroup: {
    rules: [],
    logic: 'AND',
  },
  bottomRuleGroup: {
    rules: [],
    logic: 'AND',
  },
  pinnedProducts: [
    {
      productId: 'p6',
      variantId: 'v-shirt-black-01',
      priority: 90,
      pinnedAt: new Date(),
    },
    {
      productId: 'p4',
      variantId: 'v-tshirt-red-01',
      priority: 75,
      pinnedAt: new Date(),
    },
  ],
  segments: [],
  maxProducts: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// NEW CONFIG TEMPLATES
// ============================================================================

export function createNewConfig(categoryId: string, categoryName: string): CategoryConfig {
  return {
    categoryId,
    categoryName,
    filterRuleGroup: {
      rules: [
        {
          id: `r-${Date.now()}`,
          field: 'category',
          operator: 'equals',
          value: categoryName,
        },
      ],
      logic: 'AND',
    },
    bottomRuleGroup: {
      rules: [],
      logic: 'AND',
    },
    pinnedProducts: [],
    segments: [],
    maxProducts: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// ID GENERATORS
// ============================================================================

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(0)}%`;
}

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

export const SAMPLE_CATEGORIES = [
  { id: 'cat-fashion', name: 'Fashion' },
  { id: 'cat-shirts', name: 'Shirts', parentId: 'cat-fashion' },
  { id: 'cat-pants', name: 'Pants', parentId: 'cat-fashion' },
  { id: 'cat-dresses', name: 'Dresses', parentId: 'cat-fashion' },
  { id: 'cat-footwear', name: 'Footwear' },
  { id: 'cat-shoes', name: 'Shoes', parentId: 'cat-footwear' },
  { id: 'cat-accessories', name: 'Accessories' },
];
