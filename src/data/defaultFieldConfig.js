/**
 * Default Field Configuration
 *
 * Bundled defaults for the WDC Monthly Report form. The voice assistant
 * (VoiceAssistantModal) walks the secretary through these one at a time and
 * the OCR pipeline tries to match the same field names. Order in this object
 * is the order the voice assistant asks questions.
 *
 * Field keys MUST match the form field names used in SubmitReportPage's
 * buildInitialFormData() and the wizard section components — otherwise the
 * voice assistant fills nothing.
 *
 * Schema:
 *   [fieldName]: {
 *     type: 'number' | 'text' | 'select' | 'date' | 'yesno',
 *     options?: string[],       // for select fields
 *     section?: string,         // section key — used by visibility gating
 *     voice: { question_en, question_ha },
 *     ocr:   { patterns: [regex source], keywords: [...] },
 *   }
 */
const DEFAULT_FIELD_CONFIG = {
  // ─── Section 1: Meeting Details ────────────────────────────────────────────
  meeting_type: {
    type: 'select',
    section: 'meeting',
    options: ['Monthly', 'Emergency', 'Quarterly Town Hall'],
    voice: {
      question_en: 'What type of meeting was held this month? Monthly, Emergency, or Quarterly Town Hall?',
      question_ha: 'Wane irin taro aka yi a wannan watan? Na wata-wata, na gaggawa, ko na kwata na gari?',
    },
    ocr: { patterns: [], keywords: ['Meeting Type'] },
  },
  report_date: {
    type: 'date',
    section: 'meeting',
    voice: {
      question_en: 'What date did the meeting take place?',
      question_ha: 'A wace rana aka yi taron?',
    },
    ocr: { patterns: ['date[:\\s]*([\\d/-]+)'], keywords: ['Date'] },
  },

  // ─── Section 3A: Health Data ───────────────────────────────────────────────
  health_general_attendance_total: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'What was the total OPD general attendance this month?',
      question_ha: 'Menene jimlar masu zuwa OPD a wannan watan?',
    },
    ocr: {
      // "OPD General Attendance Total | 284" — skip "Total" label, limit to same line
      patterns: ['opd\\s*general\\s*attendance[^0-9\\n]{0,20}(\\d+)', 'general\\s*attendance\\s*total[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['OPD General Attendance Total'],
    },
  },
  health_routine_immunization_total: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'What was the OPD immunization total this month?',
      question_ha: 'Menene jimlar masu karbar allurai a OPD a wannan watan?',
    },
    ocr: {
      // "OPD Total (Immunization) | 97" — skip parentheses, limit to same line
      patterns: ['opd\\s*total[^0-9\\n]{0,30}(\\d+)', 'immuni[sz]ation[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['OPD Total (Immunization)', 'Immunization Total'],
    },
  },
  health_penta1: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children received the PENTA 1 vaccine?',
      question_ha: 'Yara nawa suka karbi allurar PENTA 1?',
    },
    ocr: { patterns: ['penta\\s*1[:\\s]*(\\d+)'], keywords: ['PENTA 1', 'Penta1'] },
  },
  health_bcg: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children received the BCG vaccine?',
      question_ha: 'Yara nawa suka karbi allurar BCG?',
    },
    ocr: { patterns: ['bcg[:\\s]*(\\d+)'], keywords: ['BCG'] },
  },
  health_penta3: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children received the PENTA 3 vaccine?',
      question_ha: 'Yara nawa suka karbi allurar PENTA 3?',
    },
    ocr: { patterns: ['penta\\s*3[:\\s]*(\\d+)'], keywords: ['PENTA 3', 'Penta3'] },
  },
  health_measles: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children received the MEASLES vaccine?',
      question_ha: 'Yara nawa suka karbi allurar MEASLES?',
    },
    ocr: { patterns: ['measles[:\\s]*(\\d+)'], keywords: ['MEASLES', 'Measles'] },
  },
  health_opd_under5_total: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'What was the OPD Under 5 total attendance this month?',
      question_ha: 'Menene jimlar yara kasa da shekaru 5 da suka zo OPD a wannan watan?',
    },
    ocr: {
      // "OPD Under 5 Total | 112" — limit to same line
      patterns: ['under\\s*5\\s*total[^0-9\\n]{0,20}(\\d+)', 'opd\\s*under\\s*5[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['OPD Under 5 Total'],
    },
  },
  health_malaria_under5: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children under 5 were treated for malaria?',
      question_ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin zazzabin cizon sauro?',
    },
    ocr: {
      // "Malaria (Under 5) | 43" — skip parentheses, limit to same line
      patterns: ['malaria[^0-9\\n]{0,25}(\\d+)'],
      keywords: ['Malaria (Under 5)'],
    },
  },
  health_diarrhea_under5: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children under 5 were treated for diarrhea?',
      question_ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin gudawa?',
    },
    ocr: {
      // "Diarrhoea (Under 5) | 18" — skip parentheses, limit to same line
      patterns: ['diarr?h?[o]?ea[^0-9\\n]{0,25}(\\d+)'],
      keywords: ['Diarrhoea (Under 5)'],
    },
  },
  health_anc_total: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'What was the total ANC attendance this month?',
      question_ha: 'Menene jimlar mata masu zuwa kulawa kafin haihuwa a wannan watan?',
    },
    ocr: {
      // "ANC Total | 61" — limit to same line
      patterns: ['anc\\s*total[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['ANC Total'],
    },
  },
  health_anc_first_visit: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many women came for their first ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta farko?',
    },
    ocr: {
      // "First Visit | 25" — limit to same line
      patterns: ['(?:1st|first)\\s*visit[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['First Visit'],
    },
  },
  health_anc_fourth_visit: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many women came for their fourth ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta hudu?',
    },
    ocr: {
      // "Fourth Visit | 21" — limit to same line
      patterns: ['(?:4th|fourth)\\s*visit[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['Fourth Visit'],
    },
  },

  health_deliveries: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many deliveries took place at the health facility this month?',
      question_ha: 'Haihuwa nawa aka yi a asibitin wannan watan?',
    },
    ocr: {
      // "Deliveries (Total) | 22" — skip parentheses, limit to same line
      patterns: ['deliver(?:y|ies)[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['Deliveries (Total)'],
    },
  },
  health_postnatal: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many post-natal visits were recorded?',
      question_ha: 'Ziyarce-ziyarcen bayan haihuwa nawa aka yi?',
    },
    ocr: { patterns: ['post[- ]?natal[:\\s]*(\\d+)'], keywords: ['Post-Natal'] },
  },
  health_fp_counselling: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many people received family planning counselling?',
      question_ha: 'Mutane nawa suka sami shawarar tsarin iyali?',
    },
    ocr: {
      // "Counselling (Family Planning) | 17" — skip parentheses, limit to same line
      patterns: ['counsel(?:l)?ing[^0-9\\n]{0,30}(\\d+)'],
      keywords: ['Counselling (Family Planning)'],
    },
  },
  health_fp_new_acceptors: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many new family planning acceptors did you record?',
      question_ha: 'Masu karbar tsarin iyali sababbi nawa ne?',
    },
    ocr: { patterns: ['new\\s*acceptors?[:\\s]*(\\d+)'], keywords: ['New Acceptors'] },
  },
  health_hepb_tested: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many people were tested for Hepatitis B?',
      question_ha: 'Mutane nawa aka gwada cutar Hepatitis B?',
    },
    ocr: {
      // "18 Persons Tested (HEP B) | 38" — row number 18 comes first; skip it and parentheses
      patterns: ['persons?\\s*tested[^0-9\\n]{0,25}(\\d+)', 'tested[^0-9\\n]{0,15}hep[^0-9\\n]{0,15}(\\d+)'],
      keywords: ['Persons Tested (HEP B)'],
    },
  },
  health_hepb_positive: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many people tested positive for Hepatitis B?',
      question_ha: 'Mutane nawa suka gwada positive na Hepatitis B?',
    },
    ocr: {
      // "18 Persons Tested Positive (HEP B) | 3" — skip row number and parentheses
      patterns: ['tested\\s*positive[^0-9\\n]{0,25}(\\d+)', 'positive[^0-9\\n]{0,15}hep[^0-9\\n]{0,15}(\\d+)'],
      keywords: ['Persons Tested Positive (HEP B)'],
    },
  },
  health_tb_presumptive: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many presumptive TB cases were identified this month?',
      question_ha: 'Mutane nawa ake zargi da cutar tarin fuka?',
    },
    ocr: {
      // "20 Total Presumptive TB Cases | 7" — skip row number, limit to same line to avoid next row
      patterns: ['presumptive\\s*tb[^0-9\\n]{0,20}(\\d+)', 'total\\s*presumptive[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['Total Presumptive TB Cases'],
    },
  },
  health_tb_on_treatment: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many people are currently on TB treatment?',
      question_ha: 'Mutane nawa suke kan maganin tarin fuka yanzu?',
    },
    ocr: {
      // "21 Total on TB Treatment | 4" — limit to same line
      patterns: ['(?:on\\s*)?tb\\s*treatment[^0-9\\n]{0,20}(\\d+)', 'total\\s*on\\s*tb[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['Total on TB Treatment'],
    },
  },

  // ─── Section 3B: Facility Support (Yes/No gates) ──────────────────────────
  facility_renovated: {
    type: 'select',
    section: 'facility_support',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Was any health facility renovated last month? Yes or No.',
      question_ha: "An gyara wani asibiti a wannan watan? Eh ko A'a?",
    },
    ocr: { patterns: [], keywords: ['Facility Renovated'] },
  },
  facility_renovated_count: {
    type: 'number',
    section: 'facility_support',
    voice: {
      question_en: 'How many health facilities were renovated?',
      question_ha: 'Asibitoci nawa aka gyara?',
    },
    ocr: { patterns: ['facilities\\s*renovated[:\\s]*(\\d+)'], keywords: ['Facilities Renovated'] },
  },
  items_donated_wdc_yn: {
    type: 'select',
    section: 'facility_support',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Did the WDC donate any items to a health facility this month? Yes or No.',
      question_ha: "Shin WDC ta ba da gudummawar kayayyaki ga asibiti a wannan watan? Eh ko A'a?",
    },
    ocr: { patterns: [], keywords: ['WDC Donated'] },
  },
  items_donated_count: {
    type: 'number',
    section: 'facility_support',
    voice: {
      question_en: 'How many items were donated by the WDC?',
      question_ha: 'Kayayyaki nawa WDC ta ba da gudummawa?',
    },
    ocr: { patterns: ['wdc\\s*donated[:\\s]*(\\d+)'], keywords: ['WDC Donated Items'] },
  },
  items_donated_facility: {
    type: 'text',
    section: 'facility_support',
    voice: {
      question_en: 'Which facility received the WDC donation? Please say the facility name.',
      question_ha: 'Wace asibiti ce ta karbi gudummawar WDC? Ka fadi sunan asibitin.',
    },
    ocr: { patterns: [], keywords: ['Donation Facility'] },
  },
  items_donated_govt_yn: {
    type: 'select',
    section: 'facility_support',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Did the government donate any items to a health facility this month? Yes or No.',
      question_ha: "Shin gwamnati ta ba da gudummawar kayayyaki ga asibiti a wannan watan? Eh ko A'a?",
    },
    ocr: { patterns: [], keywords: ['Government Donated'] },
  },
  items_donated_govt_count: {
    type: 'number',
    section: 'facility_support',
    voice: {
      question_en: 'How many items did the government donate?',
      question_ha: 'Kayayyaki nawa gwamnati ta ba da gudummawa?',
    },
    ocr: { patterns: ['govt?\\s*donated[:\\s]*(\\d+)'], keywords: ['Government Donated Items'] },
  },
  items_donated_govt_facility: {
    type: 'text',
    section: 'facility_support',
    voice: {
      question_en: 'Which facility received the government donation?',
      question_ha: 'Wace asibiti ce ta karbi gudummawar gwamnati?',
    },
    ocr: { patterns: [], keywords: ['Government Donation Facility'] },
  },
  items_repaired_yn: {
    type: 'select',
    section: 'facility_support',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Was any item repaired in a health facility this month? Yes or No.',
      question_ha: "An gyara wani kaya a asibiti a wannan watan? Eh ko A'a?",
    },
    ocr: { patterns: [], keywords: ['Items Repaired'] },
  },
  items_repaired_count: {
    type: 'number',
    section: 'facility_support',
    voice: {
      question_en: 'How many items were repaired in health facilities?',
      question_ha: 'Kayayyaki nawa aka gyara a asibitoci?',
    },
    ocr: { patterns: ['items?\\s*repaired[:\\s]*(\\d+)'], keywords: ['Items Repaired'] },
  },
  items_repaired_facility: {
    type: 'text',
    section: 'facility_support',
    voice: {
      question_en: 'Which facility had the items repaired?',
      question_ha: 'Wace asibiti ce aka gyara kayanta?',
    },
    ocr: { patterns: [], keywords: ['Repair Facility'] },
  },

  // ─── Section 3C: Transportation & Emergency ───────────────────────────────
  women_transported_anc: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many women were transported to a facility for ANC by the WDC?',
      question_ha: 'Mata nawa WDC ta kai asibiti don kulawa kafin haihuwa?',
    },
    ocr: {
      // "Number of women transported to facility for ANC by WDC | 7" — long label, limit match
      patterns: ['women[^0-9\\n]{0,60}anc[^0-9\\n]{0,15}(\\d+)', 'transport.*anc.*wdc[^0-9\\n]{0,15}(\\d+)'],
      keywords: ['Women ANC WDC'],
    },
  },
  women_transported_delivery: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many women were transported to a facility for delivery by the WDC?',
      question_ha: 'Mata nawa WDC ta kai asibiti don haihuwa?',
    },
    ocr: {
      // "Number of women transported to facility for delivery by WDC | 4" — limit to same line
      patterns: ['women[^0-9\\n]{0,60}deliver[^0-9\\n]{0,15}(\\d+)', 'transport.*deliver.*wdc[^0-9\\n]{0,15}(\\d+)'],
      keywords: ['Women Delivery WDC'],
    },
  },
  children_transported_danger: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many children under 5 with danger signs were transported to a facility?',
      question_ha: 'Yara nawa kasa da shekaru 5 masu alamun hatsari aka kai asibiti?',
    },
    ocr: {
      // "Number of children under 5 with danger signs transported | 2" — limit to same line
      patterns: ['children[^0-9\\n]{0,50}danger[^0-9\\n]{0,20}(\\d+)', 'danger\\s*signs[^0-9\\n]{0,20}(\\d+)'],
      keywords: ['Children Danger Signs'],
    },
  },
  women_supported_delivery_items: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many women were supported with delivery items through WDC efforts?',
      question_ha: 'Mata nawa aka taimaka musu da kayan haihuwa ta hanyar WDC?',
    },
    ocr: {
      // "Number of women supported with delivery items through WDC efforts | 5" — limit to same line
      patterns: ['supported[^0-9\\n]{0,60}delivery\\s*items[^0-9\\n]{0,20}(\\d+)', 'delivery\\s*items[^0-9\\n]{0,30}(\\d+)'],
      keywords: ['Women Delivery Items'],
    },
  },

  // ─── Section 3D: MPDSR ────────────────────────────────────────────────────
  maternal_deaths: {
    type: 'number',
    section: 'cmpdsr',
    voice: {
      question_en: 'How many maternal deaths were recorded last month? Say zero if none.',
      question_ha: 'Mutuwar uwaye nawa aka rubuta a wannan watan? Idan babu ka ce sifili.',
    },
    ocr: {
      // "Number of Maternal Deaths (last month): | 1" — skip parentheses, limit to same line
      patterns: ['maternal\\s*deaths?[^0-9\\n]{0,30}(\\d+)', 'number.*maternal[^0-9\\n]{0,30}(\\d+)'],
      keywords: ['Number of Maternal Deaths'],
    },
  },
  perinatal_deaths: {
    type: 'number',
    section: 'cmpdsr',
    voice: {
      question_en: 'How many perinatal deaths were recorded last month? Say zero if none.',
      question_ha: 'Mutuwar jarirai nawa aka rubuta a wannan watan? Idan babu ka ce sifili.',
    },
    ocr: {
      // "Number of Perinatal Deaths (last month): | 2" — skip parentheses, limit to same line
      patterns: ['perinatal\\s*deaths?[^0-9\\n]{0,30}(\\d+)', 'number.*perinatal[^0-9\\n]{0,30}(\\d+)'],
      keywords: ['Number of Perinatal Deaths'],
    },
  },

  // ─── Section 2: Action Tracker (Row 1) ────────────────────────────────────
  action_tracker_1_action_point: {
    type: "text",
    section: "action_tracker",
    voice: {
      question_en: "What was the agreed action point from the last meeting?",
      question_ha: "Menene abin da aka amince da shi daga taron da ya gabata?",
    },
    ocr: { patterns: [], keywords: ["Action Point"] },
  },
  action_tracker_1_status: {
    type: "select",
    section: "action_tracker",
    options: ["Completed", "On-going", "Not Started"],
    voice: {
      question_en: "What is the status? Completed, On-going, or Not Started?",
      question_ha: "Menene matsayin? An kammala, yana ci gaba, ko ba a fara ba?",
    },
    ocr: { patterns: [], keywords: ["Status"] },
  },
  action_tracker_1_challenges: {
    type: "text",
    section: "action_tracker",
    voice: {
      question_en: "Are there any challenges with this action point?",
      question_ha: "Shin akwai matsaloli game da wannan aiki?",
    },
    ocr: { patterns: [], keywords: ["Challenges"] },
  },
  action_tracker_1_timeline: {
    type: "text",
    section: "action_tracker",
    voice: {
      question_en: "What is the timeline for this action?",
      question_ha: "Menene lokacin kammala wannan aiki?",
    },
    ocr: { patterns: [], keywords: ["Timeline"] },
  },
  action_tracker_1_responsible_person: {
    type: "text",
    section: "action_tracker",
    voice: {
      question_en: "Who is the responsible person for this action?",
      question_ha: "Wanene mai alhakin wannan aiki?",
    },
    ocr: { patterns: [], keywords: ["Responsible Person"] },
  },
  action_tracker_has_more: {
    type: "select",
    section: "action_tracker",
    options: ["Yes", "No"],
    voice: {
      question_en: "Is there another agreed action point to report? Yes or No.",
      question_ha: "Shin akwai wani aiki da aka amince da shi? Eh ko Aa?",
    },
    ocr: { patterns: [], keywords: [] },
  },

  // ─── Section 4: Community Feedback (only at quarter-end / town-hall) ──────
  town_hall_conducted: {
    type: 'select',
    section: 'community_feedback',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Was the quarterly town hall conducted? Yes or No.',
      question_ha: 'An gudanar da taron kwata na gari? Eh ko Aa?',
    },
    ocr: { patterns: [], keywords: ['Town Hall Conducted'] },
  },

  // ─── Section 5: VDC Reports (Row 1) ───────────────────────────────────────
  vdc_reports_1_vdc_name: {
    type: "text",
    section: "vdc_reports",
    voice: {
      question_en: "What is the name of the Village Development Committee?",
      question_ha: "Menene sunan kwamitin raya unguwa?",
    },
    ocr: { patterns: [], keywords: ["VDC Name"] },
  },
  vdc_reports_1_issues: {
    type: "text",
    section: "vdc_reports",
    voice: {
      question_en: "What issues were raised by this VDC?",
      question_ha: "Wadanne matsaloli wannan kwamitin ya gabatar?",
    },
    ocr: { patterns: [], keywords: ["Issues"] },
  },
  vdc_reports_1_action_taken: {
    type: "text",
    section: "vdc_reports",
    voice: {
      question_en: "What action was taken on these issues?",
      question_ha: "Wane mataki aka dauka kan wadannan matsalolin?",
    },
    ocr: { patterns: [], keywords: ["Action Taken"] },
  },
  vdc_reports_has_more: {
    type: "select",
    section: "vdc_reports",
    options: ["Yes", "No"],
    voice: {
      question_en: "Is there another VDC to report? Yes or No.",
      question_ha: "Shin akwai wani kwamitin da zai bayar da rahoto? Eh ko Aa?",
    },
    ocr: { patterns: [], keywords: [] },
  },

  // ─── Section 6: Community Mobilization ────────────────────────────────────
  awareness_topic: {
    type: 'text',
    section: 'mobilization',
    voice: {
      question_en: 'What was the awareness creation topic for this month?',
      question_ha: "Menene taken wayar da kan jama'a a wannan watan?",
    },
    ocr: {
      // Paper label: "Awareness Creation Topic for the Month:" with value on same or next line
      // Match the full label to avoid capturing the label words as the value
      patterns: ['topic\\s*for\\s*the\\s*month[:\\s]+(.+)', 'awareness\\s*creation\\s*topic[^:]*:\\s*(.+)'],
      keywords: ['Awareness Creation Topic'],
    },
  },
  traditional_leaders_support: {
    type: 'text',
    section: 'mobilization',
    voice: {
      question_en: 'What support is needed from traditional leaders?',
      question_ha: 'Wane taimako ake bukata daga shugabannin gargajiya?',
    },
    ocr: { patterns: [], keywords: ['Traditional Leaders'] },
  },
  religious_leaders_support: {
    type: 'text',
    section: 'mobilization',
    voice: {
      question_en: 'What support is needed from religious leaders?',
      question_ha: 'Wane taimako ake bukata daga shugabannin addini?',
    },
    ocr: { patterns: [], keywords: ['Religious Leaders'] },
  },

  // ─── Section 7: Community Action Plan (Row 1) ─────────────────────────────
  action_plan_1_issue: {
    type: "text",
    section: "action_plan",
    voice: {
      question_en: "What is the first issue or priority identified for action?",
      question_ha: "Menene matsala ko muhimmanci na farko da aka gano?",
    },
    ocr: { patterns: [], keywords: ["Issue", "Priority"] },
  },
  action_plan_1_action: {
    type: "text",
    section: "action_plan",
    voice: {
      question_en: "What action will be taken to address this issue?",
      question_ha: "Wane mataki za a dauka don magance wannan matsala?",
    },
    ocr: { patterns: [], keywords: ["Action"] },
  },
  action_plan_1_timeline: {
    type: "text",
    section: "action_plan",
    voice: {
      question_en: "What is the timeline for completing this action?",
      question_ha: "Menene lokacin kammala wannan aiki?",
    },
    ocr: { patterns: [], keywords: ["Timeline"] },
  },
  action_plan_1_responsible_person: {
    type: "text",
    section: "action_plan",
    voice: {
      question_en: "Who is responsible for this action?",
      question_ha: "Wanene mai alhakin wannan aiki?",
    },
    ocr: { patterns: [], keywords: ["Responsible"] },
  },
  action_plan_has_more: {
    type: "select",
    section: "action_plan",
    options: ["Yes", "No"],
    voice: {
      question_en: "Is there another action to plan? Yes or No.",
      question_ha: "Shin akwai wani mataki da za a tsara? Eh ko Aa?",
    },
    ocr: { patterns: [], keywords: [] },
  },

  // ─── Section 8: Conclusion ────────────────────────────────────────────────
  support_required: {
    type: 'text',
    section: 'conclusion',
    voice: {
      question_en: 'What support is required — from LEMCHIC, Government, Partners or others?',
      question_ha: 'Wane taimako ake bukata daga LEMCHIC, Gwamnati, Abokan hulda, ko wasu?',
    },
    ocr: { patterns: [], keywords: ['Support Required'] },
  },
  aob: {
    type: 'text',
    section: 'conclusion',
    voice: {
      question_en: 'Is there any other business to report?',
      question_ha: "Shin akwai wani al'amari da za a bayar da rahotonsa?",
    },
    ocr: { patterns: [], keywords: ['AOB', 'Any Other Business'] },
  },
  attendance_male: {
    type: 'number',
    section: 'conclusion',
    voice: {
      question_en: 'How many male attendees were at the meeting?',
      question_ha: 'Maza nawa suka halarci taron?',
    },
    ocr: {
      // "Male: | 21" — limit to same line, word boundary to avoid "female"
      patterns: ['\\bmale[^0-9\\n]{0,10}(\\d+)'],
      keywords: ['Male:'],
    },
  },
  attendance_female: {
    type: 'number',
    section: 'conclusion',
    voice: {
      question_en: 'How many female attendees were at the meeting?',
      question_ha: 'Mata nawa suka halarci taron?',
    },
    ocr: {
      // "Female: | 17" — limit to same line
      patterns: ['female[^0-9\\n]{0,10}(\\d+)'],
      keywords: ['Female:'],
    },
  },
  next_meeting_date: {
    type: 'date',
    section: 'conclusion',
    voice: {
      question_en: 'When is the next meeting scheduled?',
      question_ha: 'Yaushe aka shirya taro na gaba?',
    },
    ocr: {
      // Paper: "pate of Next Meeting: Tuesday, 27 May 2025" (OCR read "Date" as "pate")
      // Capture full date string, allow for OCR typos in "date"
      patterns: ['[dp]ate\\s*of\\s*next\\s*meeting[^:]*:\\s*(.+)', 'next\\s*meeting[^:]*:\\s*(.+)'],
      keywords: ['Date of Next Meeting'],
    },
  },
  chairman_signature: {
    type: 'text',
    section: 'conclusion',
    voice: {
      question_en: "Please state the WDC chairman's full name.",
      question_ha: 'Ka fadi cikakken sunan shugaban WDC.',
    },
    ocr: { patterns: [], keywords: ['Chairman'] },
  },
  secretary_signature: {
    type: 'text',
    section: 'conclusion',
    voice: {
      question_en: "Please state the WDC secretary's full name.",
      question_ha: 'Ka fadi cikakken sunan sakataren WDC.',
    },
    ocr: { patterns: [], keywords: ['Secretary'] },
  },
};

export default DEFAULT_FIELD_CONFIG;
