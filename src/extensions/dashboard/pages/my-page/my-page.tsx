import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Dropdown,
  Input,
  Page,
  SectionHelper,
  Tabs,
  Text,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { dashboard } from '@wix/dashboard';
import { createClient } from '@wix/sdk';
import { categories as wixCategories } from '@wix/categories';
import { items as wixDataItems } from '@wix/data';
import { inventoryItemsV3, productsV3 } from '@wix/stores';

const SHELF_COLLECTION_ID = '@gowix25/shelf-control/ShelfArrangements';

import type {
  ArrangementResult,
  CategoryConfig,
  FieldDefinition,
  FilterOperator,
  Product,
  Rule,
  RuleGroup,
  Segment,
  SortDirection,
  SortRule,
} from '../../types/shelfArrangement';
import { AVAILABLE_FIELDS, AVAILABLE_OPERATORS } from '../../types/shelfArrangement';
import {
  applyFilters,
  generateArrangement,
  promoteProduct,
  reorderPinnedProducts,
  unpinProduct,
} from '../../lib/shelfArrangementLogic';
import {
  MOCK_DEFAULT_CONFIG,
  formatPercentage,
  formatPrice,
  generateId,
} from '../../lib/mockData';
import { MainFilterEditor } from './components/MainFilterEditor';
import type { RuleDraftState } from './components/MainFilterEditor';
import { CategorySelectorCard } from './components/CategorySelectorCard';
import { ProductPoolGrid } from './components/ProductPoolGrid';
import { FiltersTabContent } from './components/FiltersTabContent';
import { PinningTabContent } from './components/PinningTabContent';
import { PreviewTabContent } from './components/PreviewTabContent';
import { SegmentsTabContent } from './components/SegmentsTabContent';
import {
  DATE_FILTER_OPERATORS,
  FILTER_FIELD_OPTIONS,
  NUMBER_FILTER_OPERATORS,
  OPERATOR_OPTIONS,
  PRODUCT_POOL_PAGE_SIZE,
  ROOT_CATEGORY_KEY,
  SORT_FIELDS,
  TEXT_FILTER_OPERATORS,
  WIX_STORES_APP_ID,
  WIX_STORES_TREE_REFERENCE,
  buildCatalogFieldDefinitions,
  buildCategoryAncestry,
  cloneConfig,
  coerceValue,
  expandProductsByColor,
  extractCategoryParentId,
  fetchInventoryData,
  fetchTagsMap,
  formatFieldLabel,
  formatProductOptionName,
  generateTestProducts,
  getBaseVariantId,
  isWixEntityId,
  mapCategoryItemToProduct,
  type ActiveTab,
  type CategoryItemReference,
  type CategoryOption,
  type StoreCatalogProduct,
} from './my-page.utils';

type Language = 'he' | 'en';

const ShelfArrangementDashboard: FC = () => {
  const [language, setLanguage] = useState<Language>('he');
  const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
  const [config, setConfig] = useState<CategoryConfig>(() => cloneConfig(MOCK_DEFAULT_CONFIG));
  const [previewResult, setPreviewResult] = useState<ArrangementResult | null>(null);
  const [undoStack, setUndoStack] = useState<CategoryConfig[]>([]);
  const [draggedVariantId, setDraggedVariantId] = useState<string | null>(null);
  const [dragOverVariantId, setDragOverVariantId] = useState<string | null>(null);

  const [newRule, setNewRule] = useState<RuleDraftState>({
    field: 'name',
    operator: 'contains',
    value: '',
    optionName: '',
    isExclusion: false,
  });

  const [newBottomRule, setNewBottomRule] = useState<RuleDraftState>({
    field: 'inventoryPercentage',
    operator: 'lessThan',
    value: '15',
    optionName: '',
    isExclusion: false,
  });

  const [newSegmentName, setNewSegmentName] = useState('');
  const [segmentDrafts, setSegmentDrafts] = useState<Record<string, RuleDraftState>>({});
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[] | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isSavingArrangement, setIsSavingArrangement] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSeedingProducts, setIsSeedingProducts] = useState(false);
  const [productPoolPage, setProductPoolPage] = useState(1);
  const [pinningPage, setPinningPage] = useState(1);
  const [promotedVariantIds, setPromotedVariantIds] = useState<string[]>([]);
  const [releasedPinSlots, setReleasedPinSlots] = useState<Record<string, number>>({});
  const [pendingProductsCategoryId, setPendingProductsCategoryId] = useState<string | null>(null);
  const [pendingProductsCategoryName, setPendingProductsCategoryName] = useState<string>('');
  const [productsLoadTrigger, setProductsLoadTrigger] = useState(0);
  const [lastLoadedCategoryId, setLastLoadedCategoryId] = useState<string | null>(null);
  const [selectedLevel1CategoryId, setSelectedLevel1CategoryId] = useState<string | undefined>(undefined);
  const [selectedLevel2CategoryId, setSelectedLevel2CategoryId] = useState<string | undefined>(undefined);
  const [selectedLevel3CategoryId, setSelectedLevel3CategoryId] = useState<string | undefined>(undefined);
  const [selectedLevel4CategoryId, setSelectedLevel4CategoryId] = useState<string | undefined>(undefined);
  const [selectedLevel5CategoryId, setSelectedLevel5CategoryId] = useState<string | undefined>(undefined);
  const [globalPushOutOfStockToBottom, setGlobalPushOutOfStockToBottom] = useState(false);

  // ── Arrangement templates ─────────────────────────────────────────────────
  type ArrangementTemplate = { id: string; name: string; configJson: string };
  const [savedTemplates, setSavedTemplates] = useState<ArrangementTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveName, setTemplateSaveName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  const t = useCallback((he: string, en: string) => (language === 'he' ? he : en), [language]);
  const uiDirection: 'rtl' | 'ltr' = language === 'he' ? 'rtl' : 'ltr';

  const tabItems = useMemo(() => ([
    { id: 'filters', title: t('סינון', 'Filters') },
    { id: 'pinning', title: t('נעוצים', 'Pinning') },
    { id: 'segments', title: t('מקטעים', 'Segments') },
    { id: 'preview', title: t('תצוגה מקדימה', 'Preview') },
  ]), [t]);

  const operatorLabels = useMemo<Record<FilterOperator, string>>(() => ({
    equals: t('שווה ל', 'Equals'),
    notEquals: t('לא שווה ל', 'Not equals'),
    contains: t('מכיל', 'Contains'),
    notContains: t('לא מכיל', 'Does not contain'),
    startsWith: t('מתחיל ב', 'Starts with'),
    notStartsWith: t('לא מתחיל ב', 'Does not start with'),
    endsWith: t('נגמר ב', 'Ends with'),
    notEndsWith: t('לא נגמר ב', 'Does not end with'),
    oneOf: t('אחד מתוך', 'One of'),
    greaterThan: t('גדול מ', 'Greater than'),
    lessThan: t('קטן מ', 'Less than'),
    greaterThanOrEqual: t('גדול או שווה ל', 'Greater than or equal'),
    lessThanOrEqual: t('קטן או שווה ל', 'Less than or equal'),
  }), [t]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem('shelf-dashboard-language');
    if (saved === 'he' || saved === 'en') {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('shelf-dashboard-language', language);
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem('shelf-global-push-out-of-stock');
    if (saved === 'true') {
      setGlobalPushOutOfStockToBottom(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('shelf-global-push-out-of-stock', String(globalPushOutOfStockToBottom));
  }, [globalPushOutOfStockToBottom]);

  const categoriesById = useMemo(
    () => new Map(availableCategories.map(category => [category.id, category])),
    [availableCategories],
  );

  const categoriesByParentId = useMemo(() => {
    const grouped = new Map<string, CategoryOption[]>();

    availableCategories.forEach(category => {
      const hasValidParent = Boolean(
        category.parentId
        && category.parentId !== category.id
        && categoriesById.has(category.parentId),
      );
      const parentKey = hasValidParent ? category.parentId! : ROOT_CATEGORY_KEY;
      const currentGroup = grouped.get(parentKey) ?? [];
      currentGroup.push(category);
      grouped.set(parentKey, currentGroup);
    });

    grouped.forEach(group => {
      group.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
    });

    return grouped;
  }, [availableCategories, categoriesById]);

  const level1Categories = useMemo(
    () => categoriesByParentId.get(ROOT_CATEGORY_KEY) ?? [],
    [categoriesByParentId],
  );

  const level2Categories = useMemo(
    () => (selectedLevel1CategoryId ? categoriesByParentId.get(selectedLevel1CategoryId) ?? [] : []),
    [categoriesByParentId, selectedLevel1CategoryId],
  );

  const level3Categories = useMemo(
    () => (selectedLevel2CategoryId ? categoriesByParentId.get(selectedLevel2CategoryId) ?? [] : []),
    [categoriesByParentId, selectedLevel2CategoryId],
  );

  const level4Categories = useMemo(
    () => (selectedLevel3CategoryId ? categoriesByParentId.get(selectedLevel3CategoryId) ?? [] : []),
    [categoriesByParentId, selectedLevel3CategoryId],
  );

  const level5Categories = useMemo(
    () => (selectedLevel4CategoryId ? categoriesByParentId.get(selectedLevel4CategoryId) ?? [] : []),
    [categoriesByParentId, selectedLevel4CategoryId],
  );

  useEffect(() => {
    const lineage = buildCategoryAncestry(config.categoryId, categoriesById);

    setSelectedLevel1CategoryId(lineage[0]);
    setSelectedLevel2CategoryId(lineage[1]);
    setSelectedLevel3CategoryId(lineage[2]);
    setSelectedLevel4CategoryId(lineage[3]);
    setSelectedLevel5CategoryId(lineage[4]);
  }, [categoriesById, config.categoryId]);

  const sourceProducts = useMemo(
    () => expandProductsByColor(categoryProducts ?? []),
    [categoryProducts],
  );
  const catalogFieldDefinitions = useMemo(
    () => buildCatalogFieldDefinitions(sourceProducts),
    [sourceProducts],
  );

  const fieldDefinitionMap = useMemo(
    () => new Map(catalogFieldDefinitions.map(field => [field.name, field])),
    [catalogFieldDefinitions],
  );

  const productOptionValuesByName = useMemo(() => {
    const optionsByName = new Map<string, Set<string>>();

    sourceProducts.forEach(product => {
      Object.entries(product.attributes ?? {}).forEach(([attributeName, rawValue]) => {
        if (!attributeName.startsWith('productOption.')) {
          return;
        }

        const optionName = attributeName.replace('productOption.', '');
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        const currentValues = optionsByName.get(optionName) ?? new Set<string>();

        values.forEach(value => {
          const asText = String(value ?? '').trim();
          if (asText !== '') {
            currentValues.add(asText);
          }
        });

        optionsByName.set(optionName, currentValues);
      });
    });

    return Array.from(optionsByName.entries())
      .sort((left, right) => left[0].localeCompare(right[0], undefined, { sensitivity: 'base' }))
      .reduce<Record<string, string[]>>((acc, [name, values]) => {
        acc[name] = Array.from(values).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
        return acc;
      }, {});
  }, [sourceProducts]);

  const firstProductOptionName = useMemo(
    () => Object.keys(productOptionValuesByName)[0] ?? '',
    [productOptionValuesByName],
  );

  const getOperatorsForField = useCallback((fieldName: string) => {
    if (fieldName === 'productOptions') {
      return ['contains', 'notContains'] as FilterOperator[];
    }

    if (fieldName === 'daysSincePublish') {
      return NUMBER_FILTER_OPERATORS;
    }

    const fieldType = fieldDefinitionMap.get(fieldName)?.type ?? 'string';
    return AVAILABLE_OPERATORS[fieldType] ?? OPERATOR_OPTIONS;
  }, [fieldDefinitionMap]);

  const getDefaultOperator = useCallback((fieldName: string): FilterOperator => {
    const field = fieldDefinitionMap.get(fieldName);
    const operators = getOperatorsForField(fieldName);

    if (fieldName === 'productOptions') {
      return operators[0] ?? 'contains';
    }

    if (fieldName === 'daysSincePublish') {
      return 'lessThanOrEqual';
    }

    if (field?.options?.length && operators.includes('oneOf')) {
      return 'oneOf';
    }

    return operators[0] ?? 'equals';
  }, [fieldDefinitionMap, getOperatorsForField]);

  const getSuggestedValue = useCallback((fieldName: string, optionName?: string) => {
    if (fieldName === 'productOptions') {
      const safeOptionName = optionName ?? firstProductOptionName;
      return productOptionValuesByName[safeOptionName]?.[0] ?? '';
    }

    if (fieldName === 'daysSincePublish') {
      return '30';
    }

    const field = fieldDefinitionMap.get(fieldName);

    if (field?.type === 'boolean') {
      return field.options?.find(option => option.value === 'true')?.value ?? 'true';
    }

    return field?.options?.[0]?.value ?? '';
  }, [fieldDefinitionMap, firstProductOptionName, productOptionValuesByName]);

  useEffect(() => {
    const syncDraft = (prev: RuleDraftState): RuleDraftState => {
      if (prev.field === 'productOptions') {
        const nextOperators = getOperatorsForField(prev.field);
        const nextOperator = nextOperators.includes(prev.operator) ? prev.operator : getDefaultOperator(prev.field);
        const nextOptionName = prev.optionName || firstProductOptionName;
        const optionValues = productOptionValuesByName[nextOptionName] ?? [];
        const nextValue = optionValues.includes(prev.value) ? prev.value : (optionValues[0] ?? '');

        if (nextOperator === prev.operator && nextValue === prev.value && nextOptionName === prev.optionName) {
          return prev;
        }

        return {
          ...prev,
          operator: nextOperator,
          optionName: nextOptionName,
          value: nextValue,
        };
      }

      const field = fieldDefinitionMap.get(prev.field);
      const nextOperators = getOperatorsForField(prev.field);
      const nextOperator = nextOperators.includes(prev.operator) ? prev.operator : getDefaultOperator(prev.field);
      const hasOptions = Boolean(field?.options?.length);
      const hasCurrentValue = prev.value.trim() !== '';
      const currentValueIsAvailable = !hasOptions || field?.options?.some(option => option.value === prev.value);
      const nextValue = !hasCurrentValue || !currentValueIsAvailable
        ? getSuggestedValue(prev.field)
        : prev.value;

      if (nextOperator === prev.operator && nextValue === prev.value) {
        return prev;
      }

      return {
        ...prev,
        operator: nextOperator,
        value: nextValue,
      };
    };

    setNewRule(syncDraft);
    setNewBottomRule(syncDraft);
  }, [fieldDefinitionMap, firstProductOptionName, getDefaultOperator, getOperatorsForField, getSuggestedValue, productOptionValuesByName]);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      createClient({
        auth: dashboard.auth(),
        host: dashboard.host(),
      }).enableContext('module');
      const result = await wixDataItems.query(SHELF_COLLECTION_ID)
        .eq('isTemplate', true)
        .ascending('templateName')
        .find();
      const templates: ArrangementTemplate[] = (
        result.items as Array<{ _id?: string; templateName?: string; configJson?: string }>
      ).flatMap(item =>
        item._id && item.templateName && item.configJson
          ? [{ id: item._id, name: item.templateName, configJson: item.configJson }]
          : [],
      );
      setSavedTemplates(templates);
    } catch (error) {
      console.warn('[Shelf Arrangement] Failed to load templates', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      setCategoriesError(null);

      try {
        createClient({
          auth: dashboard.auth(),
          host: dashboard.host(),
        }).enableContext('module');

        const optionsC = {
          query: {
            sort: [
              {
                fieldName: 'createdDate',
                order: 'DESC' as const,
              },
            ],
          },
          treeReference: WIX_STORES_TREE_REFERENCE,
          returnNonVisibleCategories: false,
        };

        const response = await wixCategories.queryCategories(optionsC).find();

        if (isCancelled) {
          return;
        }

        const liveCategories: CategoryOption[] = response.items.flatMap(item => {
          const category = item as {
            _id?: string | null;
            name?: string | null;
            parentCategory?: unknown;
            parent?: unknown;
          };

          if (!category._id || !category.name) {
            return [];
          }

          return [{
            id: category._id,
            name: category.name,
            parentId: extractCategoryParentId(category.parentCategory ?? category.parent),
          }];
        });

        if (liveCategories.length === 0) {
          setAvailableCategories([]);
          setCategoriesError(t('לא התקבלו קטגוריות מהחנות.', 'No categories were returned from the store.'));
          return;
        }

        setAvailableCategories(liveCategories);
        setConfig(prev => {
          const matchingCategory = liveCategories.find(category => (
            category.id === prev.categoryId || category.name === prev.categoryName
          ));

          if (!matchingCategory || matchingCategory.id === prev.categoryId) {
            return prev;
          }

          return { ...prev, categoryId: matchingCategory.id };
        });
      } catch (error) {
        console.error('Failed to load Wix categories', error);

        const statusCode = (error as { details?: { applicationError?: { code?: number } } })
          ?.details?.applicationError?.code;

        if (!isCancelled) {
          setAvailableCategories([]);
          setCategoriesError(
            statusCode === 403
              ? t('Wix חסם גישה לקטגוריות (403). יש לוודא שלאפליקציה יש הרשאת READ CATEGORIES ולשחרר שוב.', 'Wix blocked category access (403). Verify the app has READ CATEGORIES permission and release again.')
              : t('לא ניתן היה לטעון קטגוריות מ-Wix.', 'Could not load categories from Wix.'),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCategories(false);
        }
      }
    };

    void loadCategories();
    void loadTemplates();

    return () => {
      isCancelled = true;
    };
  }, [loadTemplates]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!pendingProductsCategoryId || productsLoadTrigger === 0) {
      return;
    }

    if (!isWixEntityId(pendingProductsCategoryId)) {
      setCategoryProducts(null);
      setProductsError(null);
      setSaveStatusMessage(null);
      setIsLoadingProducts(false);
      return;
    }

    let isCancelled = false;

    const loadCategoryProducts = async () => {
      setIsLoadingProducts(true);
      setProductsError(null);
      setCategoryProducts(null);

      try {
        createClient({
          auth: dashboard.auth(),
          host: dashboard.host(),
        }).enableContext('module');

        const allCategoryItems: CategoryItemReference[] = [];
        let nextCursor: string | undefined;

        do {
          const response = await wixCategories.listItemsInCategory(
            pendingProductsCategoryId,
            WIX_STORES_TREE_REFERENCE,
            {
              useCategoryArrangement: true,
              includeItemsFromSubcategories: false,
              cursorPaging: nextCursor ? { cursor: nextCursor, limit: 100 } : { limit: 100 },
            },
          );

          allCategoryItems.push(...(response.items ?? []));
          nextCursor = response.pagingMetadata?.cursors?.next ?? undefined;
        } while (nextCursor);

        if (isCancelled) {
          return;
        }

        if (allCategoryItems.length === 0) {
          setCategoryProducts([]);
          setProductsError(t('עדיין לא נמצאו מוצרים בקטגוריה זו.', 'No products were found in this category yet.'));
          return;
        }

        const productIds = Array.from(new Set(
          allCategoryItems
            .map(item => item.catalogItemId)
            .filter((id): id is string => Boolean(id)),
        ));

        const catalogProductsById = new Map<string, StoreCatalogProduct>();




        for (let index = 0; index < productIds.length; index += 100) {
          const idsChunk = productIds.slice(index, index + 100);

          const options = {
            query: {
              sort: [
                {
                  order: 'ASC' as const,
                  fieldName: 'createdDate',
                },
              ],
              filter: {
                id: {
                  $in: idsChunk,
                },
              },
            },
          };
          try {
            const queryResult = await (productsV3.queryProducts as unknown as (opts: unknown) => { find: () => Promise<unknown> })(options).find();
            const response = queryResult as { products?: StoreCatalogProduct[]; items?: StoreCatalogProduct[] };
            const items = response.products ?? response.items ?? [];
            console.log('itemssssssssssssssssssss', items);

            items.forEach(product => {
              const byUnderscoreId = (product as { _id?: string; id?: string })._id;
              const byId = (product as { _id?: string; id?: string }).id;

              if (byUnderscoreId) {
                catalogProductsById.set(byUnderscoreId, product);
              }

              if (byId) {
                catalogProductsById.set(byId, product);
              }
            });
          } catch (chunkError) {
            console.error('Failed to fetch products chunk', chunkError);
          }
        }

        const visibleCategoryItems = allCategoryItems.filter(item => {
          if (!item.catalogItemId) {
            return true;
          }

          return catalogProductsById.get(item.catalogItemId)?.visible !== false;
        });

        if (visibleCategoryItems.length === 0) {
          setCategoryProducts([]);
          setProductsError(t('לא נמצאו מוצרים פעילים בקטגוריה זו.', 'No active products were found in this category.'));
          return;
        }

        const arrangedResponse = await wixCategories.getArrangedItems(
          pendingProductsCategoryId,
          WIX_STORES_TREE_REFERENCE,
        );

        if (isCancelled) {
          return;
        }

        // Fetch inventory data and tags for all products in parallel
        const [inventoryData, tagsData] = await Promise.all([
          fetchInventoryData(catalogProductsById, visibleCategoryItems),
          fetchTagsMap(),
        ]);
        console.log("visibleCategoryItems", visibleCategoryItems);

        const mappedProducts = visibleCategoryItems
          .filter(item => !item.catalogItemId || catalogProductsById.has(item.catalogItemId))
          .map((item, index) => mapCategoryItemToProduct(
          item,
          item.catalogItemId ? catalogProductsById.get(item.catalogItemId) : undefined,
          pendingProductsCategoryName,
          index,
          inventoryData,
          tagsData,
        ));

        setCategoryProducts(mappedProducts);
        setLastLoadedCategoryId(pendingProductsCategoryId);

        setConfig(prev => ({
          ...prev,
          pinnedProducts: [],
        }));

        setPreviewResult(null);

        // Try to load saved configuration from collection
        try {
          const dataItem = await wixDataItems.get(SHELF_COLLECTION_ID, pendingProductsCategoryId);

          if (dataItem?.['configJson']) {
            const savedConfig = JSON.parse(dataItem['configJson'] as string) as CategoryConfig;
            setConfig({
              ...savedConfig,
              categoryId: pendingProductsCategoryId,
              categoryName: pendingProductsCategoryName,
            });
            setSaveStatusMessage(t('קונפיגורציה שמורה נטענה.', 'Saved configuration loaded.'));
          } else {
            setSaveStatusMessage(
              (arrangedResponse.items?.length ?? 0) > 0
                ? t(`ל-Wix יש סידור קיים של ${(arrangedResponse.items?.length ?? 0)} פריטים — אין קונפיגורציה שמורה, מתחיל מאפס.`, `Wix has an existing arrangement of ${(arrangedResponse.items?.length ?? 0)} items — no saved config, starting fresh.`)
                : t('לקטגוריה זו עדיין אין סידור ידני שמור.', 'This category has no saved manual arrangement yet.'),
            );
          }
        } catch {
          // No saved config in collection — use defaults
          setSaveStatusMessage(
            (arrangedResponse.items?.length ?? 0) > 0
              ? t(`ל-Wix יש סידור קיים של ${(arrangedResponse.items?.length ?? 0)} פריטים — אין קונפיגורציה שמורה, מתחיל מאפס.`, `Wix has an existing arrangement of ${(arrangedResponse.items?.length ?? 0)} items — no saved config, starting fresh.`)
              : t('לקטגוריה זו עדיין אין סידור ידני שמור.', 'This category has no saved manual arrangement yet.'),
          );
        }
      } catch (error) {
        console.error('Failed to load category products', error);

        const statusCode = (error as { details?: { applicationError?: { code?: number } } })
          ?.details?.applicationError?.code;

        if (!isCancelled) {
          setCategoryProducts(null);
          setProductsError(
            statusCode === 403
              ? t('Wix חסם גישה למוצרי הקטגוריה (403). יש לוודא שהרשאות READ CATEGORIES ו-READ PRODUCTS IN V3 CATALOG מאופשרות, ואז לשחרר שוב.', 'Wix blocked category products access (403). Verify READ CATEGORIES and READ PRODUCTS IN V3 CATALOG permissions, then release again.')
              : t('לא ניתן היה לטעון מוצרים לקטגוריה זו.', 'Could not load products for this category.'),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProducts(false);
        }
      }
    };

    void loadCategoryProducts();

    return () => {
      isCancelled = true;
    };
  }, [pendingProductsCategoryId, pendingProductsCategoryName, productsLoadTrigger, t]);

  const updateConfig = useCallback((updater: (prev: CategoryConfig) => CategoryConfig) => {
    setConfig(prev => {
      const prevClone = cloneConfig(prev);
      const next = updater(prevClone);
      const normalized = { ...next, updatedAt: new Date() };
      setUndoStack(stack => [...stack, prevClone]);
      return normalized;
    });
  }, []);

  const filteredProducts = useMemo(
    () => applyFilters(sourceProducts, config.filterRuleGroup),
    [sourceProducts, config.filterRuleGroup],
  );

  const pinnedVariantIds = useMemo(
    () => new Set(config.pinnedProducts.map(item => item.variantId)),
    [config.pinnedProducts],
  );

  const availableForPinning = useMemo(
    () => filteredProducts.filter(product => {
      const baseVariantId = getBaseVariantId(product);
      return !pinnedVariantIds.has(product.variantId)
        && !pinnedVariantIds.has(baseVariantId);
    }),
    [filteredProducts, pinnedVariantIds],
  );

  const pinnedPreview = useMemo(
    () => config.pinnedProducts
      .slice()
      .sort((a, b) => {
        if (a.manualOrder !== undefined && b.manualOrder !== undefined) {
          return a.manualOrder - b.manualOrder;
        }
        if (a.manualOrder !== undefined) return -1;
        if (b.manualOrder !== undefined) return 1;
        return b.priority - a.priority;
      }),
    [config.pinnedProducts],
  );

  const productPool = useMemo(
    () => filteredProducts,
    [filteredProducts],
  );

  const colorModelMetaByVariantId = useMemo(() => {
    const groupedByBaseVariantId = new Map<string, Product[]>();

    sourceProducts.forEach(product => {
      const baseVariantId = getBaseVariantId(product);
      const group = groupedByBaseVariantId.get(baseVariantId) ?? [];
      group.push(product);
      groupedByBaseVariantId.set(baseVariantId, group);
    });

    const metaByVariantId = new Map<string, { groupSize: number; position: number; baseVariantId: string }>();

    groupedByBaseVariantId.forEach((group, baseVariantId) => {
      const sortedGroup = group
        .slice()
        .sort((a, b) => String(a.color ?? '').localeCompare(String(b.color ?? '')));

      sortedGroup.forEach((product, index) => {
        metaByVariantId.set(product.variantId, {
          groupSize: sortedGroup.length,
          position: index + 1,
          baseVariantId,
        });
      });
    });

    return metaByVariantId;
  }, [sourceProducts]);

  const productPoolTotalPages = useMemo(
    () => Math.max(1, Math.ceil(productPool.length / PRODUCT_POOL_PAGE_SIZE)),
    [productPool.length],
  );

  const pagedProductPool = useMemo(() => {
    const start = (productPoolPage - 1) * PRODUCT_POOL_PAGE_SIZE;
    return productPool.slice(start, start + PRODUCT_POOL_PAGE_SIZE);
  }, [productPoolPage, productPool]);

  useEffect(() => {
    setProductPoolPage(prev => Math.min(prev, productPoolTotalPages));
  }, [productPoolTotalPages]);

  const onUndo = useCallback(() => {
    setUndoStack(stack => {
      if (stack.length === 0) {
        return stack;
      }
      const last = stack[stack.length - 1];
      setConfig(cloneConfig(last));
      return stack.slice(0, -1);
    });
  }, []);

  const addMainRule = useCallback(() => {
    if (!newRule.field || !newRule.value.trim()) {
      return;
    }

    const resolvedField = newRule.field === 'productOptions'
      ? `productOption.${newRule.optionName}`
      : newRule.field;

    if (!resolvedField || resolvedField === 'productOption.') {
      return;
    }

    const rule: Rule = {
      id: generateId('rule'),
      field: resolvedField,
      operator: newRule.operator,
      value: coerceValue(newRule.operator, newRule.value),
      isExclusion: newRule.isExclusion,
    };

    updateConfig(prev => ({
      ...prev,
      filterRuleGroup: {
        ...prev.filterRuleGroup,
        rules: [...prev.filterRuleGroup.rules, rule],
      },
    }));

    setNewRule(prev => ({
      ...prev,
      value: getSuggestedValue(prev.field, prev.optionName),
    }));
  }, [getSuggestedValue, newRule, updateConfig]);

  const addBottomRule = useCallback(() => {
    if (!newBottomRule.field || !newBottomRule.value.trim()) {
      return;
    }

    const resolvedField = newBottomRule.field === 'productOptions'
      ? `productOption.${newBottomRule.optionName}`
      : newBottomRule.field;

    if (!resolvedField || resolvedField === 'productOption.') {
      return;
    }

    const rule: Rule = {
      id: generateId('bottom-rule'),
      field: resolvedField,
      operator: newBottomRule.operator,
      value: coerceValue(newBottomRule.operator, newBottomRule.value),
      isExclusion: newBottomRule.isExclusion,
    };

    updateConfig(prev => ({
      ...prev,
      bottomRuleGroup: {
        logic: prev.bottomRuleGroup?.logic ?? 'AND',
        rules: [...(prev.bottomRuleGroup?.rules ?? []), rule],
      },
    }));

    setNewBottomRule(prev => ({ ...prev, value: '' }));
  }, [newBottomRule, updateConfig]);

  const removeMainRule = useCallback((ruleId: string) => {
    updateConfig(prev => ({
      ...prev,
      filterRuleGroup: {
        ...prev.filterRuleGroup,
        rules: prev.filterRuleGroup.rules.filter(rule => rule.id !== ruleId),
      },
    }));
  }, [updateConfig]);

  const setMainRuleLogic = useCallback((logicValue: RuleGroup['logic']) => {
    updateConfig(prev => ({
      ...prev,
      filterRuleGroup: {
        ...prev.filterRuleGroup,
        logic: logicValue,
      },
    }));
  }, [updateConfig]);

  const setBottomRuleLogic = useCallback((logicValue: RuleGroup['logic']) => {
    updateConfig(prev => ({
      ...prev,
      bottomRuleGroup: {
        logic: logicValue,
        rules: prev.bottomRuleGroup?.rules ?? [],
      },
    }));
  }, [updateConfig]);

  const removeBottomRule = useCallback((ruleId: string) => {
    updateConfig(prev => ({
      ...prev,
      bottomRuleGroup: {
        logic: prev.bottomRuleGroup?.logic ?? 'AND',
        rules: (prev.bottomRuleGroup?.rules ?? []).filter(rule => rule.id !== ruleId),
      },
    }));
  }, [updateConfig]);

  const setCategory = useCallback((categoryId: string, categoryName: string) => {
    updateConfig(prev => ({
      ...prev,
      categoryId,
      categoryName,
    }));

    setSaveStatusMessage(null);
    setProductsError(null);
  }, [updateConfig]);

  const setCategoryById = useCallback((categoryId: string) => {
    const category = categoriesById.get(categoryId);
    if (!category) {
      return;
    }

    setCategory(category.id, category.name);
  }, [categoriesById, setCategory]);

  const loadProductsForSelectedCategory = useCallback(() => {
    if (!isWixEntityId(config.categoryId)) {
      setProductsError(t('יש לבחור קטגוריית Wix אמיתית לפני טעינת מוצרים.', 'Choose a real Wix category before loading products.'));
      return;
    }

    setProductsError(null);
    setPendingProductsCategoryId(config.categoryId);
    setPendingProductsCategoryName(config.categoryName);
    setProductsLoadTrigger(prev => prev + 1);
  }, [config.categoryId, config.categoryName, t]);

  const pinProduct = useCallback((product: Product) => {
    updateConfig(prev => ({
      ...prev,
      pinnedProducts: promoteProduct(product, prev.pinnedProducts),
    }));
  }, [updateConfig]);

  const removePinned = useCallback((variantId: string) => {
    updateConfig(prev => ({
      ...prev,
      pinnedProducts: unpinProduct(variantId, prev.pinnedProducts),
    }));
  }, [updateConfig]);

  // Pin/unpin a product at its current absolute display position
  const togglePinInPlace = useCallback((product: Product, absolutePosition: number) => {
    const alreadyPinned = config.pinnedProducts.some(p => p.variantId === product.variantId);
    if (alreadyPinned) {
      // Unpin: also clear from promoted list
      setPromotedVariantIds(prev => prev.filter(id => id !== product.variantId));
      setReleasedPinSlots(prev => ({
        ...prev,
        [product.variantId]: absolutePosition,
      }));
      updateConfig(prev => ({
        ...prev,
        pinnedProducts: unpinProduct(product.variantId, prev.pinnedProducts),
      }));
    } else {
      // Pin at the exact absolute position
      setPromotedVariantIds(prev => prev.filter(id => id !== product.variantId));
      setReleasedPinSlots(prev => {
        if (!(product.variantId in prev)) {
          return prev;
        }

        const next = { ...prev };
        delete next[product.variantId];
        return next;
      });
      updateConfig(prev => ({
        ...prev,
        pinnedProducts: [
          ...prev.pinnedProducts,
          { productId: product.id, variantId: product.variantId, priority: 0, manualOrder: absolutePosition, pinnedAt: new Date() },
        ],
      }));
    }
  }, [config.pinnedProducts, updateConfig]);

  // Promote: non-pinned → move to just after last pinned in display order (no pin).
  // Pinned → move manualOrder one step up (swap with whatever is at manualOrder-1).
  const moveUpInArrangement = useCallback((variantId: string) => {
    const isPinned = config.pinnedProducts.some(pin => pin.variantId === variantId);
    if (!isPinned) {
      setPromotedVariantIds(prevPromoted => [
        variantId,
        ...prevPromoted.filter(id => id !== variantId),
      ]);
      return;
    }

    updateConfig(prev => {
      const targetPin = prev.pinnedProducts.find(p => p.variantId === variantId);
      if (!targetPin) return prev;
      const currentSlot = targetPin.manualOrder ?? 0;
      if (currentSlot <= 0) return prev;
      const newSlot = currentSlot - 1;
      // Swap with any pinned product sitting at newSlot
      return {
        ...prev,
        pinnedProducts: prev.pinnedProducts.map(p => {
          if (p.variantId === variantId) return { ...p, manualOrder: newSlot };
          if ((p.manualOrder ?? 0) === newSlot) return { ...p, manualOrder: currentSlot };
          return p;
        }),
      };
    });
  }, [config.pinnedProducts, updateConfig]);

  // Demote: non-pinned promoted → remove promotion.
  // Pinned → move manualOrder one step down (swap with whatever is at manualOrder+1).
  const moveDownInArrangement = useCallback((variantId: string) => {
    const isPinned = config.pinnedProducts.some(pin => pin.variantId === variantId);
    if (!isPinned) {
      setPromotedVariantIds(prevPromoted => prevPromoted.filter(id => id !== variantId));
      return;
    }

    updateConfig(prev => {
      const targetPin = prev.pinnedProducts.find(p => p.variantId === variantId);
      if (!targetPin) return prev;
      const currentSlot = targetPin.manualOrder ?? 0;
      const newSlot = currentSlot + 1;
      return {
        ...prev,
        pinnedProducts: prev.pinnedProducts.map(p => {
          if (p.variantId === variantId) return { ...p, manualOrder: newSlot };
          if ((p.manualOrder ?? 0) === newSlot) return { ...p, manualOrder: currentSlot };
          return p;
        }),
      };
    });
  }, [config.pinnedProducts, updateConfig]);

  const updatePinPriority = useCallback((variantId: string, priorityValue: string) => {
    const numeric = Number(priorityValue);
    const safeValue = Number.isNaN(numeric) ? 0 : Math.max(0, Math.min(100, numeric));

    updateConfig(prev => ({
      ...prev,
      pinnedProducts: prev.pinnedProducts.map(item => (
        item.variantId === variantId ? { ...item, priority: safeValue } : item
      )),
    }));
  }, [updateConfig]);

  const onPinnedDrop = useCallback((targetVariantId: string) => {
    if (!draggedVariantId || draggedVariantId === targetVariantId) {
      return;
    }

    const orderedIds = pinnedPreview.map(item => item.variantId);
    const fromIndex = orderedIds.indexOf(draggedVariantId);
    const toIndex = orderedIds.indexOf(targetVariantId);

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextOrder = orderedIds.slice();
    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, moved);

    updateConfig(prev => ({
      ...prev,
      pinnedProducts: reorderPinnedProducts(nextOrder, prev.pinnedProducts),
    }));

    setDraggedVariantId(null);
  }, [draggedVariantId, pinnedPreview, updateConfig]);

  const addSegment = useCallback(() => {
    const segment: Segment = {
      id: generateId('segment'),
      name: newSegmentName.trim() || t(`מקטע ${config.segments.length + 1}`, `Segment ${config.segments.length + 1}`),
      priority: config.segments.length + 1,
      size: config.maxProducts,
      filters: { rules: [], logic: 'AND' },
      sorters: [],
    };

    updateConfig(prev => ({ ...prev, segments: [...prev.segments, segment] }));
    setNewSegmentName('');
  }, [config.maxProducts, config.segments.length, newSegmentName, t, updateConfig]);

  const removeSegment = useCallback((segmentId: string) => {
    updateConfig(prev => ({
      ...prev,
      segments: prev.segments
        .filter(segment => segment.id !== segmentId)
        .map((segment, index) => ({ ...segment, priority: index + 1 })),
    }));
  }, [updateConfig]);

  const reorderSegment = useCallback((segmentId: string, direction: 'up' | 'down') => {
    updateConfig(prev => {
      const sorted = prev.segments.slice().sort((a, b) => a.priority - b.priority);
      const index = sorted.findIndex(item => item.id === segmentId);
      if (index < 0) {
        return prev;
      }

      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= sorted.length) {
        return prev;
      }

      const swapped = sorted.slice();
      const [moved] = swapped.splice(index, 1);
      swapped.splice(target, 0, moved);

      return {
        ...prev,
        segments: swapped.map((segment, idx) => ({ ...segment, priority: idx + 1 })),
      };
    });
  }, [updateConfig]);

  const addSegmentFilter = useCallback((segmentId: string) => {
    const firstField = 'name';
    const draft = segmentDrafts[segmentId] ?? {
      field: firstField,
      operator: getDefaultOperator(firstField),
      value: getSuggestedValue(firstField),
      optionName: '',
      isExclusion: false,
    };

    if (!draft.field || !draft.value.trim()) {
      return;
    }

    const resolvedField = draft.field === 'productOptions'
      ? `productOption.${draft.optionName}`
      : draft.field;

    if (!resolvedField || resolvedField === 'productOption.') {
      return;
    }

    updateConfig(prev => ({
      ...prev,
      segments: prev.segments.map(segment => {
        if (segment.id !== segmentId) {
          return segment;
        }

        const rule: Rule = {
          id: generateId('segment-rule'),
          field: resolvedField,
          operator: draft.operator,
          value: coerceValue(draft.operator, draft.value),
          isExclusion: draft.isExclusion,
        };

        return {
          ...segment,
          filters: {
            ...segment.filters,
            rules: [...segment.filters.rules, rule],
          },
        };
      }),
    }));

    // Reset draft for this segment
    setSegmentDrafts(prev => {
      const { [segmentId]: _removed, ...rest } = prev;
      return rest;
    });
  }, [getDefaultOperator, getSuggestedValue, segmentDrafts, updateConfig]);

  const removeSegmentFilter = useCallback((segmentId: string, ruleId: string) => {
    updateConfig(prev => ({
      ...prev,
      segments: prev.segments.map(segment => (
        segment.id === segmentId
          ? {
            ...segment,
            filters: {
              ...segment.filters,
              rules: segment.filters.rules.filter(rule => rule.id !== ruleId),
            },
          }
          : segment
      )),
    }));
  }, [updateConfig]);

  const addSegmentSorter = useCallback((segmentId: string, field: string, direction: SortDirection) => {
    updateConfig(prev => ({
      ...prev,
      segments: prev.segments.map(segment => (
        segment.id === segmentId
          ? {
            ...segment,
            sorters: [
              ...segment.sorters,
              {
                id: generateId('sorter'),
                field,
                direction,
              } as SortRule,
            ],
          }
          : segment
      )),
    }));
  }, [updateConfig]);

  const setSegmentFilterLogic = useCallback((segmentId: string, logicValue: RuleGroup['logic']) => {
    updateConfig(prev => ({
      ...prev,
      segments: prev.segments.map(segment => (
        segment.id === segmentId
          ? { ...segment, filters: { ...segment.filters, logic: logicValue } }
          : segment
      )),
    }));
  }, [updateConfig]);

  const removeSegmentSorter = useCallback((segmentId: string, sorterId: string) => {
    updateConfig(prev => ({
      ...prev,
      segments: prev.segments.map(segment => (
        segment.id === segmentId
          ? { ...segment, sorters: segment.sorters.filter(sorter => sorter.id !== sorterId) }
          : segment
      )),
    }));
  }, [updateConfig]);

  const effectiveConfig = useMemo((): CategoryConfig => {
    if (!globalPushOutOfStockToBottom) {
      return config;
    }

    const outOfStockRule: Rule = {
      id: '__global-out-of-stock__',
      field: 'inStock',
      operator: 'equals',
      value: 'false',
      isExclusion: false,
    };

    const existingBottomRules = config.bottomRuleGroup?.rules ?? [];
    const alreadyHasRule = existingBottomRules.some(rule => rule.id === '__global-out-of-stock__');

    return {
      ...config,
      bottomRuleGroup: {
        logic: config.bottomRuleGroup?.logic ?? 'OR',
        rules: alreadyHasRule ? existingBottomRules : [...existingBottomRules, outOfStockRule],
      },
    };
  }, [config, globalPushOutOfStockToBottom]);

  const runPreview = useCallback(() => {
    setPreviewResult(generateArrangement(effectiveConfig, sourceProducts));
    setActiveTab('preview');
  }, [effectiveConfig, sourceProducts]);

  const seedTestProducts = useCallback(async () => {
    setIsSeedingProducts(true);
    setSaveStatusMessage(null);

    try {
      createClient({
        auth: dashboard.auth(),
        host: dashboard.host(),
      }).enableContext('module');

      const allProducts = generateTestProducts();
      const BATCH_SIZE = 50;
      let created = 0;

      for (let batchStart = 0; batchStart < allProducts.length; batchStart += BATCH_SIZE) {
        const batch = allProducts.slice(batchStart, batchStart + BATCH_SIZE);
        setSaveStatusMessage(
          t(`יוצר מוצרי בדיקה... הושלמו ${batchStart} מתוך ${allProducts.length}`, `Creating test products... completed ${batchStart} out of ${allProducts.length}`),
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await productsV3.bulkCreateProducts(batch as any);
        created += (result.bulkActionMetadata as any)?.totalSuccesses ?? 0;
      }

      setSaveStatusMessage(t(`בוצע בהצלחה! נוצרו ${created} מוצרי בדיקה בחנות.`, `Success! Created ${created} test products in the store.`));
    } catch (err) {
      console.error('Failed to seed test products', err);
      setSaveStatusMessage(t('יצירת מוצרי הבדיקה נכשלה - בדקו את הקונסול לפרטים.', 'Failed to create test products. Check the console for details.'));
    } finally {
      setIsSeedingProducts(false);
    }
  }, [t]);

  const saveAsTemplate = useCallback(async () => {
    const trimmedName = templateSaveName.trim();
    if (!trimmedName) {
      setTemplateStatus(t('יש להזין שם לתבנית.', 'Please enter a template name.'));
      return;
    }
    setIsSavingTemplate(true);
    setTemplateStatus(null);
    try {
      createClient({
        auth: dashboard.auth(),
        host: dashboard.host(),
      }).enableContext('module');
      const templateId = `__tpl__${Date.now()}`;
      const templateConfig = {
        filterRuleGroup: config.filterRuleGroup,
        bottomRuleGroup: config.bottomRuleGroup,
        segments: config.segments,
        maxProducts: config.maxProducts,
      };
      const configJson = JSON.stringify(templateConfig);
      await wixDataItems.save(SHELF_COLLECTION_ID, {
        _id: templateId,
        isTemplate: true,
        templateName: trimmedName,
        configJson,
      });
      setSavedTemplates(prev => [
        ...prev.filter(tpl => tpl.name !== trimmedName),
        { id: templateId, name: trimmedName, configJson },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setTemplateSaveName('');
      setTemplateStatus(t(`התבנית "${trimmedName}" נשמרה.`, `Template "${trimmedName}" saved.`));
    } catch (error) {
      console.error('Failed to save template', error);
      setTemplateStatus(t('שמירת התבנית נכשלה.', 'Failed to save template.'));
    } finally {
      setIsSavingTemplate(false);
    }
  }, [config, templateSaveName, t]);

  const applyTemplate = useCallback(() => {
    const template = savedTemplates.find(tpl => tpl.id === selectedTemplateId);
    if (!template) return;
    try {
      const parsed = JSON.parse(template.configJson) as {
        filterRuleGroup?: RuleGroup;
        bottomRuleGroup?: RuleGroup;
        segments?: Segment[];
        maxProducts?: number;
      };
      setConfig(prev => ({
        ...prev,
        filterRuleGroup: parsed.filterRuleGroup ?? prev.filterRuleGroup,
        bottomRuleGroup: parsed.bottomRuleGroup ?? prev.bottomRuleGroup,
        segments: parsed.segments ?? prev.segments,
        maxProducts: parsed.maxProducts ?? prev.maxProducts,
      }));
      setTemplateStatus(t(`התבנית "${template.name}" הוחלה על הקטגוריה.`, `Template "${template.name}" applied to category.`));
    } catch {
      setTemplateStatus(t('החלת התבנית נכשלה.', 'Failed to apply template.'));
    }
  }, [savedTemplates, selectedTemplateId, t]);

  const saveArrangementToWix = useCallback(async () => {
    if (!isWixEntityId(config.categoryId)) {
      setSaveStatusMessage(t('יש לבחור קטגוריית Wix אמיתית לפני שמירת הסידור.', 'Choose a real Wix category before saving arrangement.'));
      return;
    }

    setIsSavingArrangement(true);
    setSaveStatusMessage(null);

    try {
      createClient({
        auth: dashboard.auth(),
        host: dashboard.host(),
      }).enableContext('module');

      const result = generateArrangement(effectiveConfig, sourceProducts);
      const items = result.arrangedProducts.slice(0, 100).map(product => ({
        catalogItemId: product.id,
        appId: typeof product.attributes.appId === 'string'
          ? product.attributes.appId
          : WIX_STORES_APP_ID,
      }));

      await wixCategories.setArrangedItems(
        config.categoryId,
        WIX_STORES_TREE_REFERENCE,
        { items },
      );

      setPreviewResult(result);

      // Also save full config to collection
      try {
        await wixDataItems.save(SHELF_COLLECTION_ID, {
          _id: config.categoryId,
          categoryId: config.categoryId,
          categoryName: config.categoryName,
          configJson: JSON.stringify({ ...config, updatedAt: new Date() }),
        });
      } catch (collectionError) {
        console.warn('Could not save config to collection', collectionError);
      }

      setSaveStatusMessage(t(`נשמרו בהצלחה ${items.length} פריטים מסודרים ל-Wix.`, `Saved ${items.length} arranged items to Wix successfully.`));
      setSaveSuccessMessage(t(`הקטגוריה "${config.categoryName}" נשמרה בהצלחה! ${items.length} מוצרים סודרו ב-Wix.`, `Category "${config.categoryName}" saved successfully! ${items.length} products arranged in Wix.`));
      setTimeout(() => setSaveSuccessMessage(null), 6000);
    } catch (error) {
      console.error('Failed to save arrangement to Wix', error);

      const statusCode = (error as { details?: { applicationError?: { code?: number } } })
        ?.details?.applicationError?.code;

      setSaveStatusMessage(
        statusCode === 403
          ? t('Wix חסם שמירת סידור (403). יש לוודא הרשאת category move/update ולשחרר שוב.', 'Wix blocked saving arrangement (403). Verify category move/update permission and release again.')
          : t('לא ניתן היה לשמור את הסידור ל-Wix. נסו שוב.', 'Could not save arrangement to Wix. Please try again.'),
      );
    } finally {
      setIsSavingArrangement(false);
    }
  }, [config, effectiveConfig, sourceProducts, t]);

  const livePreviewResult = useMemo(
    () => generateArrangement(effectiveConfig, sourceProducts),
    [effectiveConfig, sourceProducts],
  );
  const PINNING_PAGE_SIZE = 20;

  const displayOrderedPinningProducts = useMemo(() => {
    const arranged = livePreviewResult.arrangedProducts;
    const hasReleasedSlots = Object.keys(releasedPinSlots).length > 0;

    if (promotedVariantIds.length === 0 && !hasReleasedSlots) {
      return arranged;
    }

    // Keep pinned products fixed at their indices, preserve released products near
    // their former pinned slot, then apply ad-hoc promotions in remaining free slots.
    const arrangedByVariantId = new Map(arranged.map(product => [product.variantId, product]));
    const releasedProducts = Object.entries(releasedPinSlots)
      .map(([variantId, preferredIndex]) => {
        const product = arrangedByVariantId.get(variantId);
        if (!product || product.isPinned) {
          return null;
        }

        return {
          product,
          preferredIndex: Math.max(0, Math.min(preferredIndex, Math.max(arranged.length - 1, 0))),
        };
      })
      .filter((entry): entry is { product: typeof arranged[number]; preferredIndex: number } => Boolean(entry));

    const releasedSet = new Set(releasedProducts.map(entry => entry.product.variantId));
    const promotedProducts = promotedVariantIds
      .map(variantId => arrangedByVariantId.get(variantId))
      .filter((product): product is typeof arranged[number] => (
        Boolean(product)
        && !product!.isPinned
        && !releasedSet.has(product!.variantId)
      ));

    if (promotedProducts.length === 0 && releasedProducts.length === 0) {
      return arranged;
    }

    const nonPinnedIndices = arranged.reduce<number[]>((indices, product, index) => {
      if (!product.isPinned) {
        indices.push(index);
      }
      return indices;
    }, []);

    const promotedSet = new Set(promotedProducts.map(product => product.variantId));
    const specialSet = new Set([
      ...releasedSet,
      ...promotedSet,
    ]);
    const result = [...arranged];
    const nonSpecialQueue = arranged.filter(
      product => !product.isPinned && !specialSet.has(product.variantId),
    );
    const occupiedSpecialIndices = new Set<number>();

    const findNearestFreeNonPinnedIndex = (targetIndex: number): number | null => {
      let bestIndex: number | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const index of nonPinnedIndices) {
        if (occupiedSpecialIndices.has(index)) {
          continue;
        }

        const distance = Math.abs(index - targetIndex);
        if (distance < bestDistance || (distance === bestDistance && (bestIndex === null || index < bestIndex))) {
          bestDistance = distance;
          bestIndex = index;
        }
      }

      return bestIndex;
    };

    releasedProducts
      .slice()
      .sort((a, b) => a.preferredIndex - b.preferredIndex)
      .forEach(({ product, preferredIndex }) => {
        const targetIndex = findNearestFreeNonPinnedIndex(preferredIndex);
        if (targetIndex === null) {
          return;
        }

        result[targetIndex] = product;
        occupiedSpecialIndices.add(targetIndex);
      });

    promotedProducts.forEach(product => {
      const targetIndex = nonPinnedIndices.find(index => !occupiedSpecialIndices.has(index));
      if (targetIndex === undefined) {
        return;
      }

      result[targetIndex] = product;
      occupiedSpecialIndices.add(targetIndex);
    });

    let nonSpecialIdx = 0;

    for (const index of nonPinnedIndices) {
      if (occupiedSpecialIndices.has(index)) {
        continue;
      }

      if (nonSpecialIdx < nonSpecialQueue.length) {
        result[index] = nonSpecialQueue[nonSpecialIdx];
        nonSpecialIdx += 1;
      }
    }

    return result;
  }, [promotedVariantIds, releasedPinSlots, livePreviewResult.arrangedProducts]);

  const pinningTotalPages = useMemo(
    () => Math.max(1, Math.ceil(displayOrderedPinningProducts.length / PINNING_PAGE_SIZE)),
    [displayOrderedPinningProducts.length],
  );

  const pagedPinningProducts = useMemo(() => {
    const start = (pinningPage - 1) * PINNING_PAGE_SIZE;
    return displayOrderedPinningProducts.slice(start, start + PINNING_PAGE_SIZE);
  }, [displayOrderedPinningProducts, pinningPage]);

  const top100Preview = useMemo(() => {
    const source = livePreviewResult.arrangedProducts ?? [];
    return source.slice(0, 100);
  }, [livePreviewResult]);

  const mainFilterOperatorOptions = useMemo(() => {
    if (newRule.field === 'productOptions') {
      return ['contains', 'notContains'] as FilterOperator[];
    }

    if (newRule.field === 'brand') {
      return ['contains'] as FilterOperator[];
    }

    if (['price', 'inventory', 'variantAvailabilityPercentage', 'daysSincePublish'].includes(newRule.field)) {
      return NUMBER_FILTER_OPERATORS;
    }

    if (newRule.field === 'publishDate') {
      return DATE_FILTER_OPERATORS;
    }

    return TEXT_FILTER_OPERATORS;
  }, [newRule.field]);

  const bottomFilterOperatorOptions = useMemo(() => {
    if (newBottomRule.field === 'productOptions') {
      return ['contains', 'notContains'] as FilterOperator[];
    }

    if (newBottomRule.field === 'brand') {
      return ['contains'] as FilterOperator[];
    }

    if (['price', 'inventory', 'variantAvailabilityPercentage', 'daysSincePublish'].includes(newBottomRule.field)) {
      return NUMBER_FILTER_OPERATORS;
    }

    if (newBottomRule.field === 'publishDate') {
      return DATE_FILTER_OPERATORS;
    }

    return TEXT_FILTER_OPERATORS;
  }, [newBottomRule.field]);

  const productOptionNameDropdownOptions = useMemo(
    () => Object.keys(productOptionValuesByName).map(optionName => ({
      id: optionName,
      value: formatProductOptionName(optionName),
    })),
    [productOptionValuesByName],
  );

  const mainFilterValueOptions = useMemo(() => {
    if (newRule.field === 'productOptions') {
      const optionName = newRule.optionName || firstProductOptionName;
      return (productOptionValuesByName[optionName] ?? []).map(value => ({ id: value, value }));
    }

    return [];
  }, [firstProductOptionName, newRule.field, newRule.optionName, productOptionValuesByName]);

  const bottomFilterValueOptions = useMemo(() => {
    if (newBottomRule.field === 'productOptions') {
      const optionName = newBottomRule.optionName || firstProductOptionName;
      return (productOptionValuesByName[optionName] ?? []).map(value => ({ id: value, value }));
    }

    return [];
  }, [firstProductOptionName, newBottomRule.field, newBottomRule.optionName, productOptionValuesByName]);

  const getMainRuleFieldLabel = useCallback((fieldName: string) => {
    if (fieldName.startsWith('productOption.')) {
      const optionName = fieldName.replace('productOption.', '');
      return `Product Options (${formatProductOptionName(optionName)})`;
    }

    const knownField = [
      ...FILTER_FIELD_OPTIONS,
      { id: 'daysSincePublish', value: t('עלה ב־X ימים אחרונים', 'Uploaded In Last (Days)') },
    ].find(option => option.id === fieldName);
    if (knownField) {
      return knownField.value;
    }

    return fieldDefinitionMap.get(fieldName)?.label ?? formatFieldLabel(fieldName);
  }, [fieldDefinitionMap, t]);

  const getRuleHintLabel = useCallback((group: RuleGroup) => {
    if (group.rules.length === 0) {
      return t('עדיין אין חוקים', 'No rules yet');
    }

    return t(`${group.rules.length} חוקים (${group.logic})`, `${group.rules.length} rules (${group.logic})`);
  }, [t]);

  const localizedFilterFieldOptions = useMemo(() => ([
    { id: 'name', value: t('שם מוצר', 'Product Name') },
    { id: 'description', value: t('תיאור', 'Description') },
    { id: 'price', value: t('מחיר', 'Price') },
    { id: 'brand', value: t('מותג', 'Brand') },
    { id: 'sku', value: 'SKU' },
    { id: 'productOptions', value: t('אפשרויות מוצר', 'Product Options') },
    { id: 'inventory', value: t('מלאי', 'Inventory') },
    { id: 'variantAvailabilityPercentage', value: t('אחוז זמינות וריאנטים', 'Variant Availability %') },
    { id: 'publishDate', value: t('תאריך העלאה', 'Publish Date') },
    { id: 'daysSincePublish', value: t('עלה ב־X ימים אחרונים', 'Uploaded In Last (Days)') },
  ]), [t]);

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <div dir={uiDirection} style={{ textAlign: uiDirection === 'rtl' ? 'right' : 'left' }}>
        <style>{`
          @keyframes shelfShimmer {
            0% { background-position: 100% 0; }
            100% { background-position: 0 0; }
          }
        `}</style>
        <Page>
          <Page.Header
            title={t('סידור מדף', 'Shelf Arrangement')}
            subtitle={t(`טופ ${config.maxProducts} וריאנטים בקטגוריה ${config.categoryName}`, `Top ${config.maxProducts} variants in category ${config.categoryName}`)}
            actionsBar={
              <Box direction="horizontal" gap="SP2">
                <Button
                  secondary
                  onClick={() => setLanguage(prev => (prev === 'he' ? 'en' : 'he'))}
                >
                  {language === 'he' ? 'English' : 'עברית'}
                </Button>
                <Button secondary disabled={undoStack.length === 0} onClick={onUndo}>{t('בטל פעולה', 'Undo')}</Button>
                <Button onClick={runPreview}>{t('תצוגה מקדימה', 'Preview')}</Button>
                <Button
                  secondary
                  disabled={isSeedingProducts}
                  onClick={() => void seedTestProducts()}
                >
                  {isSeedingProducts ? t('יוצר מוצרי בדיקה...', 'Creating test products...') : t('צור מוצרי בדיקה', 'Create Test Products')}
                </Button>
                <Button
                  skin="premium"
                  disabled={!isWixEntityId(config.categoryId) || isLoadingProducts || isSavingArrangement}
                  onClick={() => void saveArrangementToWix()}
                >
                  {isSavingArrangement ? t('שומר...', 'Saving...') : t('שמור ל-Wix', 'Save to Wix')}
                </Button>
              </Box>
            }
          />

          <Page.Content>
            <Box direction="vertical" gap="SP4">
              <Card>
                <Box direction="vertical" gap="SP3" padding="SP4">
                  <Box direction="horizontal" gap="SP2" verticalAlign="middle" style={{ flexWrap: 'wrap' }}>
                    <Text weight="bold">{t('1. בחירת קטגוריה', '1. Select Category')}</Text>
                    {isWixEntityId(config.categoryId) ? (
                      <Badge skin="success">{t(`מסדר: ${config.categoryName}`, `Arranging: ${config.categoryName}`)}</Badge>
                    ) : null}
                  </Box>
                  <Text size="small" secondary>
                    {isLoadingCategories
                      ? t('טוען קטגוריות מ-Wix Stores...', 'Loading categories from Wix Stores...')
                      : categoriesError ?? (productsError ?? (saveStatusMessage ?? (
                        isLoadingProducts
                          ? t('טוען מוצרים...', 'Loading products...')
                          : isWixEntityId(config.categoryId) && lastLoadedCategoryId !== config.categoryId
                            ? t('קטגוריה נבחרה — לחץ "טען מוצרים" כדי להמשיך.', 'Category selected — click "Load products" to continue.')
                            : categoryProducts === null
                              ? t('בחר קטגוריה ולחץ "טען מוצרים" להתחלה.', 'Select a category and click "Load products" to begin.')
                              : t(`${sourceProducts.length} מוצרים נטענו לקטגוריה.`, `${sourceProducts.length} products loaded for this category.`)
                      )))}
                  </Text>

                  {(isLoadingCategories || isLoadingProducts) ? (
                    <Box direction="vertical" gap="SP2" aria-live="polite">
                      <Text size="small" secondary>
                        {isLoadingCategories ? t('טוען עץ קטגוריות...', 'Loading category tree...') : t('טוען נתוני מוצרים מהקטגוריה...', 'Loading product data from category...')}
                      </Text>
                      <div
                        style={{
                          height: 14,
                          width: '45%',
                          borderRadius: 6,
                          background: 'linear-gradient(90deg, #EEF0F3 25%, #F7F8FA 37%, #EEF0F3 63%)',
                          backgroundSize: '400% 100%',
                          animation: 'shelfShimmer 1.2s ease-in-out infinite',
                        }}
                      />
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div
                            key={`category-loading-${index}`}
                            style={{
                              height: 32,
                              borderRadius: 8,
                              background: 'linear-gradient(90deg, #EEF0F3 25%, #F7F8FA 37%, #EEF0F3 63%)',
                              backgroundSize: '400% 100%',
                              animation: 'shelfShimmer 1.2s ease-in-out infinite',
                            }}
                          />
                        ))}
                      </div>
                    </Box>
                  ) : null}

                  <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>

                    <Box direction="vertical" gap="SP1">
                      <Box direction="horizontal" gap="SP1" verticalAlign="middle">
                        <Text size="small" weight="bold">{t('רמה 1', 'Level 1')}</Text>
                        {config.categoryId === selectedLevel1CategoryId && isWixEntityId(config.categoryId) ? (
                          <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
                        ) : null}
                      </Box>
                      <Dropdown
                        placeholder={t('בחר קטגוריה ראשית', 'Select main category')}
                        selectedId={selectedLevel1CategoryId}
                        options={level1Categories.map(category => ({ id: category.id, value: category.name }))}
                        onSelect={option => {
                          const selectedId = String(option.id);
                          setSelectedLevel1CategoryId(selectedId);
                          setSelectedLevel2CategoryId(undefined);
                          setSelectedLevel3CategoryId(undefined);
                          setSelectedLevel4CategoryId(undefined);
                          setSelectedLevel5CategoryId(undefined);
                          setCategoryById(selectedId);
                        }}
                        size="small"
                      />
                      {selectedLevel1CategoryId && config.categoryId !== selectedLevel1CategoryId ? (
                        <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel1CategoryId) { setCategoryById(selectedLevel1CategoryId); } }}>
                          {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
                        </Button>
                      ) : null}
                    </Box>

                    <Box direction="vertical" gap="SP1">
                      <Box direction="horizontal" gap="SP1" verticalAlign="middle">
                        <Text size="small" weight="bold">{t('רמה 2', 'Level 2')}</Text>
                        {config.categoryId === selectedLevel2CategoryId && isWixEntityId(config.categoryId) ? (
                          <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
                        ) : null}
                      </Box>
                      <Dropdown
                        placeholder={selectedLevel1CategoryId ? t('בחר קטגוריית בן', 'Select child category') : t('בחר קודם רמה 1', 'Select level 1 first')}
                        selectedId={selectedLevel2CategoryId}
                        options={level2Categories.map(category => ({ id: category.id, value: category.name }))}
                        onSelect={option => {
                          const selectedId = String(option.id);
                          setSelectedLevel2CategoryId(selectedId);
                          setSelectedLevel3CategoryId(undefined);
                          setSelectedLevel4CategoryId(undefined);
                          setSelectedLevel5CategoryId(undefined);
                          setCategoryById(selectedId);
                        }}
                        size="small"
                        disabled={!selectedLevel1CategoryId || level2Categories.length === 0}
                      />
                      {selectedLevel2CategoryId && config.categoryId !== selectedLevel2CategoryId ? (
                        <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel2CategoryId) { setCategoryById(selectedLevel2CategoryId); } }}>
                          {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
                        </Button>
                      ) : null}
                    </Box>

                    <Box direction="vertical" gap="SP1">
                      <Box direction="horizontal" gap="SP1" verticalAlign="middle">
                        <Text size="small" weight="bold">{t('רמה 3', 'Level 3')}</Text>
                        {config.categoryId === selectedLevel3CategoryId && isWixEntityId(config.categoryId) ? (
                          <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
                        ) : null}
                      </Box>
                      <Dropdown
                        placeholder={selectedLevel2CategoryId ? t('בחר קטגוריית בן נוספת', 'Select another child category') : t('בחר קודם רמה 2', 'Select level 2 first')}
                        selectedId={selectedLevel3CategoryId}
                        options={level3Categories.map(category => ({ id: category.id, value: category.name }))}
                        onSelect={option => {
                          const selectedId = String(option.id);
                          setSelectedLevel3CategoryId(selectedId);
                          setSelectedLevel4CategoryId(undefined);
                          setSelectedLevel5CategoryId(undefined);
                          setCategoryById(selectedId);
                        }}
                        size="small"
                        disabled={!selectedLevel2CategoryId || level3Categories.length === 0}
                      />
                      {selectedLevel3CategoryId && config.categoryId !== selectedLevel3CategoryId ? (
                        <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel3CategoryId) { setCategoryById(selectedLevel3CategoryId); } }}>
                          {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
                        </Button>
                      ) : null}
                    </Box>

                    <Box direction="vertical" gap="SP1">
                      <Box direction="horizontal" gap="SP1" verticalAlign="middle">
                        <Text size="small" weight="bold">{t('רמה 4', 'Level 4')}</Text>
                        {config.categoryId === selectedLevel4CategoryId && isWixEntityId(config.categoryId) ? (
                          <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
                        ) : null}
                      </Box>
                      <Dropdown
                        placeholder={selectedLevel3CategoryId ? t('בחר קטגוריית בן נוספת', 'Select another child category') : t('בחר קודם רמה 3', 'Select level 3 first')}
                        selectedId={selectedLevel4CategoryId}
                        options={level4Categories.map(category => ({ id: category.id, value: category.name }))}
                        onSelect={option => {
                          const selectedId = String(option.id);
                          setSelectedLevel4CategoryId(selectedId);
                          setSelectedLevel5CategoryId(undefined);
                          setCategoryById(selectedId);
                        }}
                        size="small"
                        disabled={!selectedLevel3CategoryId || level4Categories.length === 0}
                      />
                      {selectedLevel4CategoryId && config.categoryId !== selectedLevel4CategoryId ? (
                        <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel4CategoryId) { setCategoryById(selectedLevel4CategoryId); } }}>
                          {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
                        </Button>
                      ) : null}
                    </Box>

                    <Box direction="vertical" gap="SP1">
                      <Box direction="horizontal" gap="SP1" verticalAlign="middle">
                        <Text size="small" weight="bold">{t('רמה 5', 'Level 5')}</Text>
                        {config.categoryId === selectedLevel5CategoryId && isWixEntityId(config.categoryId) ? (
                          <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
                        ) : null}
                      </Box>
                      <Dropdown
                        placeholder={selectedLevel4CategoryId ? t('בחר קטגוריית בן נוספת', 'Select another child category') : t('בחר קודם רמה 4', 'Select level 4 first')}
                        selectedId={selectedLevel5CategoryId}
                        options={level5Categories.map(category => ({ id: category.id, value: category.name }))}
                        onSelect={option => {
                          const selectedId = String(option.id);
                          setSelectedLevel5CategoryId(selectedId);
                          setCategoryById(selectedId);
                        }}
                        size="small"
                        disabled={!selectedLevel4CategoryId || level5Categories.length === 0}
                      />
                      {selectedLevel5CategoryId && config.categoryId !== selectedLevel5CategoryId ? (
                        <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel5CategoryId) { setCategoryById(selectedLevel5CategoryId); } }}>
                          {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
                        </Button>
                      ) : null}
                    </Box>

                  </Box>

                  <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                    <Button
                      size="small"
                      disabled={!isWixEntityId(config.categoryId) || isLoadingProducts}
                      onClick={loadProductsForSelectedCategory}
                    >
                      {isLoadingProducts ? t('טוען...', 'Loading...') : t('טען מוצרים', 'Load products')}
                    </Button>
                    {!isWixEntityId(config.categoryId) ? (
                      <Text size="tiny" secondary>{t('בחר קטגוריה תחילה', 'Select a category first')}</Text>
                    ) : null}
                  </Box>
                </Box>
              </Card>

              <Card>
                <Box direction="horizontal" gap="SP3" padding="SP3" verticalAlign="middle">
                  <Checkbox
                    checked={globalPushOutOfStockToBottom}
                    onChange={event => setGlobalPushOutOfStockToBottom(event.target.checked)}
                  >
                    <Box direction="vertical" gap="SP0">
                      <Text size="small" weight="bold">{t('דחוף מוצרים חסרי מלאי לסוף', 'Push out-of-stock products to bottom')}</Text>
                      <Text size="tiny" secondary>{t('הגדרה גלובלית — חלה על כל הקטגוריות, בנוסף לתנאי הדחיפה לתחתית הספציפיים של כל קטגוריה.', 'Global setting — applies to all categories, in addition to each category\'s own push-to-bottom rules.')}</Text>
                    </Box>
                  </Checkbox>
                </Box>
              </Card>

              {saveSuccessMessage ? (
                <SectionHelper appearance="success" title={t('נשמר בהצלחה!', 'Saved successfully!')}>
                  {saveSuccessMessage}
                </SectionHelper>
              ) : null}

              <Card>
                <Box direction="vertical" gap="SP3" padding="SP4">
                  <Text weight="bold">{t('תבניות סידור', 'Arrangement Templates')}</Text>

                  <Box direction="vertical" gap="SP1">
                    <Text size="small" weight="bold">{t('שמור תצורה נוכחית כתבנית', 'Save current configuration as template')}</Text>
                    <Text size="tiny" secondary>{t('שומר את הפילטרים, המקטעים, והגדרות המקסימום — ללא מוצרים נעוצים (שהם ייחודיים לכל קטגוריה).', 'Saves filters, segments, and max-products settings — not pinned products (those are category-specific).')}</Text>
                    <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                      <div style={{ width: 260 }}>
                        <Input
                          size="small"
                          placeholder={t('שם התבנית', 'Template name')}
                          value={templateSaveName}
                          onChange={(e: any) => setTemplateSaveName(e.target.value)}
                        />
                      </div>
                      <Button
                        size="small"
                        disabled={!templateSaveName.trim() || isSavingTemplate}
                        onClick={() => void saveAsTemplate()}
                      >
                        {isSavingTemplate ? t('שומר...', 'Saving...') : t('שמור כתבנית', 'Save as template')}
                      </Button>
                    </Box>
                  </Box>

                  <Divider />

                  <Box direction="vertical" gap="SP1">
                    <Text size="small" weight="bold">{t('החל תבנית על קטגוריה זו', 'Apply template to this category')}</Text>
                    {isLoadingTemplates ? (
                      <Text size="small" secondary>{t('טוען תבניות...', 'Loading templates...')}</Text>
                    ) : savedTemplates.length === 0 ? (
                      <Text size="small" secondary>{t('אין תבניות שמורות עדיין.', 'No saved templates yet.')}</Text>
                    ) : (
                      <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                        <div style={{ width: 260 }}>
                          <Dropdown
                            size="small"
                            placeholder={t('בחר תבנית', 'Select template')}
                            selectedId={selectedTemplateId}
                            options={savedTemplates.map(tpl => ({ id: tpl.id, value: tpl.name }))}
                            onSelect={option => setSelectedTemplateId(String(option.id))}
                          />
                        </div>
                        <Button
                          size="small"
                          disabled={!selectedTemplateId}
                          onClick={applyTemplate}
                        >
                          {t('החל תבנית', 'Apply template')}
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {templateStatus ? (
                    <Text size="small" secondary>{templateStatus}</Text>
                  ) : null}
                </Box>
              </Card>

              <Tabs
                activeId={activeTab}
                items={tabItems}
                onClick={item => setActiveTab(item.id as ActiveTab)}
              />

              {activeTab === 'filters' ? (
                <Box direction="vertical" gap="SP4">

                  <MainFilterEditor
                    fieldOptions={localizedFilterFieldOptions}
                    title={t('2. תנאי קטגוריה', '2. Category Conditions')}
                    productsMustMatchLabel={t('המוצרים חייבים להתאים', 'Products Must Match')}
                    conditionsLabel={t('תנאי קטגוריה', 'Category Conditions')}
                    addRuleLabel={t('הוסף תנאי', 'Add Rule')}
                    allConditionsLabel={t('כל התנאים', 'All Conditions')}
                    anyConditionLabel={t('אחד מהתנאים', 'Any Condition')}
                    excludeRuleLabel={t('החרג תנאי', 'Exclude rule')}
                    removeRuleLabel={t('הסר', 'Remove')}
                    fieldPlaceholder={t('שם מוצר', 'Product Name')}
                    optionPlaceholder={t('בחר אפשרות', 'Choose option')}
                    operatorPlaceholder={t('מכיל', 'Contains')}
                    valuePlaceholder={t('הכנס ערך', 'Enter value')}
                    datePlaceholder={t('בחר תאריך', 'Choose date')}
                    variantAvailabilityPlaceholder={t('1-100', '1-100')}
                    filterRuleGroup={config.filterRuleGroup}
                    newRule={newRule}
                    setNewRule={setNewRule}
                    onSetLogic={setMainRuleLogic}
                    onAddRule={addMainRule}
                    onRemoveRule={removeMainRule}
                    getRuleHint={getRuleHintLabel}
                    getMainRuleFieldLabel={getMainRuleFieldLabel}
                    getSuggestedValue={getSuggestedValue}
                    operatorLabels={operatorLabels}
                    mainFilterOperatorOptions={mainFilterOperatorOptions}
                    mainFilterValueOptions={mainFilterValueOptions}
                    firstProductOptionName={firstProductOptionName}
                    productOptionNameDropdownOptions={productOptionNameDropdownOptions}
                  />

                  <MainFilterEditor
                    fieldOptions={localizedFilterFieldOptions}
                    title={t('תנאים גלובליים לדחיפה לתחתית', 'Global Push-To-Bottom Conditions')}
                    productsMustMatchLabel={t('מוצרים לדחיפה לתחתית חייבים להתאים', 'Products to push down must match')}
                    conditionsLabel={t('תנאי דחיפה לתחתית', 'Push-To-Bottom Conditions')}
                    addRuleLabel={t('הוסף תנאי דחיפה', 'Add Push-Down Condition')}
                    filterRuleGroup={config.bottomRuleGroup ?? { rules: [], logic: 'AND' }}
                    newRule={newBottomRule}
                    setNewRule={setNewBottomRule}
                    onSetLogic={setBottomRuleLogic}
                    onAddRule={addBottomRule}
                    onRemoveRule={removeBottomRule}
                    getRuleHint={getRuleHintLabel}
                    getMainRuleFieldLabel={getMainRuleFieldLabel}
                    getSuggestedValue={getSuggestedValue}
                    operatorLabels={operatorLabels}
                    mainFilterOperatorOptions={bottomFilterOperatorOptions}
                    mainFilterValueOptions={bottomFilterValueOptions}
                    firstProductOptionName={firstProductOptionName}
                    productOptionNameDropdownOptions={productOptionNameDropdownOptions}
                  />

                  <Card>
                    <Box direction="vertical" gap="SP2" padding="SP4">
                      <Text weight="bold">{t('תצוגת מאגר לאחר סינון', 'Pool View After Filtering')}</Text>
                      {isLoadingProducts ? (
                        <Box direction="vertical" gap="SP2">
                          <Text size="small" secondary>{t('טוען מוצרים לקטגוריה שנבחרה...', 'Loading products for selected category...')}</Text>
                          <div
                            style={{
                              height: 12,
                              width: '55%',
                              borderRadius: 6,
                              background: 'linear-gradient(90deg, #EEF0F3 25%, #F7F8FA 37%, #EEF0F3 63%)',
                              backgroundSize: '400% 100%',
                              animation: 'shelfShimmer 1.2s ease-in-out infinite',
                            }}
                          />
                        </Box>
                      ) : (
                        <Text size="small" secondary>
                          {t(`${filteredProducts.length} מוצרים מתאימים מתוך ${sourceProducts.length} שנטענו לקטגוריה זו.`, `${filteredProducts.length} matching products out of ${sourceProducts.length} loaded for this category.`)}
                        </Text>
                      )}
                    </Box>
                  </Card>
                </Box>
              ) : null}

              {activeTab === 'pinning' ? (
                <Box direction="vertical" gap="SP4">
                  <Card>
                    <Box direction="vertical" gap="SP3" padding="SP4">
                      <Text weight="bold">{t('3. סידור ונעיצת מוצרים', '3. Arrange and Pin Products')}</Text>
                      <Text size="small" secondary>
                        {t('כל המוצרים מוצגים לפי סדר הסידור הנוכחי. מוצר לא-נעוץ: "⬆ לראש" מקדם זמנית למעלה ללא נעיצה. "נעץ" נועל מוצר במקומו הנוכחי.', 'All products are shown in the current arrangement order. Non-pinned product: "⬆ To Top" promotes temporarily without pinning. "Pin" locks a product in its current position.')}
                      </Text>
                      <Text size="small" secondary>
                        {livePreviewResult.statistics.pinnedProducts > 0
                          ? t(`${livePreviewResult.statistics.pinnedProducts} מוצרים נעוצים · ${livePreviewResult.arrangedProducts.length} מוצרים בסה"כ`, `${livePreviewResult.statistics.pinnedProducts} pinned products · ${livePreviewResult.arrangedProducts.length} total products`)
                          : t(`אין מוצרים נעוצים · ${livePreviewResult.arrangedProducts.length} מוצרים בסה"כ`, `No pinned products · ${livePreviewResult.arrangedProducts.length} total products`)}
                      </Text>
                      {config.pinnedProducts.length > livePreviewResult.statistics.pinnedProducts ? (
                        <SectionHelper appearance="warning" title={t('נעיצות מוסתרות', 'Hidden pins')}>
                          {t(
                            `${config.pinnedProducts.length - livePreviewResult.statistics.pinnedProducts} מוצרים נעוצים מסוננים החוצה על ידי הפילטרים הפעילים ולא יופיעו בסידור המדף.`,
                            `${config.pinnedProducts.length - livePreviewResult.statistics.pinnedProducts} pinned product(s) are excluded by active filters and won't appear in the shelf arrangement.`,
                          )}
                        </SectionHelper>
                      ) : null}
                      <Divider />
                      {isLoadingProducts ? (
                        <Box direction="vertical" gap="SP2">
                          <Text size="small" secondary>{t('טוען מוצרים...', 'Loading products...')}</Text>
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <div
                              key={`pin-load-${idx}`}
                              style={{
                                height: 80,
                                borderRadius: 8,
                                background: 'linear-gradient(90deg,#EEF0F3 25%,#F7F8FA 37%,#EEF0F3 63%)',
                                backgroundSize: '400% 100%',
                                animation: 'shelfShimmer 1.2s ease-in-out infinite',
                              }}
                            />
                          ))}
                        </Box>
                      ) : livePreviewResult.arrangedProducts.length === 0 ? (
                        <Text size="small" secondary>
                          {t('טען מוצרים לקטגוריה כדי לנהל נעיצות.', 'Load products for category to manage pinning.')}
                        </Text>
                      ) : (
                        <>
                          <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                            <Button
                              size="small"
                              secondary
                              disabled={pinningPage <= 1}
                              onClick={() => setPinningPage(prev => prev - 1)}
                            >
                              {t('◀ הקודם', '◀ Previous')}
                            </Button>
                            <Text size="small">{t(`עמוד ${pinningPage} / ${pinningTotalPages}`, `Page ${pinningPage} / ${pinningTotalPages}`)}</Text>
                            <Button
                              size="small"
                              secondary
                              disabled={pinningPage >= pinningTotalPages}
                              onClick={() => setPinningPage(prev => prev + 1)}
                            >
                              {t('הבא ▶', 'Next ▶')}
                            </Button>
                          </Box>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                              gap: 16,
                            }}
                          >
                            {pagedPinningProducts.map((product, localIdx) => {
                              const globalIdx = (pinningPage - 1) * PINNING_PAGE_SIZE + localIdx;
                              const isPinned = product.isPinned;
                              const pinnedPos = pinnedPreview.findIndex(p => p.variantId === product.variantId);
                              const isFirstPinned = pinnedPos === 0;
                              const isLastPinned = isPinned && pinnedPos === pinnedPreview.length - 1;
                              const imageUrl = typeof product.attributes.imageUrl === 'string' ? product.attributes.imageUrl : '';

                              return (
                                <div
                                  key={product.variantId}
                                  draggable={isPinned}
                                  onDragStart={isPinned ? e => { e.dataTransfer.effectAllowed = 'move'; setDraggedVariantId(product.variantId); } : undefined}
                                  onDragOver={isPinned ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverVariantId(product.variantId); } : undefined}
                                  onDragLeave={isPinned ? () => setDragOverVariantId(prev => prev === product.variantId ? null : prev) : undefined}
                                  onDrop={isPinned ? e => { e.preventDefault(); onPinnedDrop(product.variantId); setDragOverVariantId(null); } : undefined}
                                  onDragEnd={() => { setDraggedVariantId(null); setDragOverVariantId(null); }}
                                  style={{
                                    border: dragOverVariantId === product.variantId && draggedVariantId !== product.variantId
                                      ? '2px dashed #3899EC'
                                      : isPinned ? '2px solid #3899EC' : '1px solid #DFE5EB',
                                    borderRadius: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    background: dragOverVariantId === product.variantId && draggedVariantId !== product.variantId ? '#EAF4FF' : '#fff',
                                    opacity: draggedVariantId === product.variantId ? 0.4 : 1,
                                    cursor: isPinned ? 'grab' : 'default',
                                    transition: 'opacity 0.15s, border-color 0.15s',
                                  }}
                                >
                                  {/* Index + pin badge */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '6px 10px',
                                      background: isPinned ? '#EAF4FF' : '#F4F5F7',
                                      borderBottom: '1px solid #DFE5EB',
                                    }}
                                  >
                                    <Text size="tiny" weight="bold">{isPinned ? `⠿ #${globalIdx + 1}` : `#${globalIdx + 1}`}</Text>
                                    {isPinned ? <Badge skin="success">{t(`נעוץ #${pinnedPos + 1}`, `Pinned #${pinnedPos + 1}`)}</Badge> : null}
                                  </div>

                                  {/* Image */}
                                  <div
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1 / 1',
                                      overflow: 'hidden',
                                      background: '#F4F5F7',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={product.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <Text size="tiny" secondary>{t('ללא תמונה', 'No image')}</Text>
                                    )}
                                  </div>

                                  {/* Details */}
                                  <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                    <Text size="small" weight="bold" style={{ wordBreak: 'break-word' }}>{product.name}</Text>
                                    <Text size="tiny" secondary>{`Handle: ${typeof product.attributes.slug === 'string' ? product.attributes.slug : product.sku}`}</Text>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <Text size="tiny" weight="bold">{t(`מחיר: ${formatPrice(product.price)}`, `Price: ${formatPrice(product.price)}`)}</Text>
                                      {product.priceBeforeDiscount ? (
                                        <Text size="tiny" secondary style={{ textDecoration: 'line-through' }}>
                                          {t(`מחיר קודם: ${formatPrice(product.priceBeforeDiscount)}`, `Previous price: ${formatPrice(product.priceBeforeDiscount)}`)}
                                        </Text>
                                      ) : null}
                                      {product.priceMax ? (
                                        <Text size="tiny" secondary>{t(`מחיר מקסימלי: ${formatPrice(product.priceMax)}`, `Max price: ${formatPrice(product.priceMax)}`)}</Text>
                                      ) : null}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      <Badge skin={product.inStock ? 'success' : 'danger'}>
                                        {product.inStock ? t(`מלאי: ${product.inventory}`, `Stock: ${product.inventory}`) : t('אזל מהמלאי', 'Out of stock')}
                                      </Badge>
                                      {product.color ? <Badge skin="standard">{String(product.color)}</Badge> : null}
                                    </div>
                                    <Text size="tiny" secondary>
                                      {t(
                                        `וריאנטים במלאי: ${formatPercentage(Number(product.attributes.variantAvailabilityPercentage ?? 0))}`,
                                        `In-stock variants: ${formatPercentage(Number(product.attributes.variantAvailabilityPercentage ?? 0))}`,
                                      )}
                                    </Text>
                                  </div>

                                  {/* Action buttons */}
                                  <div
                                    style={{
                                      padding: '6px 10px',
                                      display: 'flex',
                                      gap: 4,
                                      borderTop: '1px solid #DFE5EB',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <Button
                                      size="tiny"
                                      skin="standard"
                                      disabled={isPinned && isFirstPinned}
                                      onClick={() => moveUpInArrangement(product.variantId)}
                                    >
                                      {isPinned ? t('↑ קדם', '↑ Promote') : t('⬆ לראש', '⬆ To Top')}
                                    </Button>
                                    <Button
                                      size="tiny"
                                      skin="standard"
                                      disabled={!isPinned}
                                      onClick={() => moveDownInArrangement(product.variantId)}
                                    >
                                      {t('↓ הורד', '↓ Demote')}
                                    </Button>
                                    <Button
                                      size="tiny"
                                      skin={isPinned ? 'light' : 'standard'}
                                      onClick={() => togglePinInPlace(product, globalIdx)}
                                    >
                                      {isPinned ? t('שחרר', 'Unpin') : t('נעץ', 'Pin')}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <Box direction="horizontal" gap="SP2">
                            <Button
                              size="small"
                              secondary
                              disabled={pinningPage <= 1}
                              onClick={() => setPinningPage(prev => prev - 1)}
                            >
                              {t('◀ הקודם', '◀ Previous')}
                            </Button>
                            <Button
                              size="small"
                              secondary
                              disabled={pinningPage >= pinningTotalPages}
                              onClick={() => setPinningPage(prev => prev + 1)}
                            >
                              {t('הבא ▶', 'Next ▶')}
                            </Button>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Card>
                </Box>
              ) : null}

              {activeTab === 'segments' ? (
                <Box direction="vertical" gap="SP4">
                  <Card>
                    <Box direction="vertical" gap="SP3" padding="SP4">
                      <Text weight="bold">{t('4. חלוקה למקטעים', '4. Segment Distribution')}</Text>
                      <Text size="small" secondary>{t('המקטע הראשון לפי עדיפות שנמצא מתאים מנצח. כך אפשר לסדר את טופ-100 המוצרים בקבוצות.', 'The first matching segment by priority wins. This lets you order the top 100 products in groups.')}</Text>
                      <Divider />
                      <Box direction="horizontal" gap="SP2">
                        <Input
                          value={newSegmentName}
                          onChange={event => setNewSegmentName(event.target.value)}
                          placeholder={t('שם מקטע', 'Segment name')}
                          size="small"
                        />
                        <Button size="small" onClick={addSegment}>{t('הוסף מקטע', 'Add segment')}</Button>
                      </Box>

                      <Box direction="vertical" gap="SP2">
                        {config.segments.length === 0 ? (
                          <Text size="small" secondary>{t('עדיין אין מקטעים. הוסף מקטע ראשון למעלה.', 'No segments yet. Add your first segment above.')}</Text>
                        ) : null}
                        {config.segments
                          .slice()
                          .sort((a, b) => a.priority - b.priority)
                          .map((segment, index) => {
                            const firstField = localizedFilterFieldOptions[0]?.id ?? 'name';
                            const draft = segmentDrafts[segment.id] ?? {
                              field: firstField,
                              operator: getDefaultOperator(firstField),
                              value: getSuggestedValue(firstField),
                              optionName: '',
                              isExclusion: false,
                            };
                            const resolvedDraftField = draft.field === 'productOptions'
                              ? `productOption.${draft.optionName || firstProductOptionName}`
                              : draft.field;
                            const draftFieldDef = fieldDefinitionMap.get(resolvedDraftField) ?? fieldDefinitionMap.get(draft.field);
                            const draftValueOptions = draft.field === 'productOptions'
                              ? (productOptionValuesByName[draft.optionName || firstProductOptionName] ?? []).map(value => ({ label: value, value }))
                              : (draftFieldDef?.type === 'select' || draftFieldDef?.type === 'boolean')
                                ? (draftFieldDef?.options
                                  ?? (draftFieldDef?.type === 'boolean'
                                    ? [{ label: t('כן', 'Yes'), value: 'true' }, { label: t('לא', 'No'), value: 'false' }]
                                    : []))
                                : [];
                            const draftOperatorOptions = getOperatorsForField(draft.field);
                            const selectedDraftValues = draft.value.split(',').map(v => v.trim()).filter(Boolean);

                            const updateDraft = (updater: (prev: RuleDraftState) => RuleDraftState) => {
                              setSegmentDrafts(prev => {
                                const current = prev[segment.id] ?? { field: firstField, operator: getDefaultOperator(firstField), value: getSuggestedValue(firstField), optionName: '', isExclusion: false };
                                return { ...prev, [segment.id]: updater(current) };
                              });
                            };

                            return (
                              <Card key={segment.id}>
                                <Box direction="vertical" gap="SP3" padding="SP3">

                                  {/* ─── Header ─── */}
                                  <Box direction="horizontal" align="space-between" verticalAlign="middle">
                                    <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                                      <Badge>{t(`עדיפות ${index + 1}`, `Priority ${index + 1}`)}</Badge>
                                      <Text size="small" weight="bold">{segment.name}</Text>
                                    </Box>
                                    <Box direction="horizontal" gap="SP2">
                                      <Button size="tiny" skin="standard" onClick={() => reorderSegment(segment.id, 'up')}>{t('למעלה', 'Up')}</Button>
                                      <Button size="tiny" skin="standard" onClick={() => reorderSegment(segment.id, 'down')}>{t('למטה', 'Down')}</Button>
                                      <Button size="tiny" skin="standard" onClick={() => removeSegment(segment.id)}>{t('הסר', 'Remove')}</Button>
                                    </Box>
                                  </Box>

                                  <Divider />

                                  {/* ─── Filters Section ─── */}
                                  <Box direction="vertical" gap="SP2">
                                    <Box direction="horizontal" align="space-between" verticalAlign="middle">
                                      <Text size="small" weight="bold">{t(`מסננים (${segment.filters.rules.length})`, `Filters (${segment.filters.rules.length})`)}</Text>
                                      {segment.filters.rules.length > 1 ? (
                                        <Box direction="horizontal" gap="SP1">
                                          <Button
                                            size="tiny"
                                            skin={segment.filters.logic === 'AND' ? 'standard' : 'light'}
                                            onClick={() => setSegmentFilterLogic(segment.id, 'AND')}
                                          >{t('כל התנאים (AND)', 'All (AND)')}</Button>
                                          <Button
                                            size="tiny"
                                            skin={segment.filters.logic === 'OR' ? 'standard' : 'light'}
                                            onClick={() => setSegmentFilterLogic(segment.id, 'OR')}
                                          >{t('אחד מהתנאים (OR)', 'Any (OR)')}</Button>
                                        </Box>
                                      ) : null}
                                    </Box>

                                    {segment.filters.rules.length === 0 ? (
                                      <Text size="tiny" secondary>{t('אין מסננים עדיין', 'No filters yet')}</Text>
                                    ) : (
                                      <Box direction="vertical" gap="SP1">
                                        {segment.filters.rules.map(rule => (
                                          <Box
                                            key={rule.id}
                                            direction="horizontal"
                                            align="space-between"
                                            verticalAlign="middle"
                                            style={{ background: '#F0F4F7', borderRadius: 6, padding: '4px 10px' }}
                                          >
                                            <Text size="tiny">
                                              {rule.isExclusion ? `❌ ` : ''}{fieldDefinitionMap.get(rule.field)?.label ?? formatFieldLabel(rule.field)} {operatorLabels[rule.operator] ?? rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}
                                            </Text>
                                            <Button size="tiny" skin="standard" onClick={() => removeSegmentFilter(segment.id, rule.id)}>{t('הסר', 'Remove')}</Button>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}

                                    {/* Add filter builder */}
                                    <div style={{ borderTop: '1px solid #DFE5EB', paddingTop: 8 }}>
                                      <Box direction="vertical" gap="SP1">
                                        <Text size="tiny" secondary>{t('הוסף מסנן:', 'Add filter:')}</Text>
                                        <Box direction="horizontal" gap="SP2" verticalAlign="middle" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                          <div style={{ width: 180 }}>
                                            <Dropdown
                                              selectedId={draft.field}
                                              options={localizedFilterFieldOptions.map(field => ({ id: field.id, value: field.value }))}
                                              onSelect={option => {
                                                const nextField = String(option.id);
                                                updateDraft(prev => ({
                                                  ...prev,
                                                  field: nextField,
                                                  operator: getDefaultOperator(nextField),
                                                  value: getSuggestedValue(nextField),
                                                }));
                                              }}
                                              size="small"
                                            />
                                          </div>

                                          <div style={{ width: 180 }}>
                                            <Dropdown
                                              selectedId={draft.operator}
                                              options={draftOperatorOptions.map(op => ({ id: op, value: operatorLabels[op] ?? op }))}
                                              onSelect={option => updateDraft(prev => ({ ...prev, operator: option.id as FilterOperator }))}
                                              size="small"
                                            />
                                          </div>

                                          {draft.field === 'productOptions' ? (
                                            <div style={{ width: 180 }}>
                                              <Dropdown
                                                selectedId={draft.optionName || firstProductOptionName}
                                                options={productOptionNameDropdownOptions}
                                                onSelect={option => {
                                                  const nextOptionName = String(option.id);
                                                  const optionValues = productOptionValuesByName[nextOptionName] ?? [];
                                                  updateDraft(prev => ({
                                                    ...prev,
                                                    optionName: nextOptionName,
                                                    value: optionValues[0] ?? '',
                                                  }));
                                                }}
                                                size="small"
                                              />
                                            </div>
                                          ) : null}

                                          {draft.operator === 'oneOf' && draftValueOptions.length > 0 ? (
                                            <select
                                              multiple
                                              value={selectedDraftValues}
                                              onChange={event => {
                                                const vals = Array.from(event.target.selectedOptions).map(o => o.value);
                                                updateDraft(prev => ({ ...prev, value: vals.join(', ') }));
                                              }}
                                              style={{ minHeight: 64, width: 180, borderRadius: 6, border: '1px solid #C1C7D0', padding: 4, background: 'white', fontSize: 13 }}
                                            >
                                              {draftValueOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                              ))}
                                            </select>
                                          ) : draftValueOptions.length > 0 ? (
                                            <div style={{ width: 180 }}>
                                              <Dropdown
                                                selectedId={draft.value || undefined}
                                                options={draftValueOptions.map(opt => ({ id: opt.value, value: opt.label }))}
                                                onSelect={option => updateDraft(prev => ({ ...prev, value: String(option.id) }))}
                                                size="small"
                                                placeholder={t('ערך', 'Value')}
                                              />
                                            </div>
                                          ) : (
                                            <div style={{ width: 180 }}>
                                              <Input
                                                value={draft.value}
                                                onChange={event => updateDraft(prev => ({ ...prev, value: event.target.value }))}
                                                size="small"
                                                placeholder={t('ערך', 'Value')}
                                              />
                                            </div>
                                          )}

                                          <Button size="small" skin="standard" onClick={() => addSegmentFilter(segment.id)}>{t('הוסף מסנן', 'Add filter')}</Button>
                                        </Box>

                                        <Checkbox
                                          checked={Boolean(draft.isExclusion)}
                                          onChange={event => updateDraft(prev => ({ ...prev, isExclusion: event.target.checked }))}
                                        >
                                          {t('החרג תנאי', 'Exclude rule')}
                                        </Checkbox>
                                      </Box>
                                    </div>
                                  </Box>

                                  <Divider />

                                  {/* ─── Sorters Section ─── */}
                                  <Box direction="vertical" gap="SP2">
                                    <Text size="small" weight="bold">{t(`ממיינים (${segment.sorters.length})`, `Sorters (${segment.sorters.length})`)}</Text>

                                    {segment.sorters.length === 0 ? (
                                      <Text size="tiny" secondary>{t('אין ממיינים עדיין', 'No sorters yet')}</Text>
                                    ) : (
                                      <Box direction="vertical" gap="SP1">
                                        {segment.sorters.map(sorter => (
                                          <Box
                                            key={sorter.id}
                                            direction="horizontal"
                                            align="space-between"
                                            verticalAlign="middle"
                                            style={{ background: '#EEF7EE', borderRadius: 6, padding: '4px 10px' }}
                                          >
                                            <Text size="tiny">{sorter.field} ({sorter.direction})</Text>
                                            <Button size="tiny" skin="standard" onClick={() => removeSegmentSorter(segment.id, sorter.id)}>{t('הסר', 'Remove')}</Button>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}

                                    {/* Quick-add sorter buttons */}
                                    <div style={{ borderTop: '1px solid #DFE5EB', paddingTop: 8 }}>
                                      <Box direction="vertical" gap="SP1">
                                        <Text size="tiny" secondary>{t('הוסף מיון מהיר:', 'Quick-add sort:')}</Text>
                                        <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                                          <Button size="tiny" secondary onClick={() => addSegmentSorter(segment.id, 'inventoryPercentage', 'desc')}>{t('מלאי מהגבוה לנמוך', 'Stock high to low')}</Button>
                                          <Button size="tiny" secondary onClick={() => addSegmentSorter(segment.id, 'bestSellers', 'desc')}>{t('רבי מכר מהגבוה', 'Best-sellers high')}</Button>
                                          <Button size="tiny" secondary onClick={() => addSegmentSorter(segment.id, 'publishDate', 'desc')}>{t('החדשים ביותר', 'Newest first')}</Button>
                                        </Box>
                                      </Box>
                                    </div>
                                  </Box>

                                </Box>
                              </Card>
                            );
                          })}
                      </Box>
                    </Box>
                  </Card>
                </Box>
              ) : null}

              {activeTab === 'preview' ? (
                <Box direction="vertical" gap="SP4">
                  <Card>
                    <Box direction="vertical" gap="SP2" padding="SP4">
                      <Text weight="bold">{t('5. תצוגה מקדימה של הסדר הסופי', '5. Final Arrangement Preview')}</Text>
                      <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                        <Badge>{t(`סוננו: ${livePreviewResult.statistics.filteredProducts}`, `Filtered: ${livePreviewResult.statistics.filteredProducts}`)}</Badge>
                        <Badge skin="success">{t(`נעוצים: ${livePreviewResult.statistics.pinnedProducts}`, `Pinned: ${livePreviewResult.statistics.pinnedProducts}`)}</Badge>
                        <Badge skin="standard">{t(`סופי: ${livePreviewResult.arrangedProducts.length}`, `Final: ${livePreviewResult.arrangedProducts.length}`)}</Badge>
                      </Box>

                      <Divider />
                      {top100Preview.length === 0 ? (
                        <Text size="small" secondary>{t('אין מוצרים להצגה בתצוגה המקדימה עבור ההגדרות הנוכחיות.', 'No products to display in preview for current settings.')}</Text>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {top100Preview.map(product => (
                            <Card key={`${product.variantId}-${product.sortOrder}`}>
                              <Box direction="vertical" gap="SP2" padding="SP2">
                                <div
                                  style={{
                                    width: '100%',
                                    aspectRatio: '1 / 1',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#F4F5F7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {typeof product.attributes.imageUrl === 'string' && product.attributes.imageUrl ? (
                                    <img
                                      src={product.attributes.imageUrl}
                                      alt={product.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <Text size="tiny" secondary>{t('ללא תמונה', 'No image')}</Text>
                                  )}
                                </div>

                                <Box direction="horizontal" align="space-between" verticalAlign="middle">
                                  <Badge>#{product.sortOrder + 1}</Badge>
                                  {product.isPinned ? <Badge skin="success">{t('נעוץ', 'Pinned')}</Badge> : <Badge skin="neutral">{t('רגיל', 'Regular')}</Badge>}
                                </Box>

                                <Text size="small" weight="bold">{product.name}</Text>
                                <Text size="tiny" secondary>{t(`מחיר: ${formatPrice(product.price)} | מלאי: ${formatPercentage(product.inventoryPercentage)}`, `Price: ${formatPrice(product.price)} | Stock: ${formatPercentage(product.inventoryPercentage)}`)}</Text>

                                <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                                  {product.segmentName ? <Badge skin="standard">{product.segmentName}</Badge> : <Badge skin="neutral">{t('ללא שיוך', 'Unassigned')}</Badge>}
                                  {product.pushedToBottom ? <Badge skin="warning">{t('נדחף לתחתית', 'Pushed to bottom')}</Badge> : null}
                                </Box>
                              </Box>
                            </Card>
                          ))}
                        </div>
                      )}
                    </Box>
                  </Card>
                </Box>
              ) : null}

              {activeTab === 'filters' ? (
                isLoadingProducts ? (
                  <Card>
                    <Box direction="vertical" gap="SP3" padding="SP4">
                      <Text weight="bold">{t('תצוגת מאגר', 'Product Pool')}</Text>
                      <Text size="small" secondary>{t('טוען מוצרים...', 'Loading products...')}</Text>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 12,
                        }}
                      >
                        {Array.from({ length: 6 }).map((_, index) => (
                          <div
                            key={`pool-loading-${index}`}
                            style={{
                              height: 250,
                              borderRadius: 12,
                              background: 'linear-gradient(90deg, #EEF0F3 25%, #F7F8FA 37%, #EEF0F3 63%)',
                              backgroundSize: '400% 100%',
                              animation: 'shelfShimmer 1.2s ease-in-out infinite',
                            }}
                          />
                        ))}
                      </div>
                    </Box>
                  </Card>
                ) : (
                  <ProductPoolGrid
                    productPoolPage={productPoolPage}
                    productPoolTotalPages={productPoolTotalPages}
                    productPoolLength={productPool.length}
                    sourceProductsLength={sourceProducts.length}
                    pagedProductPool={pagedProductPool}
                    pinnedVariantIds={pinnedVariantIds}
                    getBaseVariantId={getBaseVariantId}
                    colorModelMetaByVariantId={colorModelMetaByVariantId}
                    onPrevPage={() => setProductPoolPage(prev => Math.max(1, prev - 1))}
                    onNextPage={() => setProductPoolPage(prev => Math.min(productPoolTotalPages, prev + 1))}
                    title={t('תצוגת מאגר', 'Product Pool')}
                    subtitle={t('התצוגה כוללת כרטיסיות של דגמי צבע עם תמונה, שם ו-handle. כאן אפשר לזהות גם אילו דגמי צבע שייכים לאותו מוצר.', 'This view shows color-model cards with image, name, and handle. You can identify which color models belong to the same base product.')}
                    paginationSummary={({ page, totalPages, filteredCount, totalCount }) => t(`עמוד ${page} מתוך ${totalPages} (${filteredCount} מוצרים מסוננים מתוך ${totalCount} בקטגוריה)`, `Page ${page} of ${totalPages} (${filteredCount} filtered products out of ${totalCount} in category)`)}
                    emptyStateLabel={t('אין מוצרים שמתאימים כרגע לפילטרים שהוגדרו.', 'No products currently match the configured filters.')}
                    noImageLabel={t('ללא תמונה', 'No image')}
                    handleLabel="handle"
                    pinnedLabel={t('נעוץ', 'Pinned')}
                    inStockLabel={t('במלאי', 'In stock')}
                    outOfStockLabel={t('אזל מהמלאי', 'Out of stock')}
                    colorLabel={t('צבע', 'Color')}
                    colorModelLabel={({ position, groupSize }) => t(`דגם צבע ${position} מתוך ${groupSize}`, `Color model ${position} of ${groupSize}`)}
                    baseProductLabel={(baseVariantId) => t(`שייך למוצר בסיס: ${baseVariantId}`, `Belongs to base product: ${baseVariantId}`)}
                    previousLabel={t('הקודם', 'Previous')}
                    nextLabel={t('הבא', 'Next')}
                  />
                )
              ) : null}

            </Box>
          </Page.Content>
        </Page>
      </div>
    </WixDesignSystemProvider>
  );
};

export default ShelfArrangementDashboard;