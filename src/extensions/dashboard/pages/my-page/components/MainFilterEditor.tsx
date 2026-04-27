import type { Dispatch, FC, SetStateAction } from 'react';
import { useState, useEffect } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dropdown,
  RadioGroup,
  Text,
  Input,
  AutoComplete,
} from '@wix/design-system';

import type { FilterOperator, RuleGroup } from '../../../types/shelfArrangement';

export type RuleDraftState = {
  field: string;
  operator: FilterOperator;
  value: string;
  optionName: string;
  isExclusion: boolean;
};

const FILTER_FIELD_OPTIONS = [
  { id: 'name', value: 'Product Name' },
  { id: 'description', value: 'Description' },
  { id: 'price', value: 'Price' },
  { id: 'brand', value: 'Brand' },
  { id: 'sku', value: 'SKU' },
  { id: 'productOptions', value: 'Product Options' },
  { id: 'inventory', value: 'Inventory' },
  { id: 'variantAvailabilityPercentage', value: 'Variant Availability %' },
  { id: 'publishDate', value: 'New Products' },
  { id: 'daysSincePublish', value: 'Uploaded In Last (Days)' },
] as const;

type OptionItem = {
  id: string | number;
  value: string;
};

type MainFilterEditorProps = {
  filterRuleGroup: RuleGroup;
  newRule: RuleDraftState;
  setNewRule: Dispatch<SetStateAction<RuleDraftState>>;
  onSetLogic: (logic: RuleGroup['logic']) => void;
  onAddRule: () => void;
  onRemoveRule: (ruleId: string) => void;
  getRuleHint: (group: RuleGroup) => string;
  getMainRuleFieldLabel: (fieldName: string) => string;
  getSuggestedValue: (fieldName: string, optionName?: string) => string;
  operatorLabels: Record<FilterOperator, string>;
  mainFilterOperatorOptions: FilterOperator[];
  mainFilterValueOptions: OptionItem[];
  firstProductOptionName: string;
  productOptionNameDropdownOptions: OptionItem[];
  title?: string;
  productsMustMatchLabel?: string;
  conditionsLabel?: string;
  addRuleLabel?: string;
  fieldOptions?: ReadonlyArray<{ id: string; value: string }>;
  allConditionsLabel?: string;
  anyConditionLabel?: string;
  excludeRuleLabel?: string;
  removeRuleLabel?: string;
  fieldPlaceholder?: string;
  optionPlaceholder?: string;
  operatorPlaceholder?: string;
  valuePlaceholder?: string;
  datePlaceholder?: string;
  variantAvailabilityPlaceholder?: string;
};

export const MainFilterEditor: FC<MainFilterEditorProps> = ({
  filterRuleGroup,
  newRule,
  setNewRule,
  onSetLogic,
  onAddRule,
  onRemoveRule,
  getRuleHint,
  getMainRuleFieldLabel,
  getSuggestedValue,
  operatorLabels,
  mainFilterOperatorOptions,
  mainFilterValueOptions,
  firstProductOptionName,
  productOptionNameDropdownOptions,
  title = '2. Category Conditions',
  productsMustMatchLabel = 'Products Must Match',
  conditionsLabel = 'Category Conditions',
  addRuleLabel = 'Add Rule',
  fieldOptions = FILTER_FIELD_OPTIONS,
  allConditionsLabel = 'All Conditions',
  anyConditionLabel = 'Any Condition',
  excludeRuleLabel = 'Exclude rule',
  removeRuleLabel = 'Remove',
  fieldPlaceholder = 'Product Name',
  optionPlaceholder = 'Choose option',
  operatorPlaceholder = 'Contains',
  valuePlaceholder = 'Enter value',
  datePlaceholder = 'Choose date',
  variantAvailabilityPlaceholder = '1-100',
}) => {
  const [valueFilterText, setValueFilterText] = useState<string>('');

  // Reset search text whenever the selected field or option type changes
  useEffect(() => {
    setValueFilterText('');
  }, [newRule.field, newRule.optionName]);

  const filteredValueOptions = valueFilterText
    ? mainFilterValueOptions.filter(o =>
        o.value.toLowerCase().includes(valueFilterText.toLowerCase()),
      )
    : mainFilterValueOptions;

  const hidesOperatorSelection = newRule.field === 'brand';
  const usesValueDropdown = newRule.field === 'productOptions';
  const isDateField = newRule.field === 'publishDate';
  const isTextNumberField = ['inventory', 'variantAvailabilityPercentage', 'daysSincePublish'].includes(newRule.field);

  return (
    <Card>
      <Box direction="vertical" gap="SP2" padding="SP4">
        <Box direction="horizontal" gap="SP2" verticalAlign="middle">
          <Text weight="bold">{title}</Text>
          {filterRuleGroup.rules.length > 0 ? (
            <Box direction="horizontal" gap="SP1">
              <Badge>{filterRuleGroup.rules.length}</Badge>
              <Badge skin="standard">{filterRuleGroup.logic}</Badge>
            </Box>
          ) : (
            <Text size="tiny" secondary>{getRuleHint(filterRuleGroup)}</Text>
          )}
        </Box>

        <Box direction="vertical" gap="SP1">
          <Text size="small">{productsMustMatchLabel}</Text>
          <RadioGroup
            value={filterRuleGroup.logic}
            onChange={value => onSetLogic(value as RuleGroup['logic'])}
            display="horizontal"
            spacing="24px"
          >
            <RadioGroup.Radio value="AND">{allConditionsLabel}</RadioGroup.Radio>
            <RadioGroup.Radio value="OR">{anyConditionLabel}</RadioGroup.Radio>
          </RadioGroup>
        </Box>

        {filterRuleGroup.rules.length > 0 ? (
          <Box direction="vertical" gap="SP1">
            {filterRuleGroup.rules.map(rule => (
              <Card key={rule.id}>
                <Box direction="horizontal" align="space-between" verticalAlign="middle" padding="SP2">
                  <Box direction="vertical" gap="SP1">
                    <Text size="small">
                      {getMainRuleFieldLabel(rule.field)} {operatorLabels[rule.operator] ?? rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}
                    </Text>
                    {rule.isExclusion ? <Text size="tiny" secondary>{excludeRuleLabel}</Text> : null}
                  </Box>
                  <Button size="tiny" skin="standard" onClick={() => onRemoveRule(rule.id)}>{removeRuleLabel}</Button>
                </Box>
              </Card>
            ))}
          </Box>
        ) : null}

        <Card>
          <Box direction="vertical" gap="SP2" padding="SP2">
            <Box
              direction="horizontal"
              gap="SP2"
              verticalAlign="middle"
              style={{ flexWrap: 'wrap', alignItems: 'center' }}
            >
              <div style={{ width: 180 }}>
                <Dropdown
                  placeholder={fieldPlaceholder}
                  selectedId={newRule.field}
                  options={fieldOptions.map(option => ({ id: option.id, value: option.value }))}
                  onSelect={option => {
                    const nextField = String(option.id);
                    const nextOptionName = nextField === 'productOptions' ? firstProductOptionName : '';
                    const nextOperator = nextField === 'productOptions'
                      ? 'contains'
                      : nextField === 'brand'
                        ? 'contains'
                        : nextField === 'daysSincePublish'
                          ? 'lessThanOrEqual'
                        : ['price', 'inventory', 'variantAvailabilityPercentage'].includes(nextField)
                          ? 'greaterThan'
                          : nextField === 'publishDate'
                            ? 'greaterThan'
                            : 'contains';

                    setNewRule(prev => ({
                      ...prev,
                      field: nextField,
                      operator: nextOperator,
                      optionName: nextOptionName,
                      value: nextField === 'productOptions'
                        ? getSuggestedValue(nextField, nextOptionName)
                        : nextField === 'daysSincePublish'
                          ? '30'
                        : '',
                    }));
                  }}
                  size="small"
                />
              </div>

              {newRule.field === 'productOptions' ? (
                <div style={{ width: 180 }}>
                  <Dropdown
                    placeholder={optionPlaceholder}
                    selectedId={newRule.optionName || firstProductOptionName}
                    options={productOptionNameDropdownOptions}
                    onSelect={option => {
                      const optionName = String(option.id);
                      setNewRule(prev => ({
                        ...prev,
                        optionName,
                        value: getSuggestedValue('productOptions', optionName),
                      }));
                    }}
                    size="small"
                  />
                </div>
              ) : null}

              {!hidesOperatorSelection ? (
                <div style={{ width: 180 }}>
                  <Dropdown
                    placeholder={operatorPlaceholder}
                    selectedId={newRule.operator}
                    options={mainFilterOperatorOptions.map(operator => ({
                      id: operator,
                      value: operatorLabels[operator] ?? operator,
                    }))}
                    onSelect={option => setNewRule(prev => ({ ...prev, operator: option.id as FilterOperator }))}
                    size="small"
                  />
                </div>
              ) : null}

              {usesValueDropdown && mainFilterValueOptions.length > 0 ? (
                <div style={{ width: 180 }}>
                  <AutoComplete
                    placeholder={valuePlaceholder}
                    value={valueFilterText}
                    options={filteredValueOptions}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValueFilterText(e.target.value)}
                    onSelect={(option: any) => {
                      setNewRule(prev => ({ ...prev, value: String(option.id) }));
                      setValueFilterText(String(option.value));
                    }}
                    size="small"
                  />
                </div>
              ) : isDateField ? (
                <input
                  type="date"
                  value={newRule.value}
                  aria-label={datePlaceholder}
                  onChange={event => setNewRule(prev => ({ ...prev, value: event.target.value }))}
                  style={{
                    width: '180px',
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              ) : isTextNumberField ? (
                <div style={{ width: 180 }}>
                  <Input
                    value={newRule.value}
                    onChange={event => setNewRule(prev => ({ ...prev, value: event.target.value }))}
                    size="small"
                    placeholder={newRule.field === 'variantAvailabilityPercentage' ? variantAvailabilityPlaceholder : valuePlaceholder}
                  />
                </div>
              ) : (
                <div style={{ width: 180 }}>
                  <Input
                    value={newRule.value}
                    onChange={event => setNewRule(prev => ({ ...prev, value: event.target.value }))}
                    size="small"
                    placeholder={valuePlaceholder}
                  />
                </div>
              )}

              <Button size="small" skin="standard" onClick={onAddRule} style={{ height: 32 }}>{addRuleLabel}</Button>
            </Box>

            <Checkbox
              checked={newRule.isExclusion}
              onChange={event => setNewRule(prev => ({ ...prev, isExclusion: event.target.checked }))}
            >
              {excludeRuleLabel}
            </Checkbox>
          </Box>
        </Card>
      </Box>
    </Card>
  );
};
