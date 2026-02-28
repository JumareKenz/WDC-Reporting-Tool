import React from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import VoiceRecorder from '../VoiceRecorder';

// ── Shared input class names ──────────────────────────────────────────────
export const inputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all placeholder:text-gray-400';

export const inputErrorClass =
  'w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all placeholder:text-gray-400';

export const labelClass = 'block text-xs sm:text-sm font-medium text-gray-700 mb-1';

// ── TextInput ─────────────────────────────────────────────────────────────
export const TextInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onVoiceNote,
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
          <VoiceRecorder fieldName={name} onRecordingComplete={onVoiceNote} compact />
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
};

// ── NumberInput ────────────────────────────────────────────────────────────
export const NumberInput = ({ label, name, value, onChange, min, required, error, ...props }) => (
  <div className="space-y-1">
    <label htmlFor={`wiz-${name}`} className={labelClass}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={`wiz-${name}`}
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      {...(min !== undefined ? { min } : {})}
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

// ── DynamicTable ──────────────────────────────────────────────────────────
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
                {col.label}
              </th>
            ))}
            <th className="border border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-700 w-12">
              Del
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-2 py-1 text-center font-medium">
                {rowIdx + 1}
              </td>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="border border-gray-200 px-1 py-1">
                  {col.type === 'select' ? (
                    <select
                      value={row[col.name] || ''}
                      onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                      className="w-full px-2 py-1 text-xs border-0 focus:ring-1 focus:ring-green-500 rounded"
                    >
                      <option value="">Select...</option>
                      {col.options.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === 'textarea' ? (
                    <textarea
                      value={row[col.name] || ''}
                      onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                      className="w-full px-2 py-1 text-xs border-0 focus:ring-1 focus:ring-green-500 rounded resize-none"
                      rows={2}
                      placeholder={col.placeholder}
                    />
                  ) : (
                    <input
                      type={col.type || 'text'}
                      value={row[col.name] || ''}
                      onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                      className="w-full px-2 py-1 text-xs border-0 focus:ring-1 focus:ring-green-500 rounded"
                      placeholder={col.placeholder}
                    />
                  )}
                </td>
              ))}
              <td className="border border-gray-200 px-1 py-1 text-center">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRow(rowIdx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Card Layout */}
    <div className="sm:hidden space-y-4">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-green-600">Item #{rowIdx + 1}</span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveRow(rowIdx)}
                className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {columns.map((col, colIdx) => (
              <div key={colIdx}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {col.label}
                </label>
                {col.type === 'select' ? (
                  <select
                    value={row[col.name] || ''}
                    onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {col.options.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : col.type === 'textarea' ? (
                  <textarea
                    value={row[col.name] || ''}
                    onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder={col.placeholder}
                  />
                ) : (
                  <input
                    type={col.type || 'text'}
                    value={row[col.name] || ''}
                    onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                    className={inputClass}
                    placeholder={col.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

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
