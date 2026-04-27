import type { Dispatch, FC, SetStateAction } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Text,
} from '@wix/design-system';

import { AVAILABLE_FIELDS } from '../../../types/shelfArrangement';
import type { FieldDefinition, FilterOperator, RuleGroup } from '../../../types/shelfArrangement';
import type { RuleDraftState } from './MainFilterEditor';

type RuleEditorProps = {
  title: string;
  group: RuleGroup;
  onAdd: () => void;
  onRemove: (ruleId: string) => void;
  state: RuleDraftState;
  setState: Dispatch<SetStateAction<RuleDraftState>>;
  catalogFieldDefinitions: FieldDefinition[];
  fieldDefinitionMap: Map<string, FieldDefinition>;
  getRuleHint: (group: RuleGroup) => string;
  getOperatorsForField: (fieldName: string) => FilterOperator[];
  getDefaultOperator: (fieldName: string) => FilterOperator;
  getSuggestedValue: (fieldName: string, optionName?: string) => string;
  formatFieldLabel: (fieldName: string) => string;
  operatorLabels: Record<FilterOperator, string>;
};

export const RuleEditor: FC<RuleEditorProps> = ({
  title,
  group,
  onAdd,
  onRemove,
  state,
  setState,
  catalogFieldDefinitions,
  fieldDefinitionMap,
  getRuleHint,
  getOperatorsForField,
  getDefaultOperator,
  getSuggestedValue,
  formatFieldLabel,
  operatorLabels,
}) => {
  const selectedField = fieldDefinitionMap.get(state.field) ?? catalogFieldDefinitions[0] ?? AVAILABLE_FIELDS[0];
  const getFieldLabel = (fieldName: string) => fieldDefinitionMap.get(fieldName)?.label ?? formatFieldLabel(fieldName);
  const operatorOptions = getOperatorsForField(state.field);
  const valueOptions = selectedField?.options ?? (selectedField?.type === 'boolean'
    ? [{ label: 'כן', value: 'true' }, { label: 'לא', value: 'false' }]
    : []);
  const selectedValues = state.value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return (
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
                  <Text size="small">{getFieldLabel(rule.field)} {operatorLabels[rule.operator] ?? rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}</Text>
                  {rule.isExclusion ? <Badge skin="warning">חוק החרגה</Badge> : null}
                </Box>
                <Button size="tiny" skin="standard" onClick={() => onRemove(rule.id)}>הסר</Button>
              </Box>
            </Card>
          ))}
        </Box>

        <Divider />
        <Box direction="vertical" gap="SP2">
          <Text size="tiny" secondary>
            גם השדות וגם הערכים הזמינים נמשכים מהמוצרים האמיתיים שנטענו עבור הקטגוריה שנבחרה.
          </Text>

          <Box direction="vertical" gap="SP1">
            <Text size="tiny" secondary>שדה</Text>
            <select
              value={state.field}
              onChange={event => {
                const nextField = event.target.value;

                setState(prev => {
                  return {
                    ...prev,
                    field: nextField,
                    operator: getDefaultOperator(nextField),
                    value: getSuggestedValue(nextField),
                    optionName: '',
                  };
                });
              }}
              style={{ width: '100%', minHeight: 36, borderRadius: 6, border: '1px solid #C1C7D0', padding: '0 8px', background: 'white' }}
            >
              {catalogFieldDefinitions.map(field => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>
          </Box>

          <Box direction="vertical" gap="SP1">
            <Text size="tiny" secondary>אופרטור</Text>
            <select
              value={state.operator}
              onChange={event => setState(prev => ({ ...prev, operator: event.target.value as FilterOperator }))}
              style={{ width: '100%', minHeight: 36, borderRadius: 6, border: '1px solid #C1C7D0', padding: '0 8px', background: 'white' }}
            >
              {operatorOptions.map(operator => (
                <option key={operator} value={operator}>
                  {operatorLabels[operator] ?? operator}
                </option>
              ))}
            </select>
          </Box>

          <Box direction="vertical" gap="SP1">
            <Text size="tiny" secondary>ערך</Text>
            {state.operator === 'oneOf' && valueOptions.length > 0 ? (
              <>
                <select
                  multiple
                  value={selectedValues}
                  onChange={event => {
                    const nextValues = Array.from(event.target.selectedOptions).map(option => option.value);
                    setState(prev => ({ ...prev, value: nextValues.join(', ') }));
                  }}
                  style={{ width: '100%', minHeight: 96, borderRadius: 6, border: '1px solid #C1C7D0', padding: 8, background: 'white' }}
                >
                  {valueOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Text size="tiny" secondary>החזיקו Ctrl/Cmd כדי לבחור ערך אחד או יותר מהנתונים האמיתיים של הקטגוריה.</Text>
              </>
            ) : valueOptions.length > 0 ? (
              <select
                value={state.value}
                onChange={event => setState(prev => ({ ...prev, value: event.target.value }))}
                style={{ width: '100%', minHeight: 36, borderRadius: 6, border: '1px solid #C1C7D0', padding: '0 8px', background: 'white' }}
              >
                <option value="">בחרו ערך אמיתי מהקטלוג</option>
                {valueOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                disabled
                value=""
                style={{ width: '100%', minHeight: 36, borderRadius: 6, border: '1px solid #C1C7D0', padding: '0 8px', background: '#F4F5F7', color: '#6B778C' }}
              >
                <option value="">לא נמצאו ערכים בנתוני הקטגוריה הנוכחית</option>
              </select>
            )}
          </Box>

          <Checkbox
            checked={state.isExclusion}
            onChange={event => setState(prev => ({ ...prev, isExclusion: event.target.checked }))}
          >
            חוק החרגה
          </Checkbox>
          <Box direction="horizontal" gap="SP2">
            <Button size="small" onClick={onAdd}>הוסף חוק</Button>
            <Text size="tiny" secondary>
              {selectedField?.label} תומך ב: {operatorOptions.map(operator => operatorLabels[operator] ?? operator).join(', ')}
            </Text>
          </Box>
        </Box>
      </Box>
    </Card>
  );
};
