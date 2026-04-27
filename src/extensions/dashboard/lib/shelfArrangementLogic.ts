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

  const normalizedFieldValue = normalizeComparableValue(fieldValue);
  const normalizedRuleValue = Array.isArray(rule.value)
    ? rule.value.map(value => normalizeComparableValue(value))
    : normalizeComparableValue(rule.value);
  const normalizedFieldValues = Array.isArray(normalizedFieldValue)
    ? normalizedFieldValue
    : [normalizedFieldValue];

  switch (rule.operator) {
    case 'equals':
      return normalizedFieldValues.some(value => value === normalizedRuleValue);
    case 'notEquals':
      return normalizedFieldValues.every(value => value !== normalizedRuleValue);
    case 'contains':
      return normalizedFieldValues.some(value => (
        String(value).toLowerCase().includes(String(rule.value).toLowerCase())
      ));
    case 'notContains':
      return normalizedFieldValues.every(value => (
        !String(value).toLowerCase().includes(String(rule.value).toLowerCase())
      ));
    case 'startsWith':
      return normalizedFieldValues.some(value => (
        String(value).toLowerCase().startsWith(String(rule.value).toLowerCase())
      ));
    case 'notStartsWith':
      return normalizedFieldValues.every(value => (
        !String(value).toLowerCase().startsWith(String(rule.value).toLowerCase())
      ));
    case 'endsWith':
      return normalizedFieldValues.some(value => (
        String(value).toLowerCase().endsWith(String(rule.value).toLowerCase())
      ));
    case 'notEndsWith':
      return normalizedFieldValues.every(value => (
        !String(value).toLowerCase().endsWith(String(rule.value).toLowerCase())
      ));
    case 'oneOf':
      return Array.isArray(normalizedRuleValue) && normalizedFieldValues.some(value => normalizedRuleValue.includes(value));
    case 'greaterThan':
      return normalizedFieldValues.some(value => Number(value) > Number(normalizedRuleValue));
    case 'lessThan':
      return normalizedFieldValues.some(value => Number(value) < Number(normalizedRuleValue));
    case 'greaterThanOrEqual':
      return normalizedFieldValues.some(value => Number(value) >= Number(normalizedRuleValue));
    case 'lessThanOrEqual':
      return normalizedFieldValues.some(value => Number(value) <= Number(normalizedRuleValue));
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
  if (field === 'daysSincePublish') {
    const publishDateMs = product.publishDate instanceof Date
      ? product.publishDate.getTime()
      : new Date(product.publishDate).getTime();

    return Number.isFinite(publishDateMs)
      ? Math.max(0, Math.floor((Date.now() - publishDateMs) / (1000 * 60 * 60 * 24)))
      : Number.MAX_SAFE_INTEGER;
  }
  if (field in product) {
    return (product as any)[field];
  }
  return product.attributes[field];
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => normalizeComparableValue(item));
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'true') {
      return true;
    }

    if (lower === 'false') {
      return false;
    }

    const asNumber = Number(trimmed);
    if (trimmed !== '' && !Number.isNaN(asNumber)) {
      return asNumber;
    }

    // Check if it's a date in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      // Parse date string as local date (start of day)
      const dateParts = trimmed.split('T')[0].split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        const dateObj = new Date(year, month, day, 0, 0, 0, 0);
        return dateObj.getTime();
      }
    }

    const asDate = Date.parse(trimmed);
    if (!Number.isNaN(asDate)) {
      return asDate;
    }

    return lower;
  }

  return value;
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
 * Applies filtering rules to products.
 * Does NOT automatically exclude out-of-stock products — add an inStock rule if needed.
 */
export function applyFilters(products: Product[], ruleGroup: RuleGroup): Product[] {
  return products.filter(product => evaluateRuleGroup(product, ruleGroup));
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
 * Builds the final arranged product list.
 * Pinned products are placed at their absolute manualOrder position in the list.
 * Non-pinned products fill the remaining slots in segment order.
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
    // Step 1: Apply pinning metadata (isPinned flags)
    const productsWithMetadata = applyPinning(filteredProducts, pinnedProducts);

    // Step 2: Build ordered non-pinned list (segments + sorting)
    const nonPinned = getNonPinnedProducts(productsWithMetadata);
    const segmentedProducts = applyBottomPush(assignSegments(nonPinned, segments), bottomRuleGroup);
    const productsBySegment = groupProductsBySegment(segmentedProducts);
    const sortedSegments = [...segments].sort((a, b) => a.priority - b.priority);

    const nonPinnedOrdered: ProductWithMetadata[] = [];
    const globalBottom: ProductWithMetadata[] = [];
    for (const segment of sortedSegments) {
      const segmentProducts = productsBySegment.get(segment.id) || [];
      const sortedSegmentProducts = sortSegment(segmentProducts, segment.sorters);
      sortedSegmentProducts.filter(p => !p.pushedToBottom).forEach(p => nonPinnedOrdered.push(p));
      sortedSegmentProducts.filter(p => p.pushedToBottom).forEach(p => globalBottom.push(p));
    }
    const unassigned = productsBySegment.get('__unassigned__') || [];
    unassigned.filter(p => !p.pushedToBottom).forEach(p => nonPinnedOrdered.push(p));
    unassigned.filter(p => p.pushedToBottom).forEach(p => globalBottom.push(p));
    globalBottom.forEach(p => nonPinnedOrdered.push(p));

    // Step 3: Build slot map for pinned products (manualOrder = absolute position in final list)
    const pinnedOrdered = getPinnedProductsOrdered(productsWithMetadata);
    const pinnedBySlot = new Map<number, ProductWithMetadata>();
    pinnedOrdered.forEach(product => {
      let slot = Math.max(0, product.pinManualOrder ?? 0);
      while (pinnedBySlot.has(slot)) slot++; // resolve collisions
      pinnedBySlot.set(slot, product);
    });

    // Step 4: Interleave: fill each position from pinned slot map or non-pinned list
    const sortedPinnedSlots = [...pinnedBySlot.entries()].sort((a, b) => a[0] - b[0]);
    let pinnedSlotIdx = 0;
    let nonPinnedIdx = 0;
    const arraggedList: ProductWithMetadata[] = [];

    while (arraggedList.length < maxProducts) {
      const nextPinnedSlot = pinnedSlotIdx < sortedPinnedSlots.length
        ? sortedPinnedSlots[pinnedSlotIdx][0]
        : Infinity;
      const currentPosition = arraggedList.length;

      if (nextPinnedSlot === currentPosition) {
        arraggedList.push({ ...sortedPinnedSlots[pinnedSlotIdx][1], sortOrder: currentPosition });
        pinnedSlotIdx++;
      } else if (nonPinnedIdx < nonPinnedOrdered.length) {
        arraggedList.push({ ...nonPinnedOrdered[nonPinnedIdx++], sortOrder: currentPosition });
      } else if (pinnedSlotIdx < sortedPinnedSlots.length) {
        // remaining pinned products beyond non-pinned list
        arraggedList.push({ ...sortedPinnedSlots[pinnedSlotIdx][1], sortOrder: currentPosition });
        pinnedSlotIdx++;
      } else {
        break;
      }
    }

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
