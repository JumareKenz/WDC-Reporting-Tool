import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Plus, Trash2 } from 'lucide-react';
import { uploadFile } from '../../api/client';
import { API_ENDPOINTS } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Logic evaluation
// ---------------------------------------------------------------------------
function evaluateCondition(condition, formData, allFields) {
  const targetField = allFields.find(f => f.id === condition.field_id);
  if (!targetField) return false;
  const actual = formData[targetField.name];
  const compare = condition.value;

  switch (condition.operator) {
    case 'equals':         return String(actual ?? '') === compare;
    case 'not_equals':     return String(actual ?? '') !== compare;
    case 'greater_than':   return Number(actual) > Number(compare);
    case 'less_than':      return Number(actual) < Number(compare);
    case 'contains':       return String(actual ?? '').toLowerCase().includes(compare.toLowerCase());
    case 'is_empty':       return actual == null || String(actual) === '';
    case 'is_not_empty':   return actual != null && String(actual) !== '';
    default:               return false;
  }
}

function evaluateConditionGroup(group, formData, allFields) {
  if (!group || !group.rules || group.rules.length === 0) return true;
  const results = group.rules.map(rule =>
    rule.type === 'condition'
      ? evaluateCondition(rule, formData, allFields)
      : evaluateConditionGroup(rule, formData, allFields)
  );
  return group.operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

function evaluateFieldVisibility(field, formData, allFields) {
  if (!field.logic) return 'visible';
  const groupResult = evaluateConditionGroup(field.logic.condition_group, formData, allFields);
  switch (field.logic.action) {
    case 'show':    return groupResult ? 'visible' : 'hidden';
    case 'hide':    return groupResult ? 'hidden'  : 'visible';
    case 'require': return groupResult ? 'required': 'visible';
    default:        return 'visible';
  }
}

// ---------------------------------------------------------------------------
// Voice Recorder hook
// ---------------------------------------------------------------------------
function useVoiceRecorder() {
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
    } catch (e) {
      console.error('Mic access denied', e);
    }
  }, []);

  const stop = useCallback(() => {
    if (mrRef.current) { mrRef.current.stop(); mrRef.current = null; setRecording(false); }
  }, []);

  const clear = useCallback(() => setAudioBlob(null), []);

  return { recording, audioBlob, start, stop, clear };
}

// ---------------------------------------------------------------------------
// VoiceTextArea — textarea + optional voice recording strip
// ---------------------------------------------------------------------------
const VoiceTextArea = ({ value, onChange, onVoiceBlob, readOnly }) => {
  const { recording, audioBlob, start, stop, clear } = useVoiceRecorder();
  const prevRef = useRef(null);

  useEffect(() => {
    if (audioBlob !== prevRef.current) {
      prevRef.current = audioBlob;
      onVoiceBlob(audioBlob);
    }
  }, [audioBlob, onVoiceBlob]);

  return (
    <div className="space-y-1.5">
      <textarea value={value} onChange={e => onChange(e.target.value)} disabled={readOnly} rows={3}
        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50" />
      <div className="flex items-center gap-2">
        {!recording ? (
          <button type="button" onClick={start} disabled={readOnly}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium disabled:opacity-40 transition-colors">
            <Mic size={13} /> Record Voice
          </button>
        ) : (
          <button type="button" onClick={stop}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium transition-colors animate-pulse">
            <MicOff size={13} /> Stop
          </button>
        )}
        {audioBlob && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-600">Voice note recorded</span>
            <button type="button" onClick={clear} className="text-neutral-400 hover:text-red-500"><X size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TableInput — inline dynamic table
// ---------------------------------------------------------------------------
const TableInput = ({ field, value, onChange, readOnly }) => {
  const columns = field.table_columns || [];
  // Use value if provided; otherwise fall back to default_rows seed
  const rows = value != null ? value : (field.default_rows ? [...field.default_rows] : []);

  // Initialise rows from default_rows on first render
  const initialised = useRef(false);
  useEffect(() => {
    if (!initialised.current && value == null && field.default_rows && field.default_rows.length > 0) {
      onChange([...field.default_rows]);
      initialised.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addRow = () => {
    const empty = {};
    columns.forEach(col => { empty[col.name] = ''; });
    onChange([...rows, empty]);
  };

  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));

  const updateCell = (ri, colName, val) => {
    const newRows = [...rows];
    newRows[ri] = { ...newRows[ri], [colName]: val };
    onChange(newRows);
  };

  return (
    <div className="overflow-x-auto border border-neutral-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map(col => (
              <th key={col.name} className="text-left px-3 py-2 text-xs font-semibold text-neutral-600 border-b border-neutral-200">
                {col.label}
              </th>
            ))}
            {!readOnly && <th className="w-10 border-b border-neutral-200" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-neutral-100">
              {columns.map(col => (
                <td key={col.name} className="px-2 py-1">
                  {col.type === 'select' ? (
                    <select value={row[col.name] || ''} onChange={e => updateCell(ri, col.name, e.target.value)} disabled={readOnly}
                      className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-50">
                      <option value="" />
                      {(col.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : col.type === 'textarea' ? (
                    <textarea value={row[col.name] || ''} onChange={e => updateCell(ri, col.name, e.target.value)} disabled={readOnly}
                      placeholder={col.placeholder} rows={2}
                      className="w-full border border-neutral-200 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-50" />
                  ) : (
                    <input type={col.type === 'number' ? 'number' : 'text'} value={row[col.name] || ''}
                      onChange={e => updateCell(ri, col.name, e.target.value)} disabled={readOnly} placeholder={col.placeholder}
                      className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-50" />
                  )}
                </td>
              ))}
              {!readOnly && (
                <td className="px-1">
                  <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={14} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <div className="p-2 border-t border-neutral-100">
          <button onClick={addRow} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={12} /> Add Row
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// DynamicForm — runtime renderer
// ---------------------------------------------------------------------------
const DynamicForm = ({ definition, onSuccess, onCancel, readOnly, initialData }) => {
  const sections = (definition?.sections || []).slice().sort((a, b) => a.order - b.order);
  const allFields = definition?.fields || [];

  // Build initial form data from field definitions
  const buildInitial = useCallback(() => {
    const data = {};
    allFields.forEach(f => {
      if (initialData && initialData[f.name] != null) {
        data[f.name] = initialData[f.name];
      } else if (f.type === 'table') {
        data[f.name] = f.default_rows ? [...f.default_rows] : [];
      } else if (f.type === 'checkbox') {
        data[f.name] = false;
      } else if (f.type === 'number') {
        data[f.name] = 0;
      } else {
        data[f.name] = '';
      }
    });
    return data;
  }, [allFields, initialData]);

  const [formData, setFormData] = useState(buildInitial);
  const voiceBlobsRef = useRef({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const updateFormData = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const setVoiceBlob = useCallback((fieldName, blob) => {
    voiceBlobsRef.current[fieldName] = blob;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    for (const field of allFields) {
      const vis = evaluateFieldVisibility(field, formData, allFields);
      if (vis === 'hidden') continue;
      if (field.required || vis === 'required') {
        const val = formData[field.name];
        if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
          setSubmitError(`"${field.label}" is required`);
          return;
        }
      }
    }

    setSubmitError(null);
    setSubmitting(true);

    const now = new Date();
    const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const payload = {
        report_month: reportMonth,
        report_data: JSON.stringify(formData),
      };

      // Attach voice note files
      Object.entries(voiceBlobsRef.current).forEach(([fieldName, blob]) => {
        if (blob) {
          payload[`voice_${fieldName}`] = new File([blob], `voice_${fieldName}.webm`, { type: 'audio/webm' });
        }
      });

      await uploadFile(API_ENDPOINTS.REPORTS, payload);
      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render a single field based on its type and computed visibility
  // ---------------------------------------------------------------------------
  const renderField = (field) => {
    const vis = evaluateFieldVisibility(field, formData, allFields);
    if (vis === 'hidden') return null;
    const isRequired = field.required || vis === 'required';

    return (
      <div key={field.id}>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.help_text && <p className="text-xs text-neutral-500 mb-1">{field.help_text}</p>}

        {field.type === 'text' && (
          <input type="text" value={formData[field.name] || ''} onChange={e => updateFormData(field.name, e.target.value)}
            disabled={readOnly} placeholder={field.placeholder} required={isRequired}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50" />
        )}

        {field.type === 'textarea' && !field.voice_enabled && (
          <textarea value={formData[field.name] || ''} onChange={e => updateFormData(field.name, e.target.value)}
            disabled={readOnly} placeholder={field.placeholder} rows={3} required={isRequired}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50" />
        )}

        {field.type === 'textarea' && field.voice_enabled && (
          <VoiceTextArea
            value={formData[field.name] || ''}
            onChange={val => updateFormData(field.name, val)}
            onVoiceBlob={blob => setVoiceBlob(field.name, blob)}
            readOnly={!!readOnly}
          />
        )}

        {field.type === 'number' && (
          <input type="number" value={formData[field.name] ?? 0}
            onChange={e => updateFormData(field.name, e.target.value === '' ? 0 : Number(e.target.value))}
            disabled={readOnly} placeholder={field.placeholder} min={0} required={isRequired}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50" />
        )}

        {field.type === 'select' && (
          <select value={formData[field.name] || ''} onChange={e => updateFormData(field.name, e.target.value)}
            disabled={readOnly} required={isRequired}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50">
            <option value="">{field.placeholder || 'Select...'}</option>
            {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        )}

        {field.type === 'checkbox' && (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={!!formData[field.name]}
              onChange={e => updateFormData(field.name, e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
            <span className="text-sm text-neutral-600">{field.placeholder || field.label}</span>
          </div>
        )}

        {field.type === 'date' && (
          <input type="date" value={formData[field.name] || ''} onChange={e => updateFormData(field.name, e.target.value)}
            disabled={readOnly} required={isRequired}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50" />
        )}

        {field.type === 'time' && (
          <input type="time" value={formData[field.name] || ''} onChange={e => updateFormData(field.name, e.target.value)}
            disabled={readOnly} required={isRequired}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50" />
        )}

        {field.type === 'table' && (
          <TableInput
            field={field}
            value={formData[field.name]}
            onChange={val => updateFormData(field.name, val)}
            readOnly={!!readOnly}
          />
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{submitError}</span>
          <button type="button" onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {sections.map(section => {
        const sectionFields = allFields.filter(f => f.section_id === section.id).sort((a, b) => a.order - b.order);
        // Skip section entirely if all its fields are hidden (unless in readOnly/preview mode)
        if (!readOnly) {
          const anyVisible = sectionFields.some(f => evaluateFieldVisibility(f, formData, allFields) !== 'hidden');
          if (!anyVisible) return null;
        }

        return (
          <div key={section.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="bg-primary-50 border-b border-primary-100 px-4 py-3">
              <h3 className="font-semibold text-neutral-900">{section.title}</h3>
              {section.description && <p className="text-xs text-neutral-600 mt-0.5">{section.description}</p>}
            </div>
            <div className="p-4 space-y-4">
              {sectionFields.map(renderField)}
            </div>
          </div>
        );
      })}

      {/* Submit / Cancel buttons */}
      {!readOnly && (
        <div className="flex items-center justify-between pt-4">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors">
              Cancel
            </button>
          )}
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-60 transition-colors ml-auto">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}
    </form>
  );
};

export default DynamicForm;
