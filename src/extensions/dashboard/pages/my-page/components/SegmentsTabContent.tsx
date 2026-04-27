import type { Dispatch, FC, SetStateAction } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Dropdown,
  Input,
  Text,
} from '@wix/design-system';
import type { FieldDefinition, FilterOperator, Segment } from '../../../types/shelfArrangement';
import type { RuleDraftState } from './MainFilterEditor';
import { formatFieldLabel } from '../my-page.utils';

type T = (he: string, en: string) => string;

type Props = {
  t: T;
  segments: Segment[];
  newSegmentName: string;
  setNewSegmentName: Dispatch<SetStateAction<string>>;
  addSegment: () => void;
  removeSegment: (id: string) => void;
  reorderSegment: (id: string, direction: 'up' | 'down') => void;
  setSegmentFilterLogic: (segmentId: string, logic: 'AND' | 'OR') => void;
  addSegmentFilter: (segmentId: string) => void;
  removeSegmentFilter: (segmentId: string, ruleId: string) => void;
  addSegmentSorter: (segmentId: string, field: string, direction: 'asc' | 'desc') => void;
  removeSegmentSorter: (segmentId: string, sorterId: string) => void;
  segmentDrafts: Record<string, RuleDraftState>;
  setSegmentDrafts: Dispatch<SetStateAction<Record<string, RuleDraftState>>>;
  firstProductOptionName: string;
  productOptionValuesByName: Record<string, string[]>;
  productOptionNameDropdownOptions: { id: string; value: string }[];
  fieldDefinitionMap: Map<string, FieldDefinition>;
  localizedFilterFieldOptions: { id: string; value: string }[];
  operatorLabels: Record<string, string>;
  getDefaultOperator: (field: string) => FilterOperator;
  getSuggestedValue: (field: string) => string;
  getOperatorsForField: (field: string) => FilterOperator[];
};

export const SegmentsTabContent: FC<Props> = ({
  t,
  segments,
  newSegmentName,
  setNewSegmentName,
  addSegment,
  removeSegment,
  reorderSegment,
  setSegmentFilterLogic,
  addSegmentFilter,
  removeSegmentFilter,
  addSegmentSorter,
  removeSegmentSorter,
  segmentDrafts,
  setSegmentDrafts,
  firstProductOptionName,
  productOptionValuesByName,
  productOptionNameDropdownOptions,
  fieldDefinitionMap,
  localizedFilterFieldOptions,
  operatorLabels,
  getDefaultOperator,
  getSuggestedValue,
  getOperatorsForField,
}) => (
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
          {segments.length === 0 ? (
            <Text size="small" secondary>{t('עדיין אין מקטעים. הוסף מקטע ראשון למעלה.', 'No segments yet. Add your first segment above.')}</Text>
          ) : null}
          {segments
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
                  const current = prev[segment.id] ?? {
                    field: firstField,
                    operator: getDefaultOperator(firstField),
                    value: getSuggestedValue(firstField),
                    optionName: '',
                    isExclusion: false,
                  };
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
);
