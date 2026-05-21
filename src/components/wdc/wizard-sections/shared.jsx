import React, { memo } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import VoiceRecorder from '../VoiceRecorder';

// ── Shared input class names ──────────────────────────────────────────────
export const inputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all placeholder:text-gray-400';

export const inputErrorClass =
  'w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all placeholder:text-gray-400';

export const labelClass = 'block text-xs sm:text-sm font-medium text-gray-700 mb-1';

// ── TextInput ─────────────────────────────────────────────────────────────
// Memoized to prevent re-renders during parent component updates
// This prevents mobile keyboard dismissal while typing
const TextInput = memo(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onVoiceNote,
  existingVoiceNote,
  draftContext,
  placeholder,
  required,
  error,
  helpText,
  rows,
  ...props
}) => {
  const isTextarea = type === 'textarea';
  const hasError = !!error;
  const cls = hasError ? inputErrorClass : inputClass;

  return (
    <div className="space-y-1">
      <div className={onVoiceNote ? 'flex items-center justify-between gap-2' : ''}>
        <label htmlFor={`wiz-${name}`} className={labelClass}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {onVoiceNote && (
          <VoiceRecorder fieldName={name} onRecordingComplete={onVoiceNote} existingRecording={existingVoiceNote} compact draftContext={draftContext} />
        )}
      </div>
      {isTextarea ? (
        <textarea
          id={`wiz-${name}`}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows || 3}
          required={required}
          className={`${cls} resize-none`}
          {...props}
        />
      ) : (
        <input
          id={`wiz-${name}`}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={cls}
          {...props}
        />
      )}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
      {error && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="w-3 h-3" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}
    </div>
  );
});
TextInput.displayName = 'TextInput';
export { TextInput };

// ── NumberInput ────────────────────────────────────────────────────────────
// Memoized for consistency with TextInput
const NumberInput = memo(({ label, name, value, onChange, min = 0, required, error, ...props }) => {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      onChange(e);
      return;
    }
    const num = Number(raw);
    if (min !== undefined && num < min) {
      const clamped = { ...e, target: { ...e.target, name, value: String(min) } };
      onChange(clamped);
      return;
    }
    onChange(e);
  };

  return (
  <div className="space-y-1">
    <label htmlFor={`wiz-${name}`} className={labelClass}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={`wiz-${name}`}
      type="number"
      name={name}
      value={value}
      onChange={handleChange}
      min={min}
      required={required}
      className={error ? inputErrorClass : inputClass}
      {...props}
    />
    {error && (
      <div className="flex items-center gap-1 text-red-600">
        <AlertTriangle className="w-3 h-3" />
        <p className="text-xs font-medium">{error}</p>
      </div>
    )}
  </div>
  );
});
NumberInput.displayName = 'NumberInput';
export { NumberInput };

// ── DynamicTable ─────────────────────────────────────────────────────────-
export const DynamicTable = ({
  columns,
  rows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  maxRows = 10,
}) => (
  <div>
    {/* Desktop Table */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-700 w-10">
              SN
            </th>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="border border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-700"
              >
                {col.label} {col.required && <span className="text-red-500">*</span>}
              </th>
            ))}
            <th className="border border-gray-200 px-2 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="border border-gray-200 px-2 py-2 text-center text-xs text-gray-500">
                {ri + 1}
              </td>
              {columns.map((col, ci) => (
                <td key={ci} className="border border-gray-200 px-2 py-1">
                  {col.type === 'select' ? (
                    <select
                      value={row[col.name] || ''}
                      onChange={(e) => onRowChange(ri, col.name, e.target.value)}
                      className="w-full border-0 text-sm focus:ring-0 p-0"
                    >
                      <option value="">Select...</option>
                      {col.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === 'textarea' ? (
                    <textarea
                      value={row[col.name] || ''}
                      onChange={(e) => onRowChange(ri, col.name, e.target.value)}
                      className="w-full border-0 text-sm focus:ring-0 p-0 resize-none"
                      rows={2}
                      placeholder={col.placeholder}
                    />
                  ) : (
                    <input
                      type={col.type || 'text'}
                      value={row[col.name] || ''}
                      onChange={(e) => onRowChange(ri, col.name, e.target.value)}
                      className="w-full border-0 text-sm focus:ring-0 p-0"
                      placeholder={col.placeholder}
                    />
                  )}
                </td>
              ))}
              <td className="border border-gray-200 px-2 py-1 text-center">
                <button
                  type="button"
                  onClick={() => onRemoveRow(ri)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards */}
    <div className="sm:hidden space-y-3">
      {rows.map((row, ri) => (
        <div key={ri} className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">#{ri + 1}</span>
            <button
              type="button"
              onClick={() => onRemoveRow(ri)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {columns.map((col, ci) => (
            <div key={ci}>
              <label className="block text-xs text-gray-500 mb-1">
                {col.label} {col.required && <span className="text-red-500">*</span>}
              </label>
              {col.type === 'select' ? (
                <select
                  value={row[col.name] || ''}
                  onChange={(e) => onRowChange(ri, col.name, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-200"
                >
                  <option value="">Select...</option>
                  {col.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : col.type === 'textarea' ? (
                <textarea
                  value={row[col.name] || ''}
                  onChange={(e) => onRowChange(ri, col.name, e.target.value)}
                  className={`${inputClass} resize-none`}
                  rows={2}
                  placeholder={col.placeholder}
                />
              ) : (
                <input
                  type={col.type || 'text'}
                  value={row[col.name] || ''}
                  onChange={(e) => onRowChange(ri, col.name, e.target.value)}
                  className={inputClass}
                  placeholder={col.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Add Row Button */}
    {rows.length < maxRows && (
      <button
        type="button"
        onClick={onAddRow}
        className="mt-3 flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Row
      </button>
    )}
  </div>
);

// ── ActionInput ───────────────────────────────────────────────────────────
export const ActionInput = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-700">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  </div>
);
