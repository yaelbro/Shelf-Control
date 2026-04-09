/**
 * Shelf Arrangement Tool - Core Logic
 * Functions for filtering, pinning, segmentation, and sorting products
 */

import type {
  Product,
  Rule,
  RuleGroup,
  Segment,
  PinnedProduct,
  ProductWithMetadata,
  ArrangementResult,
  CategoryConfig,
} from '../types/shelfArrangement';

// ============================================================================
// RULE EVALUATION
// ============================================================================

/**
 * Evaluates a single rule against a product
 */
export function evaluateRule(product: Product, rule: Rule): boolean {
  const fieldValue = getFieldValue(product, rule.field);

  if (fieldValue === undefined) {
    return false;
  }

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    case 'notEquals':
      return fieldValue !== rule.value;
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
    case 'notContains':
      return !String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
    case 'oneOf':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case 'greaterThan':
      return Number(fieldValue) > Number(rule.value);
    case 'lessThan':
      return Number(fieldValue) < Number(rule.value);
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(rule.value);
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(rule.value);
    default:
      return false;
  }
}

/**
 * Gets the value of a field from a product (supports nested attributes)
 */
function getFieldValue(product: Product, field: string): any {
  if (field === 'inStock') {
    return product.inStock;
  }
  if (field in product) {
    return (product as any)[field];
  }
  return product.attributes[field];
}

/**
 * Evaluates a rule group (AND/OR logic) against a product
 */
export function evaluateRuleGroup(product: Product, group: RuleGroup): boolean {
  if (group.rules.length === 0) {
    return true; // No rules = all products pass
  }

  const results = group.rules.map(rule => {
    const ruleResult = evaluateRule(product, rule);
    // If rule is an exclusion (negative), invert the result
    return rule.isExclusion ? !ruleResult : ruleResult;
  });

  if (group.logic === 'AND') {
    return results.every(r => r === true);
  } else {
    // OR
    return results.some(r => r === true);
  }
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Applies filtering rules to products
 * Excludes out-of-stock products automatically
 */
export function applyFilters(products: Product[], ruleGroup: RuleGroup): Product[] {
  return products.filter(product => {
    // Automatically exclude out-of-stock products
    if (!product.inStock) {
      return false;
    }
    // Apply rule group
    return evaluateRuleGroup(product, ruleGroup);
  });
}

// ============================================================================
// PINNING
// ============================================================================

/**
 * Marks pinned products within the filtered product list
 * Returns products with pinning metadata
 */
export function applyPinning(
  products: Product[],
  pinnedProducts: PinnedProduct[]
): ProductWithMetadata[] {
  const pinnedMap = new Map(
    pinnedProducts.map(p => [p.variantId, p])
  );

  return products.map(product => ({
    ...product,
    isPinned: pinnedMap.has(product.variantId),
    pinPriority: pinnedMap.get(product.variantId)?.priority,
    pinManualOrder: pinnedMap.get(product.variantId)?.manualOrder,
    sortOrder: 0, // Will be set later
    isFiltered: true,
  }));
}

/**
 * Gets pinned products at the top, sorted by priority (desc)
 */
export function getPinnedProductsOrdered(
  products: ProductWithMetadata[]
): ProductWithMetadata[] {
  return products
    .filter(p => p.isPinned)
    .sort((a, b) => {
      const aManual = a.pinManualOrder;
      const bManual = b.pinManualOrder;

      if (aManual !== undefined && bManual !== undefined) {
        return aManual - bManual;
      }

      if (aManual !== undefined) {
        return -1;
      }

      if (bManual !== undefined) {
        return 1;
      }

      return (b.pinPriority ?? 0) - (a.pinPriority ?? 0);
    });
}

/**
 * Gets non-pinned products for segmentation
 */
export function getNonPinnedProducts(products: ProductWithMetadata[]): ProductWithMetadata[] {
  return products.filter(p => !p.isPinned);
}

// ============================================================================
// SEGMENTATION
// ============================================================================

/**
 * Assigns products to segments based on segment filters
 * Each product belongs to at most one segment (first match wins)
 */
export function assignSegments(
  products: ProductWithMetadata[],
  segments: Segment[]
): ProductWithMetadata[] {
  const sortedSegments = [...segments].sort((a, b) => a.priority - b.priority);

  return products.map(product => {
    // Find first matching segment
    for (const segment of sortedSegments) {
      if (evaluateRuleGroup(product, segment.filters)) {
        return {
          ...product,
          segmentId: segment.id,
          segmentName: segment.name,
        };
      }
    }
    // Product matches no segment
    return product;
  });
}

/**
 * Groups products by segment ID
 */
export function groupProductsBySegment(
  products: ProductWithMetadata[]
): Map<string, ProductWithMetadata[]> {
  const groups = new Map<string, ProductWithMetadata[]>();
  
  products.forEach(product => {
    const key = product.segmentId || '__unassigned__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(product);
  });

  return groups;
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Sorts products within a segment based on sort rules
 */
export function sortSegment(
  products: ProductWithMetadata[],
  sortRules: { field: string; direction: 'asc' | 'desc' }[]
): ProductWithMetadata[] {
  if (sortRules.length === 0) {
    return [...products];
  }

  return [...products].sort((a, b) => {
    for (const rule of sortRules) {
      const aValue = getFieldValue(a, rule.field);
      const bValue = getFieldValue(b, rule.field);

      if (aValue === bValue) continue;

      const comparison = aValue < bValue ? -1 : 1;
      return rule.direction === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
}

/**
 * Flags products that should be moved to bottom by global conditions
 */
export function applyBottomPush(
  products: ProductWithMetadata[],
  bottomRules?: RuleGroup
): ProductWithMetadata[] {
  if (!bottomRules || bottomRules.rules.length === 0) {
    return products.map(product => ({ ...product, pushedToBottom: false }));
  }

  return products.map(product => ({
    ...product,
    pushedToBottom: evaluateRuleGroup(product, bottomRules),
  }));
}

// ============================================================================
// FINAL ARRANGEMENT
// ============================================================================

/**
 * Builds the final arranged product list
 * 1. Pinned products at top (sorted by priority)
 * 2. Segmented products (up to segment size, sorted within segment)
 * 3. Unassigned products (if any)
 */
export function buildFinalList(
  filteredProducts: Product[],
  pinnedProducts: PinnedProduct[],
  segments: Segment[],
  bottomRuleGroup?: RuleGroup,
  maxProducts: number = 100
): ArrangementResult {
  const errors: string[] = [];

  try {
    // Step 1: Apply pinning metadata
    let productsWithMetadata = applyPinning(filteredProducts, pinnedProducts);

    // Step 2: Get pinned products at top
    const pinnedOrdered = getPinnedProductsOrdered(productsWithMetadata);
    const arraggedList: ProductWithMetadata[] = [];
    let currentIndex = 0;

    // Add pinned products
    pinnedOrdered.forEach((product, idx) => {
      if (currentIndex < maxProducts) {
        arraggedList.push({ ...product, sortOrder: currentIndex });
        currentIndex++;
      }
    });

    // Step 3: Get non-pinned products and assign to segments
    const nonPinned = getNonPinnedProducts(productsWithMetadata);
    const segmentedProducts = applyBottomPush(assignSegments(nonPinned, segments), bottomRuleGroup);

    // Step 4: Group by segment
    const productsBySegment = groupProductsBySegment(segmentedProducts);

    // Step 5: Sort each segment and add products
    const sortedSegments = [...segments].sort((a, b) => a.priority - b.priority);

    for (const segment of sortedSegments) {
      const segmentProducts = productsBySegment.get(segment.id) || [];
      const sortedSegmentProducts = sortSegment(segmentProducts, segment.sorters);

      // Add up to segment size
      const nonBottomProducts = sortedSegmentProducts.filter(product => !product.pushedToBottom);
      const bottomProducts = sortedSegmentProducts.filter(product => product.pushedToBottom);
      const productsToAdd = [...nonBottomProducts, ...bottomProducts].slice(0, segment.size);
      productsToAdd.forEach(product => {
        if (currentIndex < maxProducts) {
          arraggedList.push({ ...product, sortOrder: currentIndex });
          currentIndex++;
        }
      });
    }

    // Step 6: Add unassigned products (if any space left)
    const unassignedProducts = productsBySegment.get('__unassigned__') || [];
    const unassignedNonBottom = unassignedProducts.filter(product => !product.pushedToBottom);
    const unassignedBottom = unassignedProducts.filter(product => product.pushedToBottom);

    [...unassignedNonBottom, ...unassignedBottom].forEach(product => {
      if (currentIndex < maxProducts) {
        arraggedList.push({ ...product, sortOrder: currentIndex });
        currentIndex++;
      }
    });

    // Calculate statistics
    const statistics = {
      totalProducts: filteredProducts.length,
      filteredProducts: filteredProducts.length,
      pinnedProducts: pinnedOrdered.length,
      productsPerSegment: {} as Record<string, number>,
      outOfStockCount: 0,
    };

    for (const segment of segments) {
      statistics.productsPerSegment[segment.name] = 
        (productsBySegment.get(segment.id) || []).length;
    }

    return {
      arrangedProducts: arraggedList,
      statistics,
      errors,
    };
  } catch (error) {
    errors.push(`Error building final list: ${error}`);
    return {
      arrangedProducts: [],
      statistics: {
        totalProducts: 0,
        filteredProducts: 0,
        pinnedProducts: 0,
        productsPerSegment: {},
        outOfStockCount: 0,
      },
      errors,
    };
  }
}

/**
 * Main orchestration function - brings it all together
 */
export function generateArrangement(config: CategoryConfig, allProducts: Product[]): ArrangementResult {
  // Step 1: Filter products
  const filtered = applyFilters(allProducts, config.filterRuleGroup);

  // Step 2: Build final arrangement
  return buildFinalList(
    filtered,
    config.pinnedProducts,
    config.segments,
    config.bottomRuleGroup,
    config.maxProducts
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Promotes a product to the top by setting high priority
 */
export function promoteProduct(
  product: Product,
  pinnedProducts: PinnedProduct[]
): PinnedProduct[] {
  const withoutCurrent = pinnedProducts.filter(p => p.variantId !== product.variantId);
  const shifted = withoutCurrent.map(p => ({
    ...p,
    manualOrder: (p.manualOrder ?? 0) + 1,
  }));
  const maxPriority = shifted.length > 0
    ? Math.max(...shifted.map(p => p.priority))
    : 0;

  shifted.unshift({
    productId: product.id,
    variantId: product.variantId,
    priority: Math.min(maxPriority + 10, 100),
    manualOrder: 0,
    pinnedAt: new Date(),
  });

  return shifted;
}

/**
 * Unpins a product
 */
export function unpinProduct(
  variantId: string,
  pinnedProducts: PinnedProduct[]
): PinnedProduct[] {
  return pinnedProducts.filter(p => p.variantId !== variantId);
}

/**
 * Reorders pinned products by adjusting priorities
 */
export function reorderPinnedProducts(
  variantIds: string[],
  pinnedProducts: PinnedProduct[]
): PinnedProduct[] {
  const updated = [...pinnedProducts];
  variantIds.forEach((variantId, index) => {
    const product = updated.find(p => p.variantId === variantId);
    if (product) {
      product.manualOrder = index;
      product.priority = 100 - (index * 10); // Higher priority for earlier positions
    }
  });
  return updated;
}
