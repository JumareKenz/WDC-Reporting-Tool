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
      patterns: ['opd\\s*general\\s*attendance[:\\s]*(\\d+)', 'opd\\s*(?:total|attendance)[:\\s]*(\\d+)'],
      keywords: ['OPD General Attendance', 'OPD Total'],
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
      patterns: ['(?:opd\\s*)?immuni[sz]ation\\s*(?:total)?[:\\s]*(\\d+)'],
      keywords: ['OPD Immunization Total', 'Immunization Total'],
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
      patterns: ['(?:opd\\s*)?under\\s*5\\s*(?:total)?[:\\s]*(\\d+)'],
      keywords: ['OPD Under 5 Total', 'Under 5 Total'],
    },
  },
  health_malaria_under5: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children under 5 were treated for malaria?',
      question_ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin zazzabin cizon sauro?',
    },
    ocr: { patterns: ['malaria\\s*(?:under\\s*5)?[:\\s]*(\\d+)'], keywords: ['MALARIA UNDER 5'] },
  },
  health_diarrhea_under5: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many children under 5 were treated for diarrhea?',
      question_ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin gudawa?',
    },
    ocr: { patterns: ['diarr?h?oea?[:\\s]*(\\d+)'], keywords: ['DIARRHEA UNDER 5'] },
  },
  health_anc_total: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'What was the total ANC attendance this month?',
      question_ha: 'Menene jimlar mata masu zuwa kulawa kafin haihuwa a wannan watan?',
    },
    ocr: { patterns: ['anc\\s*(?:total)?[:\\s]*(\\d+)'], keywords: ['ANC Total'] },
  },
  health_anc_first_visit: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many women came for their first ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta farko?',
    },
    ocr: { patterns: ['(?:1st|first)\\s*visit[:\\s]*(\\d+)'], keywords: ['First Visit', '1st Visit'] },
  },
  health_anc_fourth_visit: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many women came for their fourth ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta hudu?',
    },
    ocr: { patterns: ['(?:4th|fourth)\\s*visit[:\\s]*(\\d+)'], keywords: ['Fourth Visit', '4th Visit'] },
  },
  health_anc_eighth_visit: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many women came for their eighth ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta takwas?',
    },
    ocr: { patterns: ['(?:8th|eighth)\\s*visit[:\\s]*(\\d+)'], keywords: ['Eighth Visit', '8th Visit'] },
  },
  health_deliveries: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many deliveries took place at the health facility this month?',
      question_ha: 'Haihuwa nawa aka yi a asibitin wannan watan?',
    },
    ocr: { patterns: ['deliver(?:y|ies)[:\\s]*(\\d+)'], keywords: ['Deliveries'] },
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
    ocr: { patterns: ['counsel(?:l)?ing[:\\s]*(\\d+)'], keywords: ['Counselling'] },
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
    ocr: { patterns: ['hep\\s*b\\s*tested[:\\s]*(\\d+)'], keywords: ['Hep B Tested'] },
  },
  health_hepb_positive: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many people tested positive for Hepatitis B?',
      question_ha: 'Mutane nawa suka gwada positive na Hepatitis B?',
    },
    ocr: { patterns: ['hep\\s*b\\s*positive[:\\s]*(\\d+)'], keywords: ['Hep B Positive'] },
  },
  health_tb_presumptive: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many presumptive TB cases were identified this month?',
      question_ha: 'Mutane nawa ake zargi da cutar tarin fuka?',
    },
    ocr: { patterns: ['tb\\s*presumptive[:\\s]*(\\d+)'], keywords: ['TB Presumptive'] },
  },
  health_tb_on_treatment: {
    type: 'number',
    section: 'health_data',
    voice: {
      question_en: 'How many people are currently on TB treatment?',
      question_ha: 'Mutane nawa suke kan maganin tarin fuka yanzu?',
    },
    ocr: { patterns: ['tb\\s*(?:on\\s*)?treatment[:\\s]*(\\d+)'], keywords: ['TB On Treatment'] },
  },

  // ─── Section 3B: Facility Support (Yes/No gates) ──────────────────────────
  facility_renovated: {
    type: 'select',
    section: 'facility_support',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Was any health facility renovated last month? Yes or No.',
      question_ha: 'An gyara wani asibiti a wannan watan? Eh ko A’a?',
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
      question_ha: 'Shin WDC ta ba da gudummawar kayayyaki ga asibiti a wannan watan? Eh ko A’a?',
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
      question_ha: 'Shin gwamnati ta ba da gudummawar kayayyaki ga asibiti a wannan watan? Eh ko A’a?',
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
      question_ha: 'An gyara wani kaya a asibiti a wannan watan? Eh ko A’a?',
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
    ocr: { patterns: ['women.*anc[:\\s]*(\\d+)'], keywords: ['Women ANC'] },
  },
  women_transported_delivery: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many women were transported to a facility for delivery by the WDC?',
      question_ha: 'Mata nawa WDC ta kai asibiti don haihuwa?',
    },
    ocr: { patterns: ['women.*deliver[:\\s]*(\\d+)'], keywords: ['Women Delivery'] },
  },
  children_transported_danger: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many children under 5 with danger signs were transported to a facility?',
      question_ha: 'Yara nawa kasa da shekaru 5 masu alamun hatsari aka kai asibiti?',
    },
    ocr: { patterns: ['children.*danger[:\\s]*(\\d+)'], keywords: ['Children Danger'] },
  },
  women_supported_delivery_items: {
    type: 'number',
    section: 'transport',
    voice: {
      question_en: 'How many women were supported with delivery items through WDC efforts?',
      question_ha: 'Mata nawa aka taimaka musu da kayan haihuwa ta hanyar WDC?',
    },
    ocr: { patterns: ['delivery\\s*items[:\\s]*(\\d+)'], keywords: ['Delivery Items'] },
  },

  // ─── Section 3D: MPDSR ────────────────────────────────────────────────────
  maternal_deaths: {
    type: 'number',
    section: 'cmpdsr',
    voice: {
      question_en: 'How many maternal deaths were recorded last month? Say zero if none.',
      question_ha: 'Mutuwar uwaye nawa aka rubuta a wannan watan? Idan babu ka ce sifili.',
    },
    ocr: { patterns: ['maternal\\s*deaths?[:\\s]*(\\d+)'], keywords: ['Maternal Deaths'] },
  },
  perinatal_deaths: {
    type: 'number',
    section: 'cmpdsr',
    voice: {
      question_en: 'How many perinatal deaths were recorded last month? Say zero if none.',
      question_ha: 'Mutuwar jarirai nawa aka rubuta a wannan watan? Idan babu ka ce sifili.',
    },
    ocr: { patterns: ['perinatal\\s*deaths?[:\\s]*(\\d+)'], keywords: ['Perinatal Deaths'] },
  },

  // ─── Section 4: Community Feedback (only at quarter-end / town-hall) ──────
  town_hall_conducted: {
    type: 'select',
    section: 'community_feedback',
    options: ['Yes', 'No'],
    voice: {
      question_en: 'Was the quarterly town hall conducted? Yes or No.',
      question_ha: 'An gudanar da taron kwata na gari? Eh ko A’a?',
    },
    ocr: { patterns: [], keywords: ['Town Hall Conducted'] },
  },

  // ─── Section 6: Community Mobilization ────────────────────────────────────
  awareness_topic: {
    type: 'text',
    section: 'mobilization',
    voice: {
      question_en: 'What was the awareness creation topic for this month?',
      question_ha: "Menene taken wayar da kan jama'a a wannan watan?",
    },
    ocr: { patterns: ['awareness[:\\s]*([^\\n]+)'], keywords: ['Awareness Topic'] },
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
    ocr: { patterns: ['male[:\\s]*(\\d+)'], keywords: ['Male'] },
  },
  attendance_female: {
    type: 'number',
    section: 'conclusion',
    voice: {
      question_en: 'How many female attendees were at the meeting?',
      question_ha: 'Mata nawa suka halarci taron?',
    },
    ocr: { patterns: ['female[:\\s]*(\\d+)'], keywords: ['Female'] },
  },
  next_meeting_date: {
    type: 'date',
    section: 'conclusion',
    voice: {
      question_en: 'When is the next meeting scheduled?',
      question_ha: 'Yaushe aka shirya taro na gaba?',
    },
    ocr: { patterns: ['next\\s*meeting[:\\s]*([\\d/-]+)'], keywords: ['Next Meeting'] },
  },
  chairman_signature: {
    type: 'text',
    section: 'conclusion',
    voice: {
      question_en: 'Please state the WDC chairman’s full name.',
      question_ha: 'Ka fadi cikakken sunan shugaban WDC.',
    },
    ocr: { patterns: [], keywords: ['Chairman'] },
  },
  secretary_signature: {
    type: 'text',
    section: 'conclusion',
    voice: {
      question_en: 'Please state the WDC secretary’s full name.',
      question_ha: 'Ka fadi cikakken sunan sakataren WDC.',
    },
    ocr: { patterns: [], keywords: ['Secretary'] },
  },
};

export default DEFAULT_FIELD_CONFIG;
