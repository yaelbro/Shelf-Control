import type { FC } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Input,
  Page,
  Tabs,
  Text,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

import type {
  ArrangementResult,
  CategoryConfig,
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
  MOCK_PRODUCTS,
  SAMPLE_CATEGORIES,
  formatPercentage,
  formatPrice,
  generateId,
} from '../../lib/mockData';

type ActiveTab = 'filters' | 'pinning' | 'segments' | 'preview';

const TAB_ITEMS = [
  { id: 'filters', title: 'Filters' },
  { id: 'pinning', title: 'Pinned' },
  { id: 'segments', title: 'Segments' },
  { id: 'preview', title: 'Preview' },
];

const OPERATOR_OPTIONS: FilterOperator[] = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'oneOf',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
];

const SORT_FIELDS = ['inventoryPercentage', 'bestSellers', 'publishDate'];

function cloneConfig(config: CategoryConfig): CategoryConfig {
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

function coerceValue(operator: FilterOperator, rawValue: string): string | number | string[] {
  if (operator === 'oneOf') {
    return rawValue
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }

  const asNumber = Number(rawValue);
  if (!Number.isNaN(asNumber) && rawValue.trim() !== '') {
    return asNumber;
  }

  return rawValue;
}

function getRuleHint(group: RuleGroup): string {
  if (group.rules.length === 0) {
    return 'No rules yet';
  }

  return `${group.rules.length} rules (${group.logic})`;
}

const ShelfArrangementDashboard: FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('filters');
  const [config, setConfig] = useState<CategoryConfig>(() => cloneConfig(MOCK_DEFAULT_CONFIG));
  const [previewResult, setPreviewResult] = useState<ArrangementResult | null>(null);
  const [undoStack, setUndoStack] = useState<CategoryConfig[]>([]);
  const [draggedVariantId, setDraggedVariantId] = useState<string | null>(null);

  const [newRule, setNewRule] = useState({
    field: 'category',
    operator: 'equals' as FilterOperator,
    value: 'Shirts',
    isExclusion: false,
  });

  const [newBottomRule, setNewBottomRule] = useState({
    field: 'inventoryPercentage',
    operator: 'lessThan' as FilterOperator,
    value: '15',
    isExclusion: false,
  });

  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentSize, setNewSegmentSize] = useState('20');

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
    () => applyFilters(MOCK_PRODUCTS, config.filterRuleGroup).slice(0, config.maxProducts),
    [config.filterRuleGroup, config.maxProducts],
  );

  const pinnedVariantIds = useMemo(
    () => new Set(config.pinnedProducts.map(item => item.variantId)),
    [config.pinnedProducts],
  );

  const availableForPinning = useMemo(
    () => filteredProducts.filter(product => !pinnedVariantIds.has(product.variantId)),
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

    const rule: Rule = {
      id: generateId('rule'),
      field: newRule.field,
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

    setNewRule(prev => ({ ...prev, value: '' }));
  }, [newRule, updateConfig]);

  const addBottomRule = useCallback(() => {
    if (!newBottomRule.field || !newBottomRule.value.trim()) {
      return;
    }

    const rule: Rule = {
      id: generateId('bottom-rule'),
      field: newBottomRule.field,
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
      filterRuleGroup: {
        ...prev.filterRuleGroup,
        rules: prev.filterRuleGroup.rules.map(rule => {
          if (rule.field === 'category' && rule.operator === 'equals') {
            return { ...rule, value: categoryName };
          }
          return rule;
        }),
      },
    }));
  }, [updateConfig]);

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
    const sizeNumeric = Number(newSegmentSize);
    const safeSize = Number.isNaN(sizeNumeric) ? 20 : Math.max(1, Math.min(100, sizeNumeric));

    const segment: Segment = {
      id: generateId('segment'),
      name: newSegmentName.trim() || `Segment ${config.segments.length + 1}`,
      priority: config.segments.length + 1,
      size: safeSize,
      filters: { rules: [], logic: 'AND' },
      sorters: [],
    };

    updateConfig(prev => ({ ...prev, segments: [...prev.segments, segment] }));
    setNewSegmentName('');
    setNewSegmentSize('20');
  }, [config.segments.length, newSegmentName, newSegmentSize, updateConfig]);

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
    updateConfig(prev => ({
      ...prev,
      segments: prev.segments.map(segment => {
        if (segment.id !== segmentId) {
          return segment;
        }

        const rule: Rule = {
          id: generateId('segment-rule'),
          field: 'color',
          operator: 'equals',
          value: 'Blue',
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
  }, [updateConfig]);

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

  const runPreview = useCallback(() => {
    const result = generateArrangement(config, MOCK_PRODUCTS);
    setPreviewResult(result);
    setActiveTab('preview');
  }, [config]);

  const top100Preview = useMemo(() => {
    const source = previewResult?.arrangedProducts ?? [];
    return source.slice(0, 100);
  }, [previewResult]);

  const renderRuleEditor = (
    title: string,
    group: RuleGroup,
    onAdd: () => void,
    onRemove: (ruleId: string) => void,
    state: { field: string; operator: FilterOperator; value: string; isExclusion: boolean },
    setState: (updater: (prev: { field: string; operator: FilterOperator; value: string; isExclusion: boolean }) => { field: string; operator: FilterOperator; value: string; isExclusion: boolean }) => void,
  ) => (
    <Card>
      <Box direction="vertical" gap="SP3" padding="SP4">
        <Text weight="bold">{title}</Text>
        <Text size="small" secondary>{getRuleHint(group)}</Text>
        <Divider />

        <Box direction="vertical" gap="SP2">
          {group.rules.map(rule => (
            <Card key={rule.id}>
              <Box direction="horizontal" verticalAlign="middle" align="space-between" padding="SP2">
                <Box direction="vertical" gap="SP1">
                  <Text size="small">{rule.field} {rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}</Text>
                  {rule.isExclusion ? <Badge skin="warning">Exclusion</Badge> : null}
                </Box>
                <Button size="tiny" skin="standard" onClick={() => onRemove(rule.id)}>Remove</Button>
              </Box>
            </Card>
          ))}
        </Box>

        <Divider />
        <Box direction="vertical" gap="SP2">
          <Input
            value={state.field}
            onChange={event => setState(prev => ({ ...prev, field: event.target.value }))}
            placeholder="Field (e.g. color, inventoryPercentage)"
            size="small"
          />
          <Input
            value={state.operator}
            onChange={event => setState(prev => ({ ...prev, operator: event.target.value as FilterOperator }))}
            placeholder="Operator (e.g. equals, greaterThan)"
            size="small"
          />
          <Input
            value={state.value}
            onChange={event => setState(prev => ({ ...prev, value: event.target.value }))}
            placeholder="Value"
            size="small"
          />
          <Checkbox
            checked={state.isExclusion}
            onChange={event => setState(prev => ({ ...prev, isExclusion: event.target.checked }))}
          >
            Exclusion rule
          </Checkbox>
          <Box direction="horizontal" gap="SP2">
            <Button size="small" onClick={onAdd}>Add Rule</Button>
            <Text size="tiny" secondary>
              Supported operators: {OPERATOR_OPTIONS.join(', ')}
            </Text>
          </Box>
        </Box>
      </Box>
    </Card>
  );

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Shelf Arrangement"
          subtitle={`Top ${config.maxProducts} variants in ${config.categoryName}`}
          actionsBar={
            <Box direction="horizontal" gap="SP2">
              <Button secondary disabled={undoStack.length === 0} onClick={onUndo}>Undo</Button>
              <Button onClick={runPreview}>Preview</Button>
            </Box>
          }
        />

        <Page.Content>
          <Box direction="vertical" gap="SP4">
            <Card>
              <Box direction="vertical" gap="SP3" padding="SP4">
                <Text weight="bold">1. Select Category</Text>
                <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                  {SAMPLE_CATEGORIES.map(category => (
                    <Button
                      key={category.id}
                      size="small"
                      skin={config.categoryId === category.id ? 'premium' : 'standard'} priority={config.categoryId === category.id ? 'primary' : 'secondary'}
                      onClick={() => setCategory(category.id, category.name)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Card>

            <Tabs
              activeId={activeTab}
              items={TAB_ITEMS}
              onClick={item => setActiveTab(item.id as ActiveTab)}
            />

            {activeTab === 'filters' ? (
              <Box direction="vertical" gap="SP4">
                {renderRuleEditor(
                  '2. Main Filtering Rules',
                  config.filterRuleGroup,
                  addMainRule,
                  removeMainRule,
                  newRule,
                  setNewRule,
                )}

                {renderRuleEditor(
                  'Global Bottom Push Conditions',
                  config.bottomRuleGroup ?? { rules: [], logic: 'AND' },
                  addBottomRule,
                  removeBottomRule,
                  newBottomRule,
                  setNewBottomRule,
                )}

                <Card>
                  <Box direction="vertical" gap="SP2" padding="SP4">
                    <Text weight="bold">Filtered Pool Preview</Text>
                    <Text size="small" secondary>
                      {filteredProducts.length} eligible, in-stock products out of first 100 variants.
                    </Text>
                  </Box>
                </Card>
              </Box>
            ) : null}

            {activeTab === 'pinning' ? (
              <Box direction="vertical" gap="SP4">
                <Card>
                  <Box direction="vertical" gap="SP3" padding="SP4">
                    <Text weight="bold">3. Pinned Products (drag to reorder)</Text>
                    <Text size="small" secondary>Pinned items always stay on top. Out-of-stock products are automatically excluded.</Text>
                    <Divider />

                    {pinnedPreview.length === 0 ? <Text size="small" secondary>No pinned products yet.</Text> : null}

                    <Box direction="vertical" gap="SP2">
                      {pinnedPreview.map((pin, index) => {
                        const product = MOCK_PRODUCTS.find(item => item.variantId === pin.variantId);
                        if (!product) {
                          return null;
                        }

                        return (
                          <div
                            key={pin.variantId}
                            draggable
                            onDragStart={() => setDraggedVariantId(pin.variantId)}
                            onDragOver={event => event.preventDefault()}
                            onDrop={() => onPinnedDrop(pin.variantId)}
                          >
                            <Card>
                              <Box direction="horizontal" align="space-between" verticalAlign="middle" padding="SP2">
                                <Box direction="vertical" gap="SP1">
                                  <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                                    <Badge>#{index + 1}</Badge>
                                    <Text size="small">{product.name}</Text>
                                  </Box>
                                  <Text size="tiny" secondary>{product.color ?? 'N/A'} / {product.size ?? 'N/A'} - {formatPrice(product.price)}</Text>
                                </Box>
                                <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                                  <Input
                                    value={String(pin.priority)}
                                    size="small"
                                    onChange={event => updatePinPriority(pin.variantId, event.target.value)}
                                    type="number"
                                  />
                                  <Button size="tiny" skin="standard" onClick={() => removePinned(pin.variantId)}>Unpin</Button>
                                </Box>
                              </Box>
                            </Card>
                          </div>
                        );
                      })}
                    </Box>
                  </Box>
                </Card>

                <Card>
                  <Box direction="vertical" gap="SP3" padding="SP4">
                    <Text weight="bold">Promote Product To Top</Text>
                    <Text size="small" secondary>Quick action to pin and move the product to the first pinned position.</Text>
                    <Divider />
                    <Box direction="vertical" gap="SP2">
                      {availableForPinning.slice(0, 15).map(product => (
                        <Card key={product.variantId}>
                          <Box direction="horizontal" align="space-between" verticalAlign="middle" padding="SP2">
                            <Box direction="vertical" gap="SP1">
                              <Text size="small">{product.name}</Text>
                              <Text size="tiny" secondary>{formatPrice(product.price)} - Inventory {formatPercentage(product.inventoryPercentage)}</Text>
                            </Box>
                            <Button size="tiny" onClick={() => pinProduct(product)}>Promote</Button>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                </Card>
              </Box>
            ) : null}

            {activeTab === 'segments' ? (
              <Box direction="vertical" gap="SP4">
                <Card>
                  <Box direction="vertical" gap="SP3" padding="SP4">
                    <Text weight="bold">4. Segmentation</Text>
                    <Text size="small" secondary>First matching segment wins. Products belong to one segment only.</Text>
                    <Divider />
                    <Box direction="horizontal" gap="SP2">
                      <Input
                        value={newSegmentName}
                        onChange={event => setNewSegmentName(event.target.value)}
                        placeholder="Segment name"
                        size="small"
                      />
                      <Input
                        value={newSegmentSize}
                        onChange={event => setNewSegmentSize(event.target.value)}
                        placeholder="Size"
                        type="number"
                        size="small"
                      />
                      <Button size="small" onClick={addSegment}>Add Segment</Button>
                    </Box>

                    <Box direction="vertical" gap="SP2">
                      {config.segments
                        .slice()
                        .sort((a, b) => a.priority - b.priority)
                        .map((segment, index) => (
                          <Card key={segment.id}>
                            <Box direction="vertical" gap="SP2" padding="SP3">
                              <Box direction="horizontal" align="space-between" verticalAlign="middle">
                                <Box direction="vertical" gap="SP1">
                                  <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                                    <Badge>Priority {index + 1}</Badge>
                                    <Text size="small" weight="bold">{segment.name}</Text>
                                  </Box>
                                  <Text size="tiny" secondary>Size: {segment.size} | Filters: {segment.filters.rules.length} | Sorters: {segment.sorters.length}</Text>
                                </Box>
                                <Box direction="horizontal" gap="SP2">
                                  <Button size="tiny" skin="standard" onClick={() => reorderSegment(segment.id, 'up')}>Up</Button>
                                  <Button size="tiny" skin="standard" onClick={() => reorderSegment(segment.id, 'down')}>Down</Button>
                                  <Button size="tiny" skin="standard" onClick={() => removeSegment(segment.id)}>Remove</Button>
                                </Box>
                              </Box>

                              <Divider />
                              <Box direction="horizontal" gap="SP2">
                                <Button size="tiny" secondary onClick={() => addSegmentFilter(segment.id)}>Add Default Filter</Button>
                                <Button size="tiny" secondary onClick={() => addSegmentSorter(segment.id, 'inventoryPercentage', 'desc')}>Sort Inventory Desc</Button>
                                <Button size="tiny" secondary onClick={() => addSegmentSorter(segment.id, 'bestSellers', 'desc')}>Sort Best Sellers Desc</Button>
                                <Button size="tiny" secondary onClick={() => addSegmentSorter(segment.id, 'publishDate', 'desc')}>Sort Newest</Button>
                              </Box>

                              <Box direction="vertical" gap="SP1">
                                {segment.filters.rules.map(rule => (
                                  <Box key={rule.id} direction="horizontal" align="space-between" verticalAlign="middle">
                                    <Text size="tiny">Filter: {rule.field} {rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}</Text>
                                    <Button size="tiny" skin="standard" onClick={() => removeSegmentFilter(segment.id, rule.id)}>Remove</Button>
                                  </Box>
                                ))}
                              </Box>

                              <Box direction="vertical" gap="SP1">
                                {segment.sorters.map(sorter => (
                                  <Box key={sorter.id} direction="horizontal" align="space-between" verticalAlign="middle">
                                    <Text size="tiny">Sort: {sorter.field} ({sorter.direction})</Text>
                                    <Button size="tiny" skin="standard" onClick={() => removeSegmentSorter(segment.id, sorter.id)}>Remove</Button>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </Card>
                        ))}
                    </Box>
                  </Box>
                </Card>
              </Box>
            ) : null}

            {activeTab === 'preview' ? (
              <Box direction="vertical" gap="SP4">
                <Card>
                  <Box direction="vertical" gap="SP2" padding="SP4">
                    <Text weight="bold">5. Final Ordering Preview</Text>
                    {previewResult ? (
                      <>
                        <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                          <Badge>Filtered: {previewResult.statistics.filteredProducts}</Badge>
                          <Badge skin="success">Pinned: {previewResult.statistics.pinnedProducts}</Badge>
                          <Badge skin="standard">Final: {previewResult.arrangedProducts.length}</Badge>
                        </Box>

                        <Divider />
                        <Box direction="vertical" gap="SP2">
                          {top100Preview.map(product => (
                            <Card key={`${product.variantId}-${product.sortOrder}`}>
                              <Box direction="horizontal" align="space-between" verticalAlign="middle" padding="SP2">
                                <Box direction="vertical" gap="SP1">
                                  <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                                    <Badge>#{product.sortOrder + 1}</Badge>
                                    <Text size="small">{product.name}</Text>
                                  </Box>
                                  <Text size="tiny" secondary>{formatPrice(product.price)} - Stock {formatPercentage(product.inventoryPercentage)}</Text>
                                </Box>
                                <Box direction="horizontal" gap="SP2">
                                  {product.isPinned ? <Badge skin="success">Pinned</Badge> : null}
                                  {product.segmentName ? <Badge skin="standard">{product.segmentName}</Badge> : <Badge skin="neutral">Unassigned</Badge>}
                                  {product.pushedToBottom ? <Badge skin="warning">Bottom Push</Badge> : null}
                                </Box>
                              </Box>
                            </Card>
                          ))}
                        </Box>
                      </>
                    ) : (
                      <Text size="small" secondary>Run Preview to simulate the final order.</Text>
                    )}
                  </Box>
                </Card>
              </Box>
            ) : null}

            <Card>
              <Box direction="vertical" gap="SP2" padding="SP4">
                <Text weight="bold">Top-100 Product Pool</Text>
                <Text size="small" secondary>Variant-level pool limited to 100 products. Out-of-stock variants are always excluded.</Text>
                <Divider />
                <Box direction="vertical" gap="SP1">
                  {MOCK_PRODUCTS
                    .slice(0, 100)
                    .map(product => (
                      <Box key={product.variantId} direction="horizontal" align="space-between" verticalAlign="middle">
                        <Text size="tiny">{product.name} ({product.variantId})</Text>
                        <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                          {pinnedVariantIds.has(product.variantId) ? <Badge skin="success">Pinned</Badge> : null}
                          <Badge skin="neutral">{product.inStock ? 'In Stock' : 'Out of Stock'}</Badge>
                        </Box>
                      </Box>
                    ))}
                </Box>
              </Box>
            </Card>

            <Card>
              <Box direction="vertical" gap="SP2" padding="SP4">
                <Text weight="bold">Field Reference</Text>
                <Text size="small" secondary>Use these fields in rules and segment filters.</Text>
                <Divider />
                <Box direction="vertical" gap="SP1">
                  {AVAILABLE_FIELDS.map(field => (
                    <Text key={field.name} size="tiny">
                      {field.name} ({field.type}) - {AVAILABLE_OPERATORS[field.type].join(', ')}
                    </Text>
                  ))}
                </Box>
                <Text size="tiny" secondary>Sort fields: {SORT_FIELDS.join(', ')}</Text>
              </Box>
            </Card>
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default ShelfArrangementDashboard;

