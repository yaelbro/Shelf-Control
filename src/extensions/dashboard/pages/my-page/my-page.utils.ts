import { inventoryItemsV3 } from '@wix/stores';
import { tags as wixTags } from '@wix/tags';

import type {
  CategoryConfig,
  FieldDefinition,
  FilterOperator,
  Product,
  RuleGroup,
} from '../../types/shelfArrangement';
import { AVAILABLE_FIELDS } from '../../types/shelfArrangement';
import { MOCK_PRODUCTS } from '../../lib/mockData';

export type ActiveTab = 'filters' | 'pinning' | 'segments' | 'preview';

export const TAB_ITEMS = [
  { id: 'filters', title: 'סינון' },
  { id: 'pinning', title: 'נעוצים' },
  { id: 'segments', title: 'מקטעים' },
  { id: 'preview', title: 'תצוגה מקדימה' },
];

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'שווה ל',
  notEquals: 'לא שווה ל',
  contains: 'מכיל',
  notContains: 'לא מכיל',
  startsWith: 'מתחיל ב',
  notStartsWith: 'לא מתחיל ב',
  endsWith: 'נגמר ב',
  notEndsWith: 'לא נגמר ב',
  oneOf: 'אחד מתוך',
  greaterThan: 'גדול מ',
  lessThan: 'קטן מ',
  greaterThanOrEqual: 'גדול או שווה ל',
  lessThanOrEqual: 'קטן או שווה ל',
};

export const OPERATOR_OPTIONS: FilterOperator[] = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'notStartsWith',
  'endsWith',
  'notEndsWith',
  'oneOf',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
];

export const FILTER_FIELD_OPTIONS = [
  { id: 'name', value: 'Product Name' },
  { id: 'description', value: 'Description' },
  { id: 'price', value: 'Price' },
  { id: 'brand', value: 'Brand' },
  { id: 'sku', value: 'Handle' },
  { id: 'productOptions', value: 'Product Options' },
  { id: 'inventory', value: 'Inventory' },
  { id: 'variantAvailabilityPercentage', value: 'Variant Availability %' },
  { id: 'publishDate', value: 'New Products' },
  { id: 'daysSincePublish', value: 'Uploaded In Last (Days)' },
] as const;

export const TEXT_FILTER_OPERATORS: FilterOperator[] = [
  'contains',
  'notContains',
  'startsWith',
  'notStartsWith',
  'endsWith',
  'notEndsWith',
  'equals',
  'notEquals',
];

export const NUMBER_FILTER_OPERATORS: FilterOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
];

export const DATE_FILTER_OPERATORS: FilterOperator[] = [
  'equals',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
];

export const SORT_FIELDS = ['inventoryPercentage', 'bestSellers', 'publishDate'];
export const PRODUCT_POOL_PAGE_SIZE = 20;
export const UI_DIRECTION: 'rtl' | 'ltr' = 'rtl';

export type CategoryOption = {
  id: string;
  name: string;
  parentId?: string;
};

export type CategoryItemReference = {
  catalogItemId?: string | null;
  appId?: string | null;
};

export type StoreCatalogProduct = {
  id?: string | null;
  _id?: string | null;
  _createdDate?: string | Date | null;
  name?: string | null;
  description?: unknown;
  brand?: unknown;
  slug?: string | null;
  visible?: boolean | null;
  actualPriceRange?: {
    minValue?: {
      amount?: string | null;
    };
  };
  compareAtPriceRange?: {
    minValue?: {
      amount?: string | null;
    };
    maxValue?: {
      amount?: string | null;
    };
  };
  actualPriceRangeMax?: {
    maxValue?: {
      amount?: string | null;
    };
  };
  media?: {
    main?: {
      image?: string | {
        url?: string | null;
      } | null;
      url?: string | null;
      uploadId?: string | null;
    };
    items?: Array<{
      image?: string | { url?: string | null } | null;
      url?: string | null;
    }>;
  };
  inventory?: {
    availabilityStatus?: string | null;
  };
  extendedFields?: {
    namespaces?: {
      _user_fields?: {
        chain?: Record<string, any>;
      };
    };
  };
  tags?: {
    publicTags?: {
      tagIds?: string[];
    } | null;
  } | null;
  options?: Array<{
    name?: string | null;
    key?: string | null;
    choicesSettings?: {
      choices?: Array<{
        name?: string | null;
        key?: string | null;
        colorCode?: string | null;
        inStock?: boolean | null;
        visible?: boolean | null;
      }>;
    };
  }>;
  variantsInfo?: {
    variants?: Array<{
      choices?: Array<{
        optionChoiceNames?: {
          optionName?: string;
          choiceName?: string;
        };
      }>;
    }>;
  };
};

export const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

export const WIX_STORES_TREE_REFERENCE = {
  appNamespace: '@wix/stores',
  treeKey: null,
} as const;

export const ROOT_CATEGORY_KEY = '__root__';

export function isWixEntityId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function extractCategoryParentId(parent: unknown): string | undefined {
  if (!parent) {
    return undefined;
  }

  if (typeof parent === 'string') {
    return parent || undefined;
  }

  if (typeof parent === 'object') {
    const parentRef = parent as {
      _id?: string | null;
      id?: string | null;
      categoryId?: string | null;
      parentId?: string | null;
    };

    return parentRef._id ?? parentRef.id ?? parentRef.categoryId ?? parentRef.parentId ?? undefined;
  }

  return undefined;
}

export function buildCategoryAncestry(categoryId: string, categoryById: Map<string, CategoryOption>): string[] {
  if (!categoryId) {
    return [];
  }

  const lineage: string[] = [];
  let current = categoryById.get(categoryId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    lineage.unshift(current.id);

    if (!current.parentId) {
      break;
    }

    current = categoryById.get(current.parentId);
  }

  return lineage;
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(
    values
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value)),
  ));
}

function normalizeOptionName(rawName: string): string {
  return rawName.trim().toLowerCase().replace(/\s+/g, '_');
}

function toWixStaticImageUrl(rawValue: string | null | undefined): string {
  if (!rawValue) {
    return '';
  }

  const value = rawValue.trim();
  if (value === '') {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('wix:image://v1/')) {
    const mediaId = value.slice('wix:image://v1/'.length).split(/[\/#?]/)[0];
    return mediaId ? `https://static.wixstatic.com/media/${mediaId}` : '';
  }

  return '';
}

function collectOptionValuesByName(catalogProduct: StoreCatalogProduct | undefined): Record<string, string[]> {
  if (!catalogProduct) {
    return {};
  }

  const optionsByName = new Map<string, Set<string>>();

  const pushValues = (rawName: string | null | undefined, values: Array<string | null | undefined>) => {
    if (!rawName || rawName.trim() === '') {
      return;
    }

    const normalizedName = normalizeOptionName(rawName);
    const currentValues = optionsByName.get(normalizedName) ?? new Set<string>();
    values.forEach(value => {
      if (value && value.trim() !== '') {
        currentValues.add(value.trim());
      }
    });
    optionsByName.set(normalizedName, currentValues);
  };

  (catalogProduct.options ?? []).forEach(option => {
    pushValues(
      option.name ?? option.key,
      (option.choicesSettings?.choices ?? []).map(choice => (
        choice.name ?? choice.key ?? choice.colorCode ?? undefined
      )),
    );
  });

  (catalogProduct.variantsInfo?.variants ?? []).forEach(variant => {
    (variant.choices ?? []).forEach(choice => {
      pushValues(choice.optionChoiceNames?.optionName, [choice.optionChoiceNames?.choiceName]);
    });
  });

  return Array.from(optionsByName.entries()).reduce<Record<string, string[]>>((acc, [name, values]) => {
    acc[name] = Array.from(values).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
    return acc;
  }, {});
}

function extractOptionValues(catalogProduct: StoreCatalogProduct | undefined, optionNames: string[]): string[] {
  if (!catalogProduct) {
    return [];
  }

  const normalizedTargets = optionNames.map(name => name.trim().toLowerCase());
  const matchesOption = (optionName?: string | null, optionKey?: string | null) => {
    const normalizedName = optionName?.trim().toLowerCase() ?? '';
    const normalizedKey = optionKey?.trim().toLowerCase() ?? '';

    return normalizedTargets.some(target => (
      normalizedName === target
      || normalizedKey === target
      || normalizedName.includes(target)
      || normalizedKey.includes(target)
    ));
  };

  const fromOptions = catalogProduct.options?.flatMap(option => {
    if (!matchesOption(option.name, option.key)) {
      return [];
    }

    return (option.choicesSettings?.choices ?? []).map(choice => (
      choice.name ?? choice.key ?? choice.colorCode ?? undefined
    ));
  }) ?? [];

  const fromVariants = catalogProduct.variantsInfo?.variants?.flatMap(variant => (
    (variant.choices ?? []).flatMap(choice => (
      matchesOption(choice.optionChoiceNames?.optionName)
        ? [choice.optionChoiceNames?.choiceName]
        : []
    ))
  )) ?? [];

  return uniqueValues([...fromOptions, ...fromVariants]);
}

// Generates 200 test products across categories for filter testing.
export function generateTestProducts(): object[] {
  const COLOR_MAP: Record<string, string> = {
    Red: '#FF0000', Blue: '#0066CC', Green: '#22A45D', White: '#FFFFFF',
    Black: '#000000', Yellow: '#FFD700', Purple: '#7B2D8B', Orange: '#FF8C00',
    Pink: '#FF69B4', Navy: '#001F5B', Grey: '#888888', Brown: '#7B4A2D',
    Olive: '#6B7048', Beige: '#D4C5A9', Teal: '#008080',
    Silver: '#C0C0C0', Gold: '#C9B037',
  };

  const colorOpt = (names: string[]) => ({
    name: 'Color',
    optionRenderType: 'SWATCH_CHOICES',
    choicesSettings: {
      choices: names.map(n => ({
        name: n,
        choiceType: 'ONE_COLOR',
        colorCode: COLOR_MAP[n] ?? '#CCCCCC',
      })),
    },
  });

  const sizeOpt = (sizes: string[]) => ({
    name: 'Size',
    optionRenderType: 'TEXT_CHOICES',
    choicesSettings: {
      choices: sizes.map(s => ({
        name: s,
        choiceType: 'CHOICE_TEXT',
      })),
    },
  });

  const makeVariants = (colors: string[], sizes: string[], price: string) => {
    if (colors.length === 0) {
      return [{ physicalProperties: {}, visible: true, price: { actualPrice: { amount: price } }, choices: [] }];
    }
    if (sizes.length === 0) {
      return colors.map(c => ({
        physicalProperties: {}, visible: true,
        price: { actualPrice: { amount: price } },
        choices: [{ optionChoiceNames: { optionName: 'Color', choiceName: c, renderType: 'SWATCH_CHOICES' } }],
      }));
    }
    return colors.flatMap(c => sizes.map(s => ({
      physicalProperties: {}, visible: true,
      price: { actualPrice: { amount: price } },
      choices: [
        { optionChoiceNames: { optionName: 'Color', choiceName: c, renderType: 'SWATCH_CHOICES' } },
        { optionChoiceNames: { optionName: 'Size', choiceName: s, renderType: 'TEXT_CHOICES' } },
      ],
    })));
  };

  const makeProduct = (name: string, colors: string[], sizes: string[], price: string) => {
    const opts = [];
    if (colors.length > 0) opts.push(colorOpt(colors));
    if (sizes.length > 0) opts.push(sizeOpt(sizes));
    return {
      name, productType: 'PHYSICAL', visible: true,
      physicalProperties: {},
      ...(opts.length > 0 ? { options: opts } : {}),
      variantsInfo: { variants: makeVariants(colors, sizes, price) },
    };
  };

  const products: object[] = [];
  const p = (base: number, i: number, step: number) => (base + (i % 10) * step).toFixed(2);

  const tColorsPool = [
    ['Red', 'Blue', 'White'], ['Black', 'Grey', 'Navy'], ['Green', 'Yellow', 'Pink'],
    ['Orange', 'Purple', 'Teal'], ['Brown', 'Olive', 'Beige'],
  ];
  const tBrands = ['StyleLine', 'UrbanCo', 'FreshWear', 'ClassicTee', 'TrendSet', 'NexFit'];
  for (let i = 0; i < 30; i++) {
    products.push(makeProduct(
      `${tBrands[i % tBrands.length]} T-Shirt #${i + 1}`,
      tColorsPool[i % tColorsPool.length], ['S', 'M', 'L', 'XL'], p(15.99, i, 2),
    ));
  }

  const jColorsPool = [['Blue', 'Black', 'Grey'], ['Brown', 'Navy', 'Olive'], ['White', 'Beige', 'Teal']];
  for (let i = 0; i < 25; i++) {
    products.push(makeProduct(
      `Denim Co. Jeans #${i + 1}`,
      jColorsPool[i % jColorsPool.length], ['28', '30', '32', '34'], p(39.99, i, 5),
    ));
  }

  const jkColorsPool = [['Black', 'Navy'], ['Brown', 'Olive'], ['Red', 'Grey'], ['Blue', 'Green']];
  for (let i = 0; i < 20; i++) {
    products.push(makeProduct(
      `UrbanEdge Jacket #${i + 1}`,
      jkColorsPool[i % jkColorsPool.length], ['S', 'M', 'L', 'XL'], p(79.99, i, 10),
    ));
  }

  const snColorsPool = [['White', 'Black'], ['Red', 'Blue'], ['Grey', 'Navy']];
  for (let i = 0; i < 20; i++) {
    products.push(makeProduct(
      `SoleStep Sneaker #${i + 1}`,
      snColorsPool[i % snColorsPool.length], ['40', '41', '42', '43'], p(59.99, i, 10),
    ));
  }

  const drColorsPool = [['Red', 'Blue', 'White'], ['Black', 'Pink', 'Yellow'], ['Green', 'Purple', 'Beige']];
  for (let i = 0; i < 15; i++) {
    products.push(makeProduct(
      `Femme Dress #${i + 1}`,
      drColorsPool[i % drColorsPool.length], ['XS', 'S', 'M'], p(49.99, i, 8),
    ));
  }

  const wColorsPool = [['Silver', 'Gold', 'Black'], ['Brown', 'Navy', 'Grey'], ['White', 'Blue', 'Red']];
  for (let i = 0; i < 20; i++) {
    products.push(makeProduct(
      `LuxTime Watch #${i + 1}`,
      wColorsPool[i % wColorsPool.length], [], p(99.99, i, 20),
    ));
  }

  const bColorsPool = [['Black', 'Brown', 'Beige', 'Red'], ['Navy', 'Grey', 'Olive', 'White']];
  for (let i = 0; i < 20; i++) {
    products.push(makeProduct(
      `CarryAll Bag #${i + 1}`,
      bColorsPool[i % bColorsPool.length], [], p(39.99, i, 12),
    ));
  }

  const eNames = ['Wireless Headphones', 'Smart Speaker', 'USB-C Hub', 'Phone Case',
    'Charging Cable', 'Power Bank', 'Earbuds', 'Webcam', 'LED Strip', 'Screen Cleaner'];
  for (let i = 0; i < 25; i++) {
    products.push(makeProduct(`TechGear ${eNames[i % eNames.length]} #${i + 1}`, [], [], p(19.99, i, 15)));
  }

  const aNames = ['Baseball Cap', 'Leather Belt', 'Wool Scarf', 'Sunglasses', 'Bracelet',
    'Pocket Square', 'Wallet', 'Tie', 'Hair Band', 'Gloves'];
  for (let i = 0; i < 25; i++) {
    products.push(makeProduct(`Classic ${aNames[i % aNames.length]} #${i + 1}`, [], [], p(9.99, i, 5)));
  }

  return products;
}

export async function fetchTagsMap(): Promise<Map<string, string>> {
  const tagsMap = new Map<string, string>();
  try {
    const response = await wixTags.listTags('wix.stores.catalog.v3.product');
    
    for (const tag of (response.tags ?? [])) {
      if (tag._id && tag.name) {
        tagsMap.set(tag._id, tag.name);
      }
    }
  } catch (error) {
    console.error('[Shelf Arrangement] Failed to fetch tags map:', error);
  }
  return tagsMap;
}

export async function fetchInventoryData(
  catalogProductsById: Map<string, StoreCatalogProduct | undefined>,
  catalogItemReferences: CategoryItemReference[],
): Promise<Map<string, number>> {
  const inventoryData = new Map<string, number>();

  try {
    const productIds = Array.from(new Set(
      catalogItemReferences
        .map(item => item.catalogItemId)
        .filter((id): id is string => Boolean(id)),
    ));

    if (productIds.length === 0) {
      return inventoryData;
    }

    const rawInventoryByProductId = new Map<string, Array<Record<string, unknown>>>();

    for (let index = 0; index < productIds.length; index += 100) {
      const productIdsChunk = productIds.slice(index, index + 100);
      let page = await inventoryItemsV3
        .queryInventoryItems()
        .in('productId', productIdsChunk)
        .limit(1000)
        .find();
      console.log("-page", page);

      while (true) {
        page.items.forEach(item => {
          const productId = item.productId;
          if (!productId) {
            return;
          }

          const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
          const currentTotal = inventoryData.get(productId) ?? 0;
          inventoryData.set(productId, currentTotal + quantity);

          const rawItems = rawInventoryByProductId.get(productId) ?? [];
          rawItems.push({
            _id: item._id ?? null,
            productId: item.productId ?? null,
            variantId: item.variantId ?? null,
            locationId: item.locationId ?? null,
            quantity: item.quantity ?? null,
            inStock: item.inStock ?? null,
            trackQuantity: item.trackQuantity ?? null,
            availabilityStatus: item.availabilityStatus ?? null,
            preorderInfo: item.preorderInfo ?? null,
          });
          rawInventoryByProductId.set(productId, rawItems);
        });

        if (!page.hasNext()) {
          break;
        }

        page = await page.next();
      }
    }

    const debugRows = productIds.map(productId => {
      const rawItems = rawInventoryByProductId.get(productId) ?? [];
      const totalQuantity = inventoryData.get(productId) ?? 0;
      const catalogProduct = catalogProductsById.get(productId);

      return {
        productId,
        productName: catalogProduct?.name ?? '',
        inventoryItemsCount: rawItems.length,
        totalQuantity,
        rawInventoryItems: rawItems,
      };
    });

    console.groupCollapsed(`[Shelf Arrangement] Raw queryInventoryItems data for ${debugRows.length} products`);
    console.table(debugRows.map(row => ({
      productId: row.productId,
      productName: row.productName,
      inventoryItemsCount: row.inventoryItemsCount,
      totalQuantity: row.totalQuantity,
    })));
    debugRows.forEach(row => {
      console.log(`[Inventory RAW] productId=${row.productId}`, row.rawInventoryItems);
    });
    console.groupEnd();
  } catch (error) {
    console.warn('Failed to fetch inventory data from queryInventoryItems:', error);
  }

  return inventoryData;
}

export function mapCategoryItemToProduct(
  item: CategoryItemReference,
  catalogProduct: StoreCatalogProduct | undefined,
  categoryName: string,
  index: number,
  inventoryData?: Map<string, number>,
  tagsMap?: Map<string, string>,
): Product {
  console.log('item',item);
  console.log('catalogPRoduct',catalogProduct);
  
  const resolvedName = typeof catalogProduct?.name === 'string'
    ? catalogProduct.name
    : ((catalogProduct as unknown as { name?: { original?: string; value?: string } })?.name?.original
      ?? (catalogProduct as unknown as { name?: { original?: string; value?: string } })?.name?.value
      ?? '');
  const mediaMainImageRaw = catalogProduct?.media?.main?.image;
  const mediaMainImageUrl = typeof mediaMainImageRaw === 'string'
    ? mediaMainImageRaw
    : mediaMainImageRaw?.url;
  const mediaMainUrl = catalogProduct?.media?.main?.url;
  const mediaMainUploadId = catalogProduct?.media?.main?.uploadId;
  const mediaItemsFirst = catalogProduct?.media?.items?.[0];
  const mediaItemsFirstImageUrl = typeof mediaItemsFirst?.image === 'string'
    ? mediaItemsFirst.image
    : mediaItemsFirst?.image?.url;
  const resolvedImageUrl = [
    toWixStaticImageUrl(mediaMainImageUrl),
    toWixStaticImageUrl(mediaMainUrl),
    mediaMainUploadId ? `https://static.wixstatic.com/media/${mediaMainUploadId}` : '',
    toWixStaticImageUrl(mediaItemsFirstImageUrl),
    toWixStaticImageUrl(mediaItemsFirst?.url),
  ].find(url => Boolean(url)) ?? '';

  if (!resolvedImageUrl && catalogProduct) {
    console.warn('[Image mapping] missing image url after mapping', {
      productId: catalogProduct._id ?? catalogProduct.id ?? item.catalogItemId ?? '',
      productName: resolvedName,
      media: catalogProduct.media,
    });
  }

  const itemId = item.catalogItemId ?? `catalog-item-${index + 1}`;
  const mockMatch = MOCK_PRODUCTS.find(product => (
    product.id === item.catalogItemId || product.variantId === item.catalogItemId
  ));
  const createdDate = catalogProduct?._createdDate ?? mockMatch?.publishDate ?? new Date();
  const price = Number(catalogProduct?.actualPriceRange?.minValue?.amount ?? mockMatch?.price ?? 0);
  const priceMaxRaw = Number(catalogProduct?.compareAtPriceRange?.maxValue?.amount
    ?? catalogProduct?.actualPriceRangeMax?.maxValue?.amount
    ?? 0);
  const priceBeforeDiscountRaw = Number(catalogProduct?.compareAtPriceRange?.minValue?.amount ?? 0);
  const inStock = catalogProduct?.inventory?.availabilityStatus
    ? catalogProduct.inventory.availabilityStatus !== 'OUT_OF_STOCK'
    : mockMatch?.inStock ?? (catalogProduct?.visible ?? true);
  const catalogColors = extractOptionValues(catalogProduct, ['color', 'colour']);
  const catalogSizes = extractOptionValues(catalogProduct, ['size']);
  const optionValuesByName = collectOptionValuesByName(catalogProduct);

  let inventoryQuantity = mockMatch?.inventory ?? 1;
  if (inventoryData && itemId) {
    const fetchedQuantity = inventoryData.get(itemId);
    if (fetchedQuantity !== undefined) {
      inventoryQuantity = fetchedQuantity;
    }
  }

  const flattenedOptionAttributes = Object.entries(optionValuesByName).reduce<Record<string, Array<string>>>(
    (acc, [optionName, optionValues]) => {
      acc[`productOption.${optionName}`] = optionValues;
      return acc;
    },
    {},
  );

  const description = typeof catalogProduct?.description === 'string'
    ? catalogProduct.description
    : (typeof mockMatch?.attributes?.description === 'string' ? mockMatch.attributes.description : '');

  const extendedFieldsChain = catalogProduct?.extendedFields?.namespaces?._user_fields?.chain;
  let brand = '';
  if (extendedFieldsChain && typeof extendedFieldsChain === 'object') {
    const chainValue = Object.values(extendedFieldsChain)[0];
    if (typeof chainValue === 'string') {
      brand = chainValue;
    } else if (chainValue && typeof chainValue === 'object' && 'text' in chainValue) {
      brand = (chainValue as any).text;
    }
  }

  if (!brand && typeof mockMatch?.attributes?.brand === 'string') {
    brand = mockMatch.attributes.brand;
  }

  return {
    id: itemId,
    name: resolvedName || mockMatch?.name || `Store Product ${index + 1}`,
    sku: catalogProduct?.slug ?? mockMatch?.sku ?? itemId,
    variantId: itemId,
    category: categoryName,
    inventory: inStock ? inventoryQuantity : 0,
    inventoryPercentage: (() => {
      // Variant = a specific SIZE (or other non-color attribute).
      // Color is already handled at the product-grouping level (each catalog product is one color),
      // so SWATCH_CHOICES dimensions are excluded here.
      // choice.inStock = false → ALL variants containing that choice are OOS (definitive).
      // choice.inStock = true  → at least one variant with that choice is IS.
      const rawOptions = (catalogProduct as any)?.options as Array<{
        optionRenderType?: string;
        choicesSettings?: { choices?: Array<{ inStock?: boolean | null; visible?: boolean | null }> };
      }> | undefined;
      const optionDimensions = (rawOptions ?? [])
        .filter(opt => opt.optionRenderType !== 'SWATCH_CHOICES')
        .map(opt =>
          (opt.choicesSettings?.choices ?? [])
            .filter(c => c.visible !== false && c.inStock !== undefined && c.inStock !== null),
        )
        .filter(choices => choices.length > 0);

      let choiceBasedPct: number | null = null;
      if (optionDimensions.length > 0) {
        let totalVariants = 1;
        let inStockVariants = 1;
        for (const choices of optionDimensions) {
          totalVariants *= choices.length;
          inStockVariants *= choices.filter(c => c.inStock === true).length;
        }
        choiceBasedPct = Math.round((inStockVariants / totalVariants) * 100);
      }

      // Always cross-check with availability status because choice.inStock = true is not
      // sufficient: a specific variant combination can still be OOS even when every
      // individual choice is marked in-stock (some other combination keeps it "alive").
      const status = catalogProduct?.inventory?.availabilityStatus;
      const variantCount = (catalogProduct as any)?.variantSummary?.variantCount as number | undefined;
      if (status === 'OUT_OF_STOCK') return 0;
      if (status === 'IN_STOCK') return 100;
      if (status === 'PARTIALLY_OUT_OF_STOCK') {
        // choiceBasedPct = (inStock sizes) / (total sizes) — use directly.
        if (choiceBasedPct !== null && choiceBasedPct < 100) return choiceBasedPct;
        // All size choices report inStock: true despite PARTIALLY status — fall back to variantCount.
        if (variantCount && variantCount > 1) return Math.round(((variantCount - 1) / variantCount) * 100);
        return 50;
      }
      // Unknown / missing status – use choice data or final fallback.
      if (choiceBasedPct !== null) return choiceBasedPct;
      return inStock ? (mockMatch?.inventoryPercentage ?? 100) : 0;
    })(),
    price,
    priceBeforeDiscount: priceBeforeDiscountRaw > price ? priceBeforeDiscountRaw : undefined,
    priceMax: priceMaxRaw > price ? priceMaxRaw : undefined,
    color: catalogColors.length > 1 ? catalogColors : (catalogColors[0] ?? mockMatch?.color),
    size: catalogSizes.length > 1 ? catalogSizes : (catalogSizes[0] ?? mockMatch?.size),
    publishDate: createdDate instanceof Date ? createdDate : new Date(createdDate),
    bestSellers: mockMatch?.bestSellers ?? 0,
    inStock,
    attributes: {
      ...(mockMatch?.attributes ?? {}),
      appId: item.appId ?? WIX_STORES_APP_ID,
      slug: catalogProduct?.slug ?? '',
      description,
      brand,
      imageUrl: resolvedImageUrl,
      source: catalogProduct ? 'wix-catalog-product' : 'wix-category-item',
      visible: catalogProduct?.visible ?? true,
      colorOptions: catalogColors,
      sizeOptions: catalogSizes,
      ...flattenedOptionAttributes,
    },
  };
}

function normalizeColorToken(color: string): string {
  return color.trim().toLowerCase().replace(/\s+/g, '-');
}

export function expandProductsByColor(products: Product[]): Product[] {
  const expanded = products.flatMap(product => {
    const rawColors = Array.isArray(product.color)
      ? product.color
      : (typeof product.color === 'string' && product.color.trim() ? [product.color] : []);

    const uniqueColors = Array.from(new Set(
      rawColors
        .map(color => color.trim())
        .filter(Boolean),
    ));

    if (uniqueColors.length <= 1) {
      return [{
        ...product,
        color: uniqueColors[0] ?? product.color,
        attributes: {
          ...product.attributes,
          baseVariantId: product.variantId,
          colorModel: uniqueColors[0] ?? '',
        },
      }];
    }

    return uniqueColors.map((color, index) => ({
      ...product,
      variantId: `${product.variantId}::color::${normalizeColorToken(color)}::${index + 1}`,
      color,
      attributes: {
        ...product.attributes,
        baseVariantId: product.variantId,
        colorModel: color,
      },
    }));
  });

  const productsByBaseVariantId = new Map<string, Product[]>();
  expanded.forEach(product => {
    const baseVariantId = getBaseVariantId(product);
    const group = productsByBaseVariantId.get(baseVariantId) ?? [];
    group.push(product);
    productsByBaseVariantId.set(baseVariantId, group);
  });

  return expanded.map(product => {
    const baseVariantId = getBaseVariantId(product);
    const siblings = productsByBaseVariantId.get(baseVariantId) ?? [product];
    // Use inventoryPercentage (which accounts for partially-OOS products) instead of the
    // boolean inStock flag, which is true even for PARTIALLY_OUT_OF_STOCK products.
    const variantAvailabilityPercentage = siblings.length > 0
      ? Math.round(siblings.reduce((sum, item) => sum + item.inventoryPercentage, 0) / siblings.length)
      : 0;
    const publishDateMs = product.publishDate instanceof Date
      ? product.publishDate.getTime()
      : new Date(product.publishDate).getTime();
    const isNewProduct = Number.isFinite(publishDateMs)
      ? (Date.now() - publishDateMs) <= (1000 * 60 * 60 * 24 * 30)
      : false;

    return {
      ...product,
      attributes: {
        ...product.attributes,
        variantAvailabilityPercentage,
        isNewProduct,
      },
    };
  });
}

export function getBaseVariantId(product: Product): string {
  const baseVariantId = product.attributes.baseVariantId;
  return typeof baseVariantId === 'string' && baseVariantId.trim() !== ''
    ? baseVariantId
    : product.variantId;
}

export function cloneConfig(config: CategoryConfig): CategoryConfig {
  return {
    ...config,
    createdAt: new Date(config.createdAt),
    updatedAt: new Date(config.updatedAt),
    filterRuleGroup: {
      ...config.filterRuleGroup,
      rules: config.filterRuleGroup.rules.map(rule => ({ ...rule })),
    },
    bottomRuleGroup: {
      logic: config.bottomRuleGroup?.logic ?? 'AND',
      rules: (config.bottomRuleGroup?.rules ?? []).map(rule => ({ ...rule })),
    },
    pinnedProducts: config.pinnedProducts.map(p => ({ ...p, pinnedAt: new Date(p.pinnedAt) })),
    segments: config.segments.map(segment => ({
      ...segment,
      filters: {
        ...segment.filters,
        rules: segment.filters.rules.map(rule => ({ ...rule })),
      },
      sorters: segment.sorters.map(sortRule => ({ ...sortRule })),
    })),
  };
}

function normalizeRuleToken(rawValue: string): string | number | boolean {
  const trimmed = rawValue.trim();

  if (trimmed.toLowerCase() === 'true') {
    return true;
  }

  if (trimmed.toLowerCase() === 'false') {
    return false;
  }

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed !== '') {
    return asNumber;
  }

  return trimmed;
}

export function coerceValue(operator: FilterOperator, rawValue: string): string | number | boolean | Array<string | number | boolean> {
  if (operator === 'oneOf') {
    return rawValue
      .split(',')
      .map(part => normalizeRuleToken(part))
      .filter(part => part !== '');
  }

  return normalizeRuleToken(rawValue);
}

function formatFieldLabelInternal(fieldName: string): string {
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function formatFieldLabel(fieldName: string): string {
  return formatFieldLabelInternal(fieldName);
}

export function formatProductOptionName(optionName: string): string {
  return optionName
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildCatalogFieldDefinitions(products: Product[]): FieldDefinition[] {
  const defaults: FieldDefinition[] = AVAILABLE_FIELDS.map(field => ({
    ...field,
    options: field.options ? [...field.options] : undefined,
  }));
  const definitions = new Map<string, FieldDefinition>(defaults.map(field => [field.name, field]));
  const valueOptions = new Map<string, Set<string>>();
  const typeHints = new Map<string, Set<FieldDefinition['type']>>();
  const defaultOrder = new Map(AVAILABLE_FIELDS.map((field, index) => [field.name, index]));

  const addTypeHint = (fieldName: string, type: FieldDefinition['type']) => {
    const currentHints = typeHints.get(fieldName) ?? new Set<FieldDefinition['type']>();
    currentHints.add(type);
    typeHints.set(fieldName, currentHints);
  };

  const registerFieldValue = (fieldName: string, label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => registerFieldValue(fieldName, label, item));
      return;
    }

    if (!definitions.has(fieldName)) {
      definitions.set(fieldName, { name: fieldName, label, type: 'string', options: undefined });
    }

    const currentOptions = valueOptions.get(fieldName) ?? new Set<string>();

    if (value instanceof Date) {
      addTypeHint(fieldName, 'date');
      currentOptions.add(value.toISOString().slice(0, 10));
    } else if (typeof value === 'boolean') {
      addTypeHint(fieldName, 'boolean');
      currentOptions.add(String(value));
    } else if (typeof value === 'number') {
      addTypeHint(fieldName, 'number');
      currentOptions.add(String(value));
    } else {
      addTypeHint(fieldName, 'string');
      currentOptions.add(String(value));
    }

    valueOptions.set(fieldName, currentOptions);
  };

  products.forEach(product => {
    const publishDateMs = product.publishDate instanceof Date
      ? product.publishDate.getTime()
      : new Date(product.publishDate).getTime();
    const daysSincePublish = Number.isFinite(publishDateMs)
      ? Math.max(0, Math.floor((Date.now() - publishDateMs) / (1000 * 60 * 60 * 24)))
      : Number.MAX_SAFE_INTEGER;

    registerFieldValue('name', 'שם מוצר', product.name);
    registerFieldValue('description', 'תיאור', product.attributes.description);
    registerFieldValue('brand', 'מותג', product.attributes.brand);
    registerFieldValue('sku', 'SKU / כתובת מוצר', product.sku);
    registerFieldValue('variantId', 'מזהה וריאנט', product.variantId);
    registerFieldValue('color', 'צבע', product.color);
    registerFieldValue('size', 'מידה', product.size);
    registerFieldValue('inventory', 'יחידות מלאי', product.inventory);
    registerFieldValue('inventoryPercentage', 'רמת מלאי (%)', product.inventoryPercentage);
    registerFieldValue('price', 'מחיר', product.price);
    registerFieldValue('publishDate', 'תאריך פרסום', product.publishDate);
    registerFieldValue('daysSincePublish', 'ימים מאז העלאה', daysSincePublish);
    registerFieldValue('variantAvailabilityPercentage', 'אחוז זמינות וריאנטים', product.attributes.variantAvailabilityPercentage);
    registerFieldValue('isNewProduct', 'מוצר חדש', product.attributes.isNewProduct);
    registerFieldValue('bestSellers', 'רבי מכר', product.bestSellers);
    registerFieldValue('inStock', 'במלאי', product.inStock);

    Object.entries(product.attributes ?? {}).forEach(([fieldName, value]) => {
      registerFieldValue(fieldName, formatFieldLabelInternal(fieldName), value);
    });
  });

  return Array.from(definitions.values())
    .filter(field => valueOptions.has(field.name) || defaultOrder.has(field.name))
    .map(field => {
      const distinctValues = Array.from(valueOptions.get(field.name) ?? []).sort((left, right) => (
        left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
      ));
      const hints = typeHints.get(field.name) ?? new Set<FieldDefinition['type']>();
      let type = field.type;

      if (hints.size === 1 && !hints.has('select')) {
        type = Array.from(hints)[0];
      } else if (field.type === 'string' && distinctValues.length > 0 && distinctValues.length <= 12) {
        type = 'select';
      }

      if (['color', 'size', 'source'].includes(field.name) && distinctValues.length > 0) {
        type = 'select';
      }

      const baseOptionValues = field.options?.map(option => option.value) ?? [];
      const mergedOptionValues = distinctValues.length > 0 ? distinctValues : baseOptionValues;
      const options = mergedOptionValues.length > 0
        ? mergedOptionValues.map(optionValue => ({
          label: optionValue === 'true' ? 'כן' : optionValue === 'false' ? 'לא' : optionValue,
          value: optionValue,
        }))
        : undefined;

      return {
        ...field,
        type,
        options,
      };
    })
    .sort((left, right) => {
      const leftOrder = defaultOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = defaultOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.label.localeCompare(right.label);
    });
}

export function getRuleHint(group: RuleGroup): string {
  if (group.rules.length === 0) {
    return 'עדיין אין חוקים';
  }

  return `${group.rules.length} חוקים (${group.logic})`;
}
