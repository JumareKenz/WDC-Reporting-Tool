/**
 * Form Template Coordinate Mappings
 *
 * Generated from WDC_Template.docx -> PDF -> table-structure extraction
 * (frontend/extract_table_coords.py). Coordinates are pixel positions on the
 * 300-DPI rendered template pages (2550 x 3300 px each), pointing at the
 * VALUE cell of each field — not the label.
 *
 * Used by templateRegistrationService.js: a user photo of a form page is
 * perspective-warped to the canonical template page size, then the value cell
 * at (x, y, w, h) is cropped and OCR'd in isolation. This eliminates the
 * structural confusion (row-number vs value, wrong column) that plagues
 * full-page pattern matching.
 *
 * `template` = which template page image the field lives on (for warp target).
 * `section`  = the logical form section (matches defaultFieldConfig.js).
 *
 * NOTE: TB fields are logically `health_data` but physically printed on page 3.
 */

// Canonical template page dimensions (all pages share the same page size)
export const TEMPLATE_PAGE_WIDTH = 2550;
export const TEMPLATE_PAGE_HEIGHT = 3300;

/**
 * Template page images. Each page is a separate physical photo the user
 * captures. Filenames resolve against src/assets/templates/.
 */
export const TEMPLATE_PAGES = {
  page2: { image: 'template_page2.png', title: 'Section 3A: Health System', width: 2550, height: 3300 },
  page3: { image: 'template_page3.png', title: 'TB + Section 3C: Transportation', width: 2550, height: 3300 },
  page4: { image: 'template_page4.png', title: 'Section 3D: MPDSR', width: 2550, height: 3300 },
  page6: { image: 'template_page6.png', title: 'Conclusion & Attendance', width: 2550, height: 3300 },
};

/**
 * Field value-cell coordinates. All values are numeric except next_meeting_date.
 * The `numeric` flag tells the OCR layer to restrict the whitelist to digits.
 */
export const FIELD_COORDINATES = {
  // ── Page 2: Section 3A Health System (value column x=1264, w=811) ──────────
  health_general_attendance_total: { template: 'page2', section: 'health_data', x: 1264, y: 935, w: 811, h: 48, numeric: true },
  health_routine_immunization_total: { template: 'page2', section: 'health_data', x: 1264, y: 1102, w: 811, h: 47, numeric: true },
  health_penta1: { template: 'page2', section: 'health_data', x: 1264, y: 1185, w: 811, h: 47, numeric: true },
  health_bcg: { template: 'page2', section: 'health_data', x: 1264, y: 1269, w: 811, h: 48, numeric: true },
  health_penta3: { template: 'page2', section: 'health_data', x: 1264, y: 1352, w: 811, h: 48, numeric: true },
  health_measles: { template: 'page2', section: 'health_data', x: 1264, y: 1435, w: 811, h: 47, numeric: true },
  health_opd_under5_total: { template: 'page2', section: 'health_data', x: 1264, y: 1602, w: 811, h: 48, numeric: true },
  health_malaria_under5: { template: 'page2', section: 'health_data', x: 1264, y: 1685, w: 811, h: 47, numeric: true },
  health_diarrhea_under5: { template: 'page2', section: 'health_data', x: 1264, y: 1769, w: 811, h: 48, numeric: true },
  health_anc_total: { template: 'page2', section: 'health_data', x: 1264, y: 1936, w: 811, h: 47, numeric: true },
  health_anc_first_visit: { template: 'page2', section: 'health_data', x: 1264, y: 2019, w: 811, h: 48, numeric: true },
  health_anc_fourth_visit: { template: 'page2', section: 'health_data', x: 1264, y: 2102, w: 811, h: 48, numeric: true },
  health_deliveries: { template: 'page2', section: 'health_data', x: 1264, y: 2269, w: 811, h: 48, numeric: true },
  health_postnatal: { template: 'page2', section: 'health_data', x: 1264, y: 2352, w: 811, h: 48, numeric: true },
  health_fp_counselling: { template: 'page2', section: 'health_data', x: 1264, y: 2519, w: 811, h: 48, numeric: true },
  health_fp_new_acceptors: { template: 'page2', section: 'health_data', x: 1264, y: 2602, w: 811, h: 47, numeric: true },
  health_hepb_tested: { template: 'page2', section: 'health_data', x: 1264, y: 2769, w: 811, h: 48, numeric: true },
  health_hepb_positive: { template: 'page2', section: 'health_data', x: 1264, y: 2852, w: 811, h: 48, numeric: true },

  // ── Page 3: TB (value column x=1264, w=811) ────────────────────────────────
  health_tb_presumptive: { template: 'page3', section: 'health_data', x: 1264, y: 221, w: 811, h: 48, numeric: true },
  health_tb_on_treatment: { template: 'page3', section: 'health_data', x: 1264, y: 305, w: 811, h: 48, numeric: true },

  // ── Page 3: Section 3C Transportation (value column x=1376, w=699) ──────────
  women_transported_anc: { template: 'page3', section: 'transport', x: 1376, y: 2644, w: 699, h: 47, numeric: true },
  women_transported_delivery: { template: 'page3', section: 'transport', x: 1376, y: 2728, w: 699, h: 47, numeric: true },
  children_transported_danger: { template: 'page3', section: 'transport', x: 1376, y: 2811, w: 699, h: 48, numeric: true },
  women_supported_delivery_items: { template: 'page3', section: 'transport', x: 1376, y: 2894, w: 699, h: 95, numeric: true },

  // ── Page 4: Section 3D MPDSR ───────────────────────────────────────────────
  maternal_deaths: { template: 'page4', section: 'cmpdsr', x: 977, y: 681, w: 1159, h: 150, numeric: true },
  perinatal_deaths: { template: 'page4', section: 'cmpdsr', x: 977, y: 868, w: 1159, h: 156, numeric: true },

  // ── Page 6: Conclusion & Attendance ────────────────────────────────────────
  attendance_male: { template: 'page6', section: 'conclusion', x: 1693, y: 2419, w: 381, h: 48, numeric: true },
  attendance_female: { template: 'page6', section: 'conclusion', x: 801, y: 2503, w: 433, h: 95, numeric: true },
  next_meeting_date: { template: 'page6', section: 'conclusion', x: 776, y: 2126, w: 1298, h: 48, numeric: false },
};

/** Fields grouped by template page (for per-page extraction). */
export const FIELDS_BY_TEMPLATE = Object.entries(FIELD_COORDINATES).reduce((acc, [field, c]) => {
  (acc[c.template] ||= []).push(field);
  return acc;
}, {});
