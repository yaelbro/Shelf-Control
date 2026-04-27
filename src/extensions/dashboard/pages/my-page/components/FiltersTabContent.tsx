import type { Dispatch, FC, SetStateAction } from 'react';
import { Box, Card, Text } from '@wix/design-system';
import type { FilterOperator, Product, RuleGroup } from '../../../types/shelfArrangement';
import type { RuleDraftState } from './MainFilterEditor';
import { MainFilterEditor } from './MainFilterEditor';
import { ProductPoolGrid } from './ProductPoolGrid';
import { getBaseVariantId } from '../my-page.utils';

type T = (he: string, en: string) => string;

type ColorModelMeta = {
  groupSize: number;
  position: number;
  baseVariantId: string;
};

type Props = {
  t: T;
  isLoadingProducts: boolean;
  filteredProducts: Product[];
  sourceProducts: Product[];
  localizedFilterFieldOptions: { id: string; value: string }[];
  operatorLabels: Record<FilterOperator, string>;
  getRuleHintLabel: (group: RuleGroup) => string;
  getMainRuleFieldLabel: (fieldName: string) => string;
  getSuggestedValue: (fieldName: string, optionName?: string) => string;
  firstProductOptionName: string;
  productOptionNameDropdownOptions: { id: string; value: string }[];
  // Main filter editor
  filterRuleGroup: RuleGroup;
  newRule: RuleDraftState;
  setNewRule: Dispatch<SetStateAction<RuleDraftState>>;
  setMainRuleLogic: (logic: RuleGroup['logic']) => void;
  addMainRule: () => void;
  removeMainRule: (ruleId: string) => void;
  mainFilterOperatorOptions: FilterOperator[];
  mainFilterValueOptions: { id: string | number; value: string }[];
  // Bottom filter editor
  bottomRuleGroup: RuleGroup;
  newBottomRule: RuleDraftState;
  setNewBottomRule: Dispatch<SetStateAction<RuleDraftState>>;
  setBottomRuleLogic: (logic: RuleGroup['logic']) => void;
  addBottomRule: () => void;
  removeBottomRule: (ruleId: string) => void;
  bottomFilterOperatorOptions: FilterOperator[];
  bottomFilterValueOptions: { id: string | number; value: string }[];
  // Product pool grid
  productPoolPage: number;
  productPoolTotalPages: number;
  productPoolLength: number;
  pagedProductPool: Product[];
  pinnedVariantIds: Set<string>;
  colorModelMetaByVariantId: Map<string, ColorModelMeta>;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export const FiltersTabContent: FC<Props> = ({
  t,
  isLoadingProducts,
  filteredProducts,
  sourceProducts,
  localizedFilterFieldOptions,
  operatorLabels,
  getRuleHintLabel,
  getMainRuleFieldLabel,
  getSuggestedValue,
  firstProductOptionName,
  productOptionNameDropdownOptions,
  filterRuleGroup,
  newRule,
  setNewRule,
  setMainRuleLogic,
  addMainRule,
  removeMainRule,
  mainFilterOperatorOptions,
  mainFilterValueOptions,
  bottomRuleGroup,
  newBottomRule,
  setNewBottomRule,
  setBottomRuleLogic,
  addBottomRule,
  removeBottomRule,
  bottomFilterOperatorOptions,
  bottomFilterValueOptions,
  productPoolPage,
  productPoolTotalPages,
  productPoolLength,
  pagedProductPool,
  pinnedVariantIds,
  colorModelMetaByVariantId,
  onPrevPage,
  onNextPage,
}) => (
  <>
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
        filterRuleGroup={filterRuleGroup}
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
        filterRuleGroup={bottomRuleGroup}
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
              {t(
                `${filteredProducts.length} מוצרים מתאימים מתוך ${sourceProducts.length} שנטענו לקטגוריה זו.`,
                `${filteredProducts.length} matching products out of ${sourceProducts.length} loaded for this category.`,
              )}
            </Text>
          )}
        </Box>
      </Card>
    </Box>

    {isLoadingProducts ? (
      <Card>
        <Box direction="vertical" gap="SP3" padding="SP4">
          <Text weight="bold">{t('תצוגת מאגר', 'Product Pool')}</Text>
          <Text size="small" secondary>{t('טוען מוצרים...', 'Loading products...')}</Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
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
        productPoolLength={productPoolLength}
        sourceProductsLength={sourceProducts.length}
        pagedProductPool={pagedProductPool}
        pinnedVariantIds={pinnedVariantIds}
        getBaseVariantId={getBaseVariantId}
        colorModelMetaByVariantId={colorModelMetaByVariantId}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
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
    )}
  </>
);
