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
  priceBeforeDiscount?: number;
  priceMax?: number;
  color?: string | string[];
  size?: string | string[];
  publishDate: Date;
  bestSellers?: number; // Sales count over time range
  inStock: boolean;
  tagNames?: string[]; // Resolved display names of Wix tags
  attributes: Record<string, string | number | boolean | Array<string | number | boolean>>;
}

// ============================================================================
// RULES & FILTERING
// ============================================================================

export type FilterOperator =
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains' 
  | 'startsWith'
  | 'notStartsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'oneOf' 
  | 'greaterThan' 
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual';

export interface Rule {
  id: string;
  field: string; // e.g., "category", "color", "inventoryPercentage"
  operator: FilterOperator;
  value: string | number | boolean | Array<string | number | boolean>;
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
  { name: 'name', label: 'Product Name', type: 'string', placeholder: 'e.g. Running Shoe' },
  { name: 'sku', label: 'Handle', type: 'string', placeholder: 'e.g. my-product-handle' },
  { name: 'variantId', label: 'Variant ID', type: 'string' },
  { name: 'color', label: 'Color', type: 'select' },
  { name: 'size', label: 'Size', type: 'select' },
  { name: 'inventory', label: 'Inventory Units', type: 'number' },
  { name: 'variantAvailabilityPercentage', label: 'Variant Availability %', type: 'number' },
  { name: 'inventoryPercentage', label: 'Stock Level (%)', type: 'number' },
  { name: 'price', label: 'Price', type: 'number' },
  { name: 'publishDate', label: 'New Products (Date)', type: 'date' },
  { name: 'daysSincePublish', label: 'Uploaded In Last (Days)', type: 'number', placeholder: 'e.g. 30' },
  { name: 'bestSellers', label: 'Best Sellers', type: 'number' },
  { name: 'inStock', label: 'In Stock', type: 'boolean' },
  { name: 'visible', label: 'Visible in Store', type: 'boolean' },
  { name: 'source', label: 'Catalog Source', type: 'select' },
];

export const AVAILABLE_OPERATORS: Record<string, FilterOperator[]> = {
  string: ['contains', 'notContains', 'startsWith', 'notStartsWith', 'endsWith', 'notEndsWith', 'equals', 'notEquals'],
  number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
  select: ['equals', 'notEquals', 'oneOf'],
  date: ['equals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'],
  boolean: ['equals', 'notEquals'],
};
