/**
 * Form Configuration Service
 *
 * Loads the active deployed form version from the backend and exposes per-field
 * voice questions and OCR patterns to the OCR/voice services.
 *
 * Backend flow (two-step):
 *   1. GET /forms/visible           → list of forms scoped to this user
 *   2. GET /forms/:id/versions/:n   → fetches the schema for the form's current version
 *
 * The schema is nested by section:
 *   schema.sections[i].fields[j]    — fields are NOT a flat array on the server
 * We flatten them client-side and merge with bundled defaults.
 *
 * Caching:
 *   - Active config is persisted via the `storage` plugin (Capacitor Preferences
 *     on native, localStorage on web) so the app keeps working offline.
 *   - The cached `formVersionId` is exposed via `getCurrentFormVersionId()` so
 *     report submissions can reference the exact deployed version.
 */

import apiClient from '../api/client';
import { storage } from '../plugins/capacitor';
import DEFAULT_FIELD_CONFIG from '../data/defaultFieldConfig';

const CACHE_KEY = 'wdc_form_config_cache';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v) => !!v && UUID_RE.test(String(v));

let _activeConfig = null;
let _activeFormId = null;
let _activeVersionId = null;
let _loadPromise = null;

/**
 * Fetch the active form config from the server, falling back to cached
 * data, then to bundled defaults.
 *
 * @returns {Promise<Object>} Field config keyed by field key/name.
 */
export async function loadActiveFieldConfig() {
  console.log('[loadActiveFieldConfig] called, _activeConfig:', !!_activeConfig, '_loadPromise:', !!_loadPromise, '_activeVersionId:', _activeVersionId);
  if (_activeConfig) {
    console.log('[loadActiveFieldConfig] returning cached config');
    return _activeConfig;
  }
  if (_loadPromise) {
    console.log('[loadActiveFieldConfig] waiting for in-progress load');
    return _loadPromise;
  }

  _loadPromise = (async () => {
    let fields = null;
    let formId = null;
    let versionId = null;

    console.log('[formConfigService] loadActiveFieldConfig starting...');
    try {
      const result = await fetchActiveVersion();
      if (result) {
        fields = result.fields;
        formId = result.formId;
        versionId = result.versionId;
        console.log('[formConfigService] fetchActiveVersion succeeded, versionId:', versionId);
        await storage.set(CACHE_KEY, JSON.stringify({
          fetchedAt: Date.now(),
          fields,
          formId,
          versionId,
        }));
      } else {
        console.warn('[formConfigService] fetchActiveVersion returned null');
      }
    } catch (err) {
      console.error('[formConfigService] fetchActiveVersion failed:', err.message || err);
      // Fall through to cache + defaults
    }

    if (!fields) {
      console.log('[formConfigService] Checking cache...');
      try {
        const cached = await storage.get(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('[formConfigService] Cache found, parsed.versionId:', parsed.versionId, 'isUUID:', isUUID(parsed.versionId));
          if (Array.isArray(parsed.fields)) {
            fields = parsed.fields;
            formId = isUUID(parsed.formId) ? String(parsed.formId) : null;
            versionId = isUUID(parsed.versionId) ? String(parsed.versionId) : null;
            console.log('[formConfigService] Using cached values, versionId after validation:', versionId);
          }
        } else {
          console.log('[formConfigService] No cache found');
        }
      } catch (err) {
        console.error('[formConfigService] Cache read error:', err);
      }
    }

    _activeFormId = formId || null;
    _activeVersionId = versionId || null;
    _activeConfig = mergeWithDefaults(fields || []);
    console.log('[loadActiveFieldConfig] Final state: formId:', _activeFormId, 'versionId:', _activeVersionId, 'fields:', Object.keys(_activeConfig).length);
    return _activeConfig;
  })();

  return _loadPromise;
}

/**
 * Two-step fetch: list visible forms → fetch the chosen form's current version.
 * Returns flattened fields (across sections) plus formId / versionId.
 */
async function fetchActiveVersion() {
  // Step 1: list visible forms
  console.log('[formConfigService] Fetching /forms/visible...');
  const visibleResp = await apiClient.get('/forms/visible');
  const forms = Array.isArray(visibleResp) ? visibleResp : (visibleResp?.data ?? []);
  console.log('[formConfigService] Got', forms?.length || 0, 'forms');

  if (!forms || forms.length === 0) {
    console.warn('[formConfigService] No forms returned from /forms/visible');
    return null;
  }

  // Pick the first form that has a deployed version. If multiple forms are
  // scoped to this user, the backend should have already filtered to relevant
  // ones via /forms/visible.
  const form = forms.find((f) => f?.currentVersionId) || forms[0];
  console.log('[formConfigService] Selected form:', { id: form?.id, currentVersionId: form?.currentVersionId });

  if (!form?.id || !form?.currentVersionId) {
    console.warn('[formConfigService] Form missing id or currentVersionId');
    return null;
  }

  // The UUID we need for formVersionId is form.currentVersionId (from GET /forms/visible).
  // This is the form_versions.id UUID that POST /reports expects.
  const versionId = form.currentVersionId;
  console.log('[formConfigService] Using form.currentVersionId as versionId:', versionId);

  if (!isUUID(versionId)) {
    console.warn('[formConfigService] form.currentVersionId is not a UUID:', versionId);
    return null;
  }
  console.log('[formConfigService] ✓ versionId is valid UUID');

  // Step 2: fetch the version's schema for field configuration (voice questions, OCR patterns).
  console.log(`[formConfigService] Fetching /forms/${form.id}/versions/${form.currentVersionId} for schema...`);
  const versionResp = await apiClient.get(`/forms/${form.id}/versions/${form.currentVersionId}`);
  const version = versionResp?.data ?? versionResp;
  const schema = version?.schema;
  console.log('[formConfigService] Schema response:', { hasSchema: !!schema, sections: schema?.sections?.length || 0 });

  if (!schema?.sections) {
    console.warn('[formConfigService] No schema.sections in version response');
    return null;
  }

  // Flatten fields across all sections, normalising key → name
  const fields = [];
  for (const section of schema.sections) {
    if (!Array.isArray(section?.fields)) continue;
    for (const field of section.fields) {
      const name = field.key || field.name;
      if (!name) continue;
      fields.push({
        name,
        type: field.type,
        label_en: field.label_en,
        label_ha: field.label_ha,
        options: field.options,
        voice: field.voice,
        ocr: field.ocr,
        section: section.key,
      });
    }
  }

  return {
    fields,
    formId: isUUID(form.id) ? String(form.id) : null,
    versionId: String(versionId), // Already validated as UUID above
  };
}

/**
 * Merge server field overrides on top of bundled defaults.
 * Server `voice` / `ocr` values win over defaults. Fields present on the
 * server but missing from defaults are included as-is.
 */
function mergeWithDefaults(serverFields) {
  const merged = {};
  for (const [name, def] of Object.entries(DEFAULT_FIELD_CONFIG)) {
    merged[name] = { name, ...def };
  }

  for (const field of serverFields) {
    const name = field.name;
    if (!name) continue;
    const base = merged[name] || { name, type: field.type || 'text' };
    merged[name] = {
      ...base,
      type: field.type || base.type,
      options: field.options || base.options,
      voice: {
        question_en: field.voice?.question_en ?? base.voice?.question_en ?? '',
        question_ha: field.voice?.question_ha ?? base.voice?.question_ha ?? '',
      },
      ocr: {
        patterns: field.ocr?.patterns ?? base.ocr?.patterns ?? [],
        keywords: field.ocr?.keywords ?? base.ocr?.keywords ?? [],
      },
    };
  }

  return merged;
}

/**
 * Synchronous access — returns whatever is currently loaded, or just the
 * bundled defaults.
 */
export function getActiveFieldConfigSync() {
  if (_activeConfig) return _activeConfig;
  const merged = {};
  for (const [name, def] of Object.entries(DEFAULT_FIELD_CONFIG)) {
    merged[name] = { name, ...def };
  }
  return merged;
}

/**
 * Get the currently loaded form version ID (UUID). Required for report submission.
 * Returns null if no form has been loaded or the stored value is not a valid UUID.
 * Caller should await loadActiveFieldConfig() first.
 */
export function getCurrentFormVersionId() {
  const result = isUUID(_activeVersionId) ? String(_activeVersionId) : null;
  console.log('[getCurrentFormVersionId] returning:', result);
  return result;
}

/**
 * Get the currently loaded form ID (UUID).
 */
export function getCurrentFormId() {
  return _activeFormId;
}

/**
 * Force a refresh — used after an admin saves the form.
 */
export function invalidateFieldConfig() {
  _activeConfig = null;
  _activeFormId = null;
  _activeVersionId = null;
  _loadPromise = null;
}

/**
 * Get the OCR patterns for every configured field.
 */
export function getOcrPatterns(config) {
  const cfg = config || getActiveFieldConfigSync();
  const out = [];
  for (const field of Object.values(cfg)) {
    const sources = field.ocr?.patterns || [];
    if (sources.length === 0) continue;
    const patterns = [];
    for (const src of sources) {
      try {
        patterns.push(new RegExp(src, 'i'));
      } catch {
        // Skip malformed regex
      }
    }
    if (patterns.length > 0) {
      out.push({ field: field.name, patterns, type: field.type });
    }
  }
  return out;
}

/**
 * Build the ordered Voice Assistant question script from the active config.
 *
 * Rules:
 * - Skips fields already populated in `formData`.
 * - Skips section 'community_feedback' unless the report is at end-of-quarter
 *   (months 3/6/9/12 from formData.report_date) or meeting_type === 'Quarterly Town Hall'.
 * - For YES/NO gates (facility_renovated, items_donated_wdc_yn,
 *   items_donated_govt_yn, items_repaired_yn) — when the gate answer is "No"
 *   in formData, the dependent follow-ups are skipped so the assistant
 *   doesn't ask irrelevant questions.
 */
export function buildVoiceQuestions(config, formData = {}) {
  const cfg = config || getActiveFieldConfigSync();

  // Quarter gate
  const reportMonthNum = (() => {
    const d = formData?.report_date ? new Date(formData.report_date) : null;
    if (!d || isNaN(d.getTime())) return null;
    return d.getMonth() + 1;
  })();
  const isQuarterEnd = reportMonthNum ? [3, 6, 9, 12].includes(reportMonthNum) : false;
  const showCommunityFeedback = isQuarterEnd || formData?.meeting_type === 'Quarterly Town Hall';

  // Dependencies — which fields depend on a Yes answer to a gate
  const DEPENDENCIES = {
    facility_renovated: ['facility_renovated_count'],
    items_donated_wdc_yn: ['items_donated_count', 'items_donated_facility'],
    items_donated_govt_yn: ['items_donated_govt_count', 'items_donated_govt_facility'],
    items_repaired_yn: ['items_repaired_count', 'items_repaired_facility'],
  };
  const skipDependents = new Set();
  for (const [gate, deps] of Object.entries(DEPENDENCIES)) {
    if (formData?.[gate] === 'No') deps.forEach((d) => skipDependents.add(d));
  }

  // Define explicit section order matching the form wizard
  // Section 0: Meeting details, Section 1: Agenda, Section 2: Action Tracker
  // Section 3: Health Data (3A, 3B, 3C, 3D), Section 4: Community Feedback
  // Section 5: VDC Reports, Section 6: Mobilization, Section 7: Action Plan, Section 8: Conclusion
  const SECTION_ORDER = {
    'meeting': 0,              // Section 0: Meeting type, date, time
    'agenda': 1,               // Section 1: Agenda & Governance
    'action_tracker': 2,       // Section 2: Action Tracker
    'health_data': 3,          // Section 3A: Health Data
    'facility_support': 4,     // Section 3B: Facility Support
    'transport': 5,            // Section 3C: Transportation
    'cmpdsr': 6,               // Section 3D: cMPDSR (deaths)
    'community_feedback': 7,   // Section 4: Community Feedback (quarter-end)
    'vdc_reports': 8,          // Section 5: VDC Reports
    'mobilization': 9,         // Section 6: Community Mobilization
    'action_plan': 10,         // Section 7: Community Action Plan
    'conclusion': 11,          // Section 8: Support & Conclusion
  };

  const questions = [];

  // Convert to array and add section order + preserve definition order
  const fieldsArray = Object.entries(cfg).map(([fieldName, field], index) => ({
    ...field,
    name: fieldName, // Ensure name is set
    sectionOrder: SECTION_ORDER[field.section] ?? 999,
    definitionOrder: index, // Preserve order from defaultFieldConfig.js
  }));

  // Sort by section order first, then by definition order (NOT alphabetically)
  // This preserves the field order as defined in defaultFieldConfig.js within each section
  fieldsArray.sort((a, b) => {
    if (a.sectionOrder !== b.sectionOrder) {
      return a.sectionOrder - b.sectionOrder;
    }
    return a.definitionOrder - b.definitionOrder;
  });

  for (const field of fieldsArray) {
    if (!field.voice?.question_en) continue;
    if (field.section === 'community_feedback' && !showCommunityFeedback) continue;
    if (skipDependents.has(field.name)) continue;

    const existing = formData[field.name];
    const isEmpty = existing === undefined || existing === null || existing === '';
    if (!isEmpty) continue;

    questions.push({
      field: field.name,
      type: field.type,
      options: field.options,
      section: field.section,
      en: field.voice.question_en,
      ha: field.voice.question_ha,
    });
  }
  return questions;
}
