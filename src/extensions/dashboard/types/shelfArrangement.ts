/**
 * Shelf Arrangement Tool - Data Structures & Types
 * Core types for managing product arrangement in eCommerce categories
 */

// ============================================================================
// PRODUCT & VARIANT TYPES
// ============================================================================

export interface Product {
  id: string;
  name: string;
  sku: string;
  variantId: string;
  category: string;
  inventory: number;
  inventoryPercentage: number; // 0-100
  price: number;
  color?: string;
  size?: string;
  publishDate: Date;
  bestSellers?: number; // Sales count over time range
  inStock: boolean;
  attributes: Record<string, string | number | boolean>;
}

// ============================================================================
// RULES & FILTERING
// ============================================================================

export type FilterOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains' 
  | 'oneOf' 
  | 'greaterThan' 
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual';

export interface Rule {
  id: string;
  field: string; // e.g., "category", "color", "inventoryPercentage"
  operator: FilterOperator;
  value: string | number | string[];
  isExclusion?: boolean; // true for negative conditions
}

export type RuleLogic = 'AND' | 'OR';

export interface RuleGroup {
  rules: Rule[];
  logic: RuleLogic;
}

// ============================================================================
// SEGMENTATION
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  id: string;
  field: string; // e.g., "inventoryPercentage", "bestSellers", "publishDate"
  direction: SortDirection;
}

export interface Segment {
  id: string;
  name: string;
  filters: RuleGroup;
  size: number; // Max products in this segment
  sorters: SortRule[];
  priority: number; // Order of evaluation (lower = earlier)
}

// ============================================================================
// PINNED PRODUCTS
// ============================================================================

export interface PinnedProduct {
  productId: string;
  variantId: string;
  priority: number; // 0-100, higher = more important
  manualOrder?: number; // Lower value appears first when manually reordered
  pinnedAt: Date;
}

// ============================================================================
// MAIN CONFIGURATION
// ============================================================================

export interface CategoryConfig {
  categoryId: string;
  categoryName: string;
  filterRuleGroup: RuleGroup;
  bottomRuleGroup?: RuleGroup;
  pinnedProducts: PinnedProduct[];
  segments: Segment[];
  createdAt: Date;
  updatedAt: Date;
  maxProducts: number; // Default 100
}

// ============================================================================
// PROCESSING RESULTS
// ============================================================================

export interface ProductWithMetadata extends Product {
  isPinned: boolean;
  pinPriority?: number;
  pinManualOrder?: number;
  segmentId?: string;
  segmentName?: string;
  pushedToBottom?: boolean;
  sortOrder: number;
  isFiltered: boolean;
}

export interface ArrangementResult {
  arrangedProducts: ProductWithMetadata[];
  statistics: {
    totalProducts: number;
    filteredProducts: number;
    pinnedProducts: number;
    productsPerSegment: Record<string, number>;
    outOfStockCount: number;
  };
  errors: string[];
}

// ============================================================================
// UI STATE
// ============================================================================

export type EditorMode = 'filters' | 'pinning' | 'segments' | 'sorting' | 'preview';

export interface ArrangementEditorState {
  mode: EditorMode;
  categoryConfig: CategoryConfig;
  allProducts: Product[];
  filteredProducts: Product[];
  selectedProductId?: string;
  editingRuleId?: string;
  editingSegmentId?: string;
  previewResult?: ArrangementResult;
  hasChanges: boolean;
  undoStack: CategoryConfig[];
  redoStack: CategoryConfig[];
}

// ============================================================================
// MOCK DATA INTERFACE
// ============================================================================

export interface MockProduct extends Omit<Product, 'publishDate'> {
  publishDate: Date | string;
}

// ============================================================================
// FIELD DEFINITIONS (FOR UI)
// ============================================================================

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'date';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export const AVAILABLE_FIELDS: FieldDefinition[] = [
  { name: 'category', label: 'Category', type: 'string' },
  { name: 'color', label: 'Color', type: 'select', options: [
    { label: 'Red', value: 'Red' },
    { label: 'Blue', value: 'Blue' },
    { label: 'Green', value: 'Green' },
    { label: 'Black', value: 'Black' },
    { label: 'White', value: 'White' },
  ]},
  { name: 'size', label: 'Size', type: 'select', options: [
    { label: 'XS', value: 'XS' },
    { label: 'S', value: 'S' },
    { label: 'M', value: 'M' },
    { label: 'L', value: 'L' },
    { label: 'XL', value: 'XL' },
    { label: 'XXL', value: 'XXL' },
  ]},
  { name: 'inventoryPercentage', label: 'Stock Level (%)', type: 'number' },
  { name: 'price', label: 'Price', type: 'number' },
  { name: 'publishDate', label: 'Publish Date', type: 'date' },
  { name: 'bestSellers', label: 'Best Sellers', type: 'number' },
  { name: 'inStock', label: 'In Stock', type: 'boolean' },
];

export const AVAILABLE_OPERATORS: Record<string, FilterOperator[]> = {
  string: ['equals', 'notEquals', 'contains', 'notContains'],
  number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
  select: ['equals', 'notEquals', 'oneOf'],
  date: ['equals', 'greaterThan', 'lessThan'],
  boolean: ['equals', 'notEquals'],
};
