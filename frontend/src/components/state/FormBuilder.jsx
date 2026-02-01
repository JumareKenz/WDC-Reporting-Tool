import { useState, useEffect, useCallback } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Trash2, Save, Rocket, Eye, List } from 'lucide-react';
import { useCreateForm, useUpdateForm, useDeployForm } from '../../hooks/useStateData';
import ConditionGroupBuilder from './ConditionGroupBuilder';
import DynamicForm from '../wdc/DynamicForm';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'table', label: 'Table' },
];

const FIELD_TYPE_ICONS = {
  text: 'T', textarea: '¶', number: '#', select: '▾',
  checkbox: '☑', date: '📅', time: '🕐', table: '⊞',
};

function generateId(prefix = 'fld') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const FormBuilder = ({ form, onSave, onClose }) => {
  const [sections, setSections] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('DRAFT');
  const [formId, setFormId] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const createMutation = useCreateForm();
  const updateMutation = useUpdateForm();
  const deployMutation = useDeployForm();

  useEffect(() => {
    if (form) {
      setFormId(form.id || null);
      setFormName(form.name || '');
      setFormDescription(form.description || '');
      setFormStatus(form.status || 'DRAFT');
      const def = form.definition || {};
      setSections(def.sections || []);
      setFields(def.fields || []);
      const expanded = {};
      (def.sections || []).forEach(s => { expanded[s.id] = true; });
      setExpandedSections(expanded);
    }
  }, [form]);

  const selectedField = fields.find(f => f.id === selectedFieldId) || null;

  const updateField = useCallback((fieldId, updates) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  }, []);

  // Remove field and recursively purge any logic conditions referencing it in ALL other fields
  const removeField = useCallback((fieldId) => {
    setFields(prev => {
      return prev
        .filter(f => f.id !== fieldId)
        .map(f => {
          if (!f.logic) return f;
          const purgeGroup = (group) => {
            if (!group || !group.rules) return group;
            const newRules = group.rules
              .filter(r => !(r.type === 'condition' && r.field_id === fieldId))
              .map(r => r.type === 'group' ? { ...r, rules: purgeGroup(r).rules } : r);
            return { ...group, rules: newRules };
          };
          const newGroup = purgeGroup(f.logic.condition_group);
          if (!newGroup.rules || newGroup.rules.length === 0) return { ...f, logic: null };
          return { ...f, logic: { ...f.logic, condition_group: newGroup } };
        });
    });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  }, [selectedFieldId]);

  const addSection = () => {
    const newSection = {
      id: generateId('sec'),
      title: 'New Section',
      description: '',
      order: sections.length + 1,
    };
    setSections(prev => [...prev, newSection]);
    setExpandedSections(prev => ({ ...prev, [newSection.id]: true }));
  };

  const removeSection = (sectionId) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    const toRemove = fields.filter(f => f.section_id === sectionId).map(f => f.id);
    toRemove.forEach(fid => removeField(fid));
  };

  const moveSectionUp = (idx) => {
    if (idx === 0) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const moveSectionDown = (idx) => {
    if (idx >= sections.length - 1) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const addField = (sectionId) => {
    const sectionFields = fields.filter(f => f.section_id === sectionId);
    const newField = {
      id: generateId('fld'),
      section_id: sectionId,
      name: '',
      label: 'New Field',
      type: 'text',
      placeholder: '',
      help_text: '',
      required: false,
      order: sectionFields.length + 1,
      options: null,
      table_columns: null,
      default_rows: null,
      voice_enabled: false,
      logic: null,
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const moveFieldUp = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const sf = fields.filter(f => f.section_id === field.section_id).sort((a, b) => a.order - b.order);
    const idx = sf.findIndex(f => f.id === fieldId);
    if (idx === 0) return;
    const swapId = sf[idx - 1].id;
    setFields(prev => prev.map(f => {
      if (f.id === fieldId) return { ...f, order: f.order - 1 };
      if (f.id === swapId) return { ...f, order: f.order + 1 };
      return f;
    }));
  };

  const moveFieldDown = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const sf = fields.filter(f => f.section_id === field.section_id).sort((a, b) => a.order - b.order);
    const idx = sf.findIndex(f => f.id === fieldId);
    if (idx >= sf.length - 1) return;
    const swapId = sf[idx + 1].id;
    setFields(prev => prev.map(f => {
      if (f.id === fieldId) return { ...f, order: f.order + 1 };
      if (f.id === swapId) return { ...f, order: f.order - 1 };
      return f;
    }));
  };

  const buildDefinition = () => ({
    sections: sections.map((s, i) => ({ ...s, order: i + 1 })),
    fields,
  });

  const handleSave = async () => {
    if (!formName.trim()) { setError('Form name is required'); return; }
    setError(null);
    setSaving(true);
    try {
      const definition = buildDefinition();
      if (formId) {
        await updateMutation.mutateAsync({ formId, data: { name: formName, description: formDescription, definition } });
      } else {
        const result = await createMutation.mutateAsync({ name: formName, description: formDescription, definition });
        setFormId(result.id);
        setFormStatus(result.status || 'DRAFT');
      }
      onSave();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!formId) { setError('Save the form first before deploying'); return; }
    setError(null);
    setSaving(true);
    try {
      await deployMutation.mutateAsync(formId);
      setFormStatus('DEPLOYED');
      setShowDeployConfirm(false);
      onSave();
    } catch (e) {
      setError(e.message || 'Deploy failed');
      setShowDeployConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  // ---- Toggle helper ----
  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-primary-600' : 'bg-neutral-300'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );

  // ---- Right Panel: Field Editor ----
  const renderFieldEditor = () => {
    if (!selectedField) {
      return (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          Select a field to edit its properties
        </div>
      );
    }
    const f = selectedField;
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Label</label>
          <input type="text" value={f.label} onChange={e => updateField(f.id, { label: e.target.value })}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Field Name <span className="text-neutral-400">(DB column / custom key)</span>
          </label>
          <input type="text" value={f.name} onChange={e => updateField(f.id, { name: e.target.value })}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
          <select value={f.type} onChange={e => {
            const t = e.target.value;
            const upd = { type: t };
            if (t !== 'select') upd.options = null;
            if (t !== 'table') { upd.table_columns = null; upd.default_rows = null; }
            if (t !== 'textarea') upd.voice_enabled = false;
            if (t === 'select' && !f.options) upd.options = [{ value: '', label: '' }];
            if (t === 'table' && !f.table_columns) upd.table_columns = [{ name: 'col1', label: 'Column 1', type: 'text', placeholder: '', options: null }];
            updateField(f.id, upd);
          }} className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {/* Placeholder */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Placeholder</label>
          <input type="text" value={f.placeholder || ''} onChange={e => updateField(f.id, { placeholder: e.target.value })}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        {/* Help Text */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Help Text</label>
          <input type="text" value={f.help_text || ''} onChange={e => updateField(f.id, { help_text: e.target.value })}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        {/* Required */}
        <div className="flex items-center gap-2">
          <Toggle checked={f.required} onChange={v => updateField(f.id, { required: v })} />
          <span className="text-xs text-neutral-600">Required</span>
        </div>
        {/* Voice Enabled (textarea only) */}
        {f.type === 'textarea' && (
          <div className="flex items-center gap-2">
            <Toggle checked={!!f.voice_enabled} onChange={v => updateField(f.id, { voice_enabled: v })} />
            <span className="text-xs text-neutral-600">Voice Enabled</span>
          </div>
        )}

        {/* Options Editor (select only) */}
        {f.type === 'select' && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-2">Options</label>
            <div className="space-y-1.5">
              {(f.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input type="text" placeholder="Value" value={opt.value}
                    onChange={e => { const o = [...(f.options || [])]; o[i] = { ...o[i], value: e.target.value }; updateField(f.id, { options: o }); }}
                    className="flex-1 border border-neutral-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  <input type="text" placeholder="Label" value={opt.label}
                    onChange={e => { const o = [...(f.options || [])]; o[i] = { ...o[i], label: e.target.value }; updateField(f.id, { options: o }); }}
                    className="flex-1 border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  <button type="button" onClick={() => updateField(f.id, { options: (f.options || []).filter((_, idx) => idx !== i) })}
                    className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updateField(f.id, { options: [...(f.options || []), { value: '', label: '' }] })}
              className="mt-1.5 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <Plus size={12} /> Add Option
            </button>
          </div>
        )}

        {/* Table Columns Editor (table only) */}
        {f.type === 'table' && (
          <>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">Table Columns</label>
              <div className="space-y-2 border border-neutral-200 rounded-lg p-2">
                {(f.table_columns || []).map((col, i) => (
                  <div key={i} className="border border-neutral-100 rounded p-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input type="text" placeholder="name" value={col.name}
                        onChange={e => { const c = [...(f.table_columns || [])]; c[i] = { ...c[i], name: e.target.value }; updateField(f.id, { table_columns: c }); }}
                        className="flex-1 border border-neutral-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      <input type="text" placeholder="Label" value={col.label}
                        onChange={e => { const c = [...(f.table_columns || [])]; c[i] = { ...c[i], label: e.target.value }; updateField(f.id, { table_columns: c }); }}
                        className="flex-1 border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      <select value={col.type}
                        onChange={e => {
                          const c = [...(f.table_columns || [])];
                          c[i] = { ...c[i], type: e.target.value, options: e.target.value === 'select' ? (c[i].options || [{ value: '', label: '' }]) : null };
                          updateField(f.id, { table_columns: c });
                        }}
                        className="border border-neutral-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="number">Number</option>
                        <option value="select">Select</option>
                      </select>
                      <button type="button" onClick={() => updateField(f.id, { table_columns: (f.table_columns || []).filter((_, idx) => idx !== i) })}
                        className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
                    </div>
                    {/* Column options sub-editor (select columns only) */}
                    {col.type === 'select' && (
                      <div className="ml-4 space-y-1">
                        {(col.options || []).map((opt, oi) => (
                          <div key={oi} className="flex gap-1">
                            <input type="text" placeholder="Value" value={opt.value}
                              onChange={e => {
                                const c = [...(f.table_columns || [])]; const opts = [...(c[i].options || [])];
                                opts[oi] = { ...opts[oi], value: e.target.value }; c[i] = { ...c[i], options: opts };
                                updateField(f.id, { table_columns: c });
                              }}
                              className="flex-1 border border-neutral-200 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500" />
                            <input type="text" placeholder="Label" value={opt.label}
                              onChange={e => {
                                const c = [...(f.table_columns || [])]; const opts = [...(c[i].options || [])];
                                opts[oi] = { ...opts[oi], label: e.target.value }; c[i] = { ...c[i], options: opts };
                                updateField(f.id, { table_columns: c });
                              }}
                              className="flex-1 border border-neutral-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                            <button type="button" onClick={() => {
                              const c = [...(f.table_columns || [])]; c[i] = { ...c[i], options: (c[i].options || []).filter((_, idx) => idx !== oi) };
                              updateField(f.id, { table_columns: c });
                            }} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const c = [...(f.table_columns || [])]; c[i] = { ...c[i], options: [...(c[i].options || []), { value: '', label: '' }] };
                          updateField(f.id, { table_columns: c });
                        }} className="text-xs text-primary-600 hover:text-primary-700">+ Option</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => updateField(f.id, { table_columns: [...(f.table_columns || []), { name: '', label: '', type: 'text', placeholder: '', options: null }] })}
                className="mt-1.5 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus size={12} /> Add Column
              </button>
            </div>

            {/* Default Rows */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Default Rows</label>
              <div className="space-y-1">
                {(f.default_rows || []).map((row, ri) => (
                  <div key={ri} className="flex items-center gap-1 border border-neutral-100 rounded p-1.5">
                    {(f.table_columns || []).map(col => (
                      <input key={col.name} type="text" placeholder={col.label} value={row[col.name] || ''}
                        onChange={e => { const rows = [...(f.default_rows || [])]; rows[ri] = { ...rows[ri], [col.name]: e.target.value }; updateField(f.id, { default_rows: rows }); }}
                        className="flex-1 border border-neutral-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    ))}
                    <button type="button" onClick={() => updateField(f.id, { default_rows: (f.default_rows || []).filter((_, idx) => idx !== ri) })}
                      className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => {
                const emptyRow = {}; (f.table_columns || []).forEach(col => { emptyRow[col.name] = ''; });
                updateField(f.id, { default_rows: [...(f.default_rows || []), emptyRow] });
              }} className="mt-1 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus size={12} /> Add Default Row
              </button>
            </div>
          </>
        )}

        {/* Logic Rules */}
        <div className="border-t border-neutral-200 pt-3">
          <label className="block text-xs font-semibold text-neutral-700 mb-2">Conditional Logic</label>
          <div className="flex items-center gap-2 mb-2">
            <select value={f.logic?.action || 'show'}
              onChange={e => { if (f.logic) updateField(f.id, { logic: { ...f.logic, action: e.target.value } }); }}
              disabled={!f.logic}
              className="border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-40">
              <option value="show">Show when</option>
              <option value="hide">Hide when</option>
              <option value="require">Require when</option>
            </select>
            <button type="button"
              onClick={() => {
                if (f.logic) {
                  updateField(f.id, { logic: null });
                } else {
                  updateField(f.id, {
                    logic: {
                      action: 'show',
                      condition_group: { operator: 'AND', rules: [{ type: 'condition', field_id: '', operator: 'equals', value: '' }] },
                    },
                  });
                }
              }}
              className={`text-xs px-2 py-0.5 rounded ${f.logic ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {f.logic ? 'Enabled' : 'Enable Logic'}
            </button>
          </div>
          {f.logic && (
            <ConditionGroupBuilder
              group={f.logic.condition_group}
              onChange={newGroup => updateField(f.id, { logic: { ...f.logic, condition_group: newGroup } })}
              allFields={fields.filter(fl => fl.id !== f.id)}
              depth={0}
            />
          )}
        </div>
      </div>
    );
  };

  // ---- Left Panel: Sections Tree ----
  const renderSectionsTree = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {sections.map((section, idx) => {
        const sectionFields = fields.filter(f => f.section_id === section.id).sort((a, b) => a.order - b.order);
        const isExpanded = expandedSections[section.id];
        return (
          <div key={section.id} className="border border-neutral-200 rounded-lg bg-white">
            {/* Section header */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-neutral-50 rounded-t-lg border-b border-neutral-200">
              <button type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                className="text-neutral-500 hover:text-neutral-700">
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <input type="text" value={section.title}
                onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                className="flex-1 text-xs font-semibold text-neutral-800 bg-transparent border-none outline-none" />
              <div className="flex items-center gap-0.5">
                <button onClick={() => moveSectionUp(idx)} disabled={idx === 0} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 p-0.5"><ChevronUp size={13} /></button>
                <button onClick={() => moveSectionDown(idx)} disabled={idx >= sections.length - 1} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 p-0.5"><ChevronDown size={13} /></button>
                <button onClick={() => removeSection(section.id)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
              </div>
            </div>
            {isExpanded && (
              <>
                {/* Section description */}
                <div className="px-2 pt-1">
                  <input type="text" value={section.description || ''} placeholder="Section description..."
                    onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, description: e.target.value } : s))}
                    className="w-full text-xs text-neutral-500 bg-transparent border-none outline-none" />
                </div>
                {/* Fields list */}
                <div className="p-1.5 space-y-0.5">
                  {sectionFields.map(field => (
                    <div key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${selectedFieldId === field.id ? 'bg-primary-50 border border-primary-300' : 'hover:bg-neutral-50 border border-transparent'}`}>
                      <span className="text-xs text-neutral-400 w-4 text-center">{FIELD_TYPE_ICONS[field.type] || '?'}</span>
                      <span className="flex-1 text-xs text-neutral-700 truncate">{field.label || '(unnamed)'}</span>
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-1 rounded">{field.type}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); moveFieldUp(field.id); }} className="text-neutral-400 hover:text-neutral-600 p-0.5"><ChevronUp size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); moveFieldDown(field.id); }} className="text-neutral-400 hover:text-neutral-600 p-0.5"><ChevronDown size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); removeField(field.id); }} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Add Field button */}
                <div className="px-2 pb-1.5">
                  <button type="button" onClick={() => addField(section.id)}
                    className="w-full text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded py-0.5 flex items-center justify-center gap-1">
                    <Plus size={11} /> Add Field
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
      {/* Add Section */}
      <button type="button" onClick={addSection}
        className="w-full border-2 border-dashed border-neutral-300 hover:border-primary-400 text-neutral-500 hover:text-primary-600 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors">
        <Plus size={13} /> Add Section
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Form name..."
            className="text-base font-semibold text-neutral-900 border-none outline-none bg-transparent w-64" />
          <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Description..."
            className="text-xs text-neutral-500 border-none outline-none bg-transparent flex-1" />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formStatus === 'DEPLOYED' ? 'bg-green-100 text-green-700' : formStatus === 'ARCHIVED' ? 'bg-yellow-100 text-yellow-700' : 'bg-neutral-100 text-neutral-600'}`}>
            {formStatus}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Tab toggle */}
          <div className="flex items-center gap-0.5 border border-neutral-200 rounded-lg p-0.5">
            <button type="button" onClick={() => setActiveTab('builder')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'builder' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:text-neutral-800'}`}>
              <List size={13} /> Builder
            </button>
            <button type="button" onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'preview' ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:text-neutral-800'}`}>
              <Eye size={13} /> Preview
            </button>
          </div>
          {/* Save */}
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs font-medium disabled:opacity-60">
            <Save size={13} /> Save
          </button>
          {/* Deploy */}
          {formStatus === 'DRAFT' && (
            showDeployConfirm ? (
              <div className="flex items-center gap-1">
                <button type="button" onClick={handleDeploy} disabled={saving}
                  className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-60">
                  Confirm Deploy
                </button>
                <button type="button" onClick={() => setShowDeployConfirm(false)}
                  className="px-2 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-300">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowDeployConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium">
                <Rocket size={13} /> Deploy
              </button>
            )
          )}
          {/* Close */}
          <button type="button" onClick={onClose} className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}

      {/* Main content */}
      {activeTab === 'preview' ? (
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <DynamicForm definition={buildDefinition()} readOnly />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="w-80 flex-shrink-0 border-r border-neutral-200 flex flex-col overflow-hidden">
            <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
              Sections & Fields
            </div>
            {renderSectionsTree()}
          </div>
          {/* Right Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
              {selectedField ? `Edit: ${selectedField.label}` : 'Field Properties'}
            </div>
            {renderFieldEditor()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
