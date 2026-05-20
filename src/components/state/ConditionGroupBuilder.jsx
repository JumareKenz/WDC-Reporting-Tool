import { Plus, Trash2 } from 'lucide-react';

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const needsValue = (op) => op !== 'is_empty' && op !== 'is_not_empty';

const ConditionGroupBuilder = ({ group, onChange, allFields, depth = 0 }) => {
  const addCondition = () => {
    onChange({
      ...group,
      rules: [...(group.rules || []), { type: 'condition', field_id: '', operator: 'equals', value: '' }],
    });
  };

  const addGroup = () => {
    onChange({
      ...group,
      rules: [...(group.rules || []), {
        type: 'group',
        operator: 'AND',
        rules: [{ type: 'condition', field_id: '', operator: 'equals', value: '' }],
      }],
    });
  };

  const removeRule = (idx) => {
    onChange({
      ...group,
      rules: (group.rules || []).filter((_, i) => i !== idx),
    });
  };

  const updateRule = (idx, updatedRule) => {
    const rules = [...(group.rules || [])];
    rules[idx] = updatedRule;
    onChange({ ...group, rules });
  };

  return (
    <div className={`${depth > 0 ? 'ml-4 border border-neutral-200 rounded-lg p-2 bg-neutral-50' : ''} space-y-2`}>
      {/* Operator toggle: AND / OR */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">{depth === 0 ? 'All of' : 'Match'}</span>
        <div className="flex border border-neutral-300 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => onChange({ ...group, operator: 'AND' })}
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${group.operator === 'AND' ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
          >
            AND
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...group, operator: 'OR' })}
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${group.operator === 'OR' ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
          >
            OR
          </button>
        </div>
        <span className="text-xs text-neutral-500">the following:</span>
      </div>

      {/* Rules list */}
      {(group.rules || []).map((rule, idx) => (
        <div key={idx} className="flex items-start gap-1.5">
          {rule.type === 'condition' ? (
            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
              {/* Field selector */}
              <select
                value={rule.field_id}
                onChange={e => updateRule(idx, { ...rule, field_id: e.target.value })}
                className="border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 max-w-[180px]"
              >
                <option value="">Select field...</option>
                {allFields.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>

              {/* Operator selector */}
              <select
                value={rule.operator}
                onChange={e => updateRule(idx, { ...rule, operator: e.target.value, value: needsValue(e.target.value) ? rule.value : '' })}
                className="border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value input (hidden for is_empty / is_not_empty) */}
              {needsValue(rule.operator) && (
                <input
                  type="text"
                  value={rule.value}
                  onChange={e => updateRule(idx, { ...rule, value: e.target.value })}
                  placeholder="Value..."
                  className="border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 w-32"
                />
              )}
            </div>
          ) : (
            /* Nested group — recursive render */
            <div className="flex-1">
              <ConditionGroupBuilder
                group={rule}
                onChange={updatedGroup => updateRule(idx, updatedGroup)}
                allFields={allFields}
                depth={depth + 1}
              />
            </div>
          )}

          {/* Delete rule button */}
          <button
            type="button"
            onClick={() => removeRule(idx)}
            className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0 mt-0.5"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {/* Add buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addCondition}
          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Plus size={11} /> Condition
        </button>
        {depth < 2 && (
          <button
            type="button"
            onClick={addGroup}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Plus size={11} /> Group
          </button>
        )}
      </div>
    </div>
  );
};

export default ConditionGroupBuilder;
