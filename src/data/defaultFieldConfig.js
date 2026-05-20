/**
 * Default Field Configuration
 *
 * Bundled defaults for the hardcoded WDC Monthly Report fields.
 * Each field has voice questions (en/ha) and OCR patterns/keywords.
 *
 * Admins can override these via the FormBuilder UI. The active config from
 * the server takes priority; this file is the fallback when the server has
 * no overrides for a given field.
 */

/**
 * Default field config keyed by field name.
 * Schema:
 *   {
 *     [fieldName]: {
 *       type: 'number' | 'text' | 'select' | 'date',
 *       options?: string[],         // for select fields
 *       voice: {
 *         question_en: string,
 *         question_ha: string,
 *       },
 *       ocr: {
 *         patterns: string[],       // regex source strings, case-insensitive
 *         keywords: string[],       // simple keywords used by the OCR builder UI
 *       },
 *     }
 *   }
 */
const DEFAULT_FIELD_CONFIG = {
  // ─── Section 1: Agenda & Governance ────────────────────────────────────────
  meeting_type: {
    type: 'select',
    options: ['Monthly', 'Emergency', 'Quarterly Town Hall'],
    voice: {
      question_en: 'What type of meeting was held? Monthly, Emergency, or Quarterly Town Hall?',
      question_ha: 'Wane irin taro aka yi? Na wata-wata, na gaggawa, ko na kwata na gari?',
    },
    ocr: { patterns: [], keywords: ['Meeting Type'] },
  },

  // ─── Section 3A: General Attendance ────────────────────────────────────────
  health_opd_total: {
    type: 'number',
    voice: {
      question_en: 'What was the total OPD attendance this month?',
      question_ha: 'Menene jimlar masu zuwa OPD a wannan watan?',
    },
    ocr: {
      patterns: ['opd\\s*(?:total|attendance)[:\\s]*(\\d+)', 'total\\s*opd[:\\s]*(\\d+)'],
      keywords: ['OPD Total', 'Total OPD'],
    },
  },
  health_penta1: {
    type: 'number',
    voice: {
      question_en: 'How many children received the Penta 1 vaccine this month?',
      question_ha: 'Yara nawa suka karbi allurar Penta 1 a wannan watan?',
    },
    ocr: { patterns: ['penta\\s*1[:\\s]*(\\d+)'], keywords: ['PENTA 1', 'Penta1'] },
  },
  health_bcg: {
    type: 'number',
    voice: {
      question_en: 'How many children received the BCG vaccine?',
      question_ha: 'Yara nawa suka karbi allurar BCG?',
    },
    ocr: { patterns: ['bcg[:\\s]*(\\d+)'], keywords: ['BCG'] },
  },
  health_penta3: {
    type: 'number',
    voice: {
      question_en: 'How many children received the Penta 3 vaccine?',
      question_ha: 'Yara nawa suka karbi allurar Penta 3?',
    },
    ocr: { patterns: ['penta\\s*3[:\\s]*(\\d+)'], keywords: ['PENTA 3', 'Penta3'] },
  },
  health_measles: {
    type: 'number',
    voice: {
      question_en: 'How many children received the Measles vaccine?',
      question_ha: 'Yara nawa suka karbi allurar Measles?',
    },
    ocr: { patterns: ['measles[:\\s]*(\\d+)'], keywords: ['MEASLES', 'Measles'] },
  },

  // OPD Under 5
  health_opd_under5_total: {
    type: 'number',
    voice: {
      question_en: 'What was the total OPD attendance for children under 5?',
      question_ha: 'Menene jimlar yara kasa da shekaru 5 da suka zo OPD?',
    },
    ocr: {
      patterns: ['under\\s*5[:\\s]*(?:total)?[:\\s]*(\\d+)', 'opd\\s*u(?:nder)?\\s*5[:\\s]*(\\d+)'],
      keywords: ['OPD Under 5', 'Under 5 Total'],
    },
  },
  health_malaria_under5: {
    type: 'number',
    voice: {
      question_en: 'How many children under 5 were treated for malaria?',
      question_ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin zazzabin cizon sauro?',
    },
    ocr: { patterns: ['malaria[:\\s]*(?:under\\s*5)?[:\\s]*(\\d+)'], keywords: ['MALARIA'] },
  },
  health_diarrhea_under5: {
    type: 'number',
    voice: {
      question_en: 'How many children under 5 were treated for diarrhea?',
      question_ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin gudawa?',
    },
    ocr: { patterns: ['diarr?h?oea?[:\\s]*(\\d+)'], keywords: ['DIARRHEA', 'DIARRHOEA'] },
  },

  // ANC
  health_anc_total: {
    type: 'number',
    voice: {
      question_en: 'What was the total ANC attendance this month?',
      question_ha: 'Menene jimlar mata masu zuwa kulawa kafin haihuwa a wannan watan?',
    },
    ocr: { patterns: ['anc\\s*(?:total|attendance)?[:\\s]*(\\d+)'], keywords: ['ANC Total'] },
  },
  health_anc_first_visit: {
    type: 'number',
    voice: {
      question_en: 'How many women came for their first ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta farko?',
    },
    ocr: { patterns: ['(?:1st|first)\\s*visit[:\\s]*(\\d+)'], keywords: ['First Visit', '1st Visit'] },
  },
  health_anc_fourth_visit: {
    type: 'number',
    voice: {
      question_en: 'How many women came for their fourth ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta hudu?',
    },
    ocr: { patterns: ['(?:4th|fourth)\\s*visit[:\\s]*(\\d+)'], keywords: ['Fourth Visit', '4th Visit'] },
  },
  health_anc_eighth_visit: {
    type: 'number',
    voice: {
      question_en: 'How many women came for their eighth ANC visit?',
      question_ha: 'Mata nawa suka zo ziyarar ANC ta takwas?',
    },
    ocr: { patterns: ['(?:8th|eighth)\\s*visit[:\\s]*(\\d+)'], keywords: ['Eighth Visit', '8th Visit'] },
  },

  // Deliveries
  health_deliveries: {
    type: 'number',
    voice: {
      question_en: 'How many deliveries took place at the health facility this month?',
      question_ha: 'Haihuwa nawa aka yi a asibitin wannan watan?',
    },
    ocr: { patterns: ['deliver(?:y|ies)[:\\s]*(\\d+)'], keywords: ['Deliveries', 'Delivery'] },
  },
  health_postnatal: {
    type: 'number',
    voice: {
      question_en: 'How many post-natal visits were made?',
      question_ha: 'Ziyarce-ziyarcen bayan haihuwa nawa aka yi?',
    },
    ocr: { patterns: ['post[- ]?natal[:\\s]*(\\d+)', 'pnc[:\\s]*(\\d+)'], keywords: ['Post-Natal', 'PNC'] },
  },

  // Family Planning
  health_fp_counselling: {
    type: 'number',
    voice: {
      question_en: 'How many people received family planning counselling?',
      question_ha: "Mutane nawa suka sami shawarar tsarin iyali?",
    },
    ocr: { patterns: ['counsel(?:l)?ing[:\\s]*(\\d+)', 'fp\\s*counsell?[:\\s]*(\\d+)'], keywords: ['Counselling', 'FP Counselling'] },
  },
  health_fp_new_acceptors: {
    type: 'number',
    voice: {
      question_en: 'How many new family planning acceptors were there?',
      question_ha: 'Masu karbar tsarin iyali sababbi nawa ne?',
    },
    ocr: { patterns: ['new\\s*acceptors?[:\\s]*(\\d+)'], keywords: ['New Acceptors'] },
  },

  // Hepatitis B
  health_hepb_tested: {
    type: 'number',
    voice: {
      question_en: 'How many people were tested for Hepatitis B?',
      question_ha: 'Mutane nawa aka gwada cutar Hepatitis B?',
    },
    ocr: { patterns: ['hep\\s*b?\\s*tested[:\\s]*(\\d+)', 'hepatitis\\s*b?[:\\s]*tested[:\\s]*(\\d+)'], keywords: ['Hep B Tested', 'Hepatitis B Tested'] },
  },
  health_hepb_positive: {
    type: 'number',
    voice: {
      question_en: 'How many tested positive for Hepatitis B?',
      question_ha: 'Mutane nawa suka gwada positive na Hepatitis B?',
    },
    ocr: { patterns: ['hep\\s*b?\\s*positive[:\\s]*(\\d+)'], keywords: ['Hep B Positive'] },
  },

  // TB
  health_tb_presumptive: {
    type: 'number',
    voice: {
      question_en: 'How many presumptive TB cases were identified?',
      question_ha: 'Mutane nawa ake zargi da cutar tarin fuka?',
    },
    ocr: { patterns: ['(?:tb|tuberculosis)\\s*presumptive[:\\s]*(\\d+)'], keywords: ['TB Presumptive'] },
  },
  health_tb_on_treatment: {
    type: 'number',
    voice: {
      question_en: 'How many people are currently on TB treatment?',
      question_ha: 'Mutane nawa suke kan maganin tarin fuka yanzu?',
    },
    ocr: { patterns: ['(?:tb|tuberculosis)\\s*(?:on\\s*)?treatment[:\\s]*(\\d+)'], keywords: ['TB On Treatment', 'TB Treatment'] },
  },

  // ─── Section 3B: Facility Support ──────────────────────────────────────────
  facilities_renovated_govt: {
    type: 'number',
    voice: {
      question_en: 'How many health facilities were renovated by the government this month?',
      question_ha: 'Asibiti nawa gwamnati ta gyara a wannan watan?',
    },
    ocr: { patterns: ['(?:govt?|government)\\s*(?:renovated)?[:\\s]*(\\d+)'], keywords: ['Govt Renovated', 'Government'] },
  },
  facilities_renovated_partners: {
    type: 'number',
    voice: {
      question_en: 'How many facilities were renovated by development partners?',
      question_ha: 'Asibiti nawa abokan hulda suka gyara?',
    },
    ocr: { patterns: ['partners?\\s*(?:renovated)?[:\\s]*(\\d+)'], keywords: ['Partners Renovated'] },
  },
  facilities_renovated_wdc: {
    type: 'number',
    voice: {
      question_en: 'How many facilities were renovated by the WDC?',
      question_ha: 'Asibiti nawa WDC ta gyara?',
    },
    ocr: { patterns: ['wdc\\s*(?:renovated)?[:\\s]*(\\d+)'], keywords: ['WDC Renovated'] },
  },
  items_donated_count: {
    type: 'number',
    voice: {
      question_en: 'How many items were donated to health facilities by the WDC?',
      question_ha: 'Kayayyaki nawa WDC ta ba da gudummawa ga asibitoci?',
    },
    ocr: { patterns: ['items\\s*donated[:\\s]*(\\d+)'], keywords: ['Items Donated'] },
  },
  items_donated_govt_count: {
    type: 'number',
    voice: {
      question_en: 'How many items were donated by the government?',
      question_ha: 'Kayayyaki nawa gwamnati ta ba da gudummawa?',
    },
    ocr: { patterns: ['govt\\s*donated[:\\s]*(\\d+)'], keywords: ['Government Donated'] },
  },
  items_repaired_count: {
    type: 'number',
    voice: {
      question_en: 'How many items were repaired in health facilities?',
      question_ha: 'Kayayyaki nawa aka gyara a asibitoci?',
    },
    ocr: { patterns: ['items?\\s*repaired[:\\s]*(\\d+)'], keywords: ['Items Repaired'] },
  },

  // ─── Section 3C: Transportation ────────────────────────────────────────────
  women_transported_anc: {
    type: 'number',
    voice: {
      question_en: 'How many women were transported to the facility for ANC by the WDC or VDC?',
      question_ha: 'Mata nawa WDC ko VDC suka kai asibiti don kulawa kafin haihuwa?',
    },
    ocr: { patterns: ['(?:women|woman)\\s*(?:transported)?\\s*(?:to)?\\s*anc[:\\s]*(\\d+)'], keywords: ['Women ANC Transport'] },
  },
  women_transported_delivery: {
    type: 'number',
    voice: {
      question_en: 'How many women were transported to the facility for delivery?',
      question_ha: 'Mata nawa aka kai asibiti don haihuwa?',
    },
    ocr: { patterns: ['(?:women|woman)\\s*(?:transported)?\\s*(?:to|for)?\\s*deliver[:\\s]*(\\d+)'], keywords: ['Women Delivery Transport'] },
  },
  children_transported_danger: {
    type: 'number',
    voice: {
      question_en: 'How many children under 5 with danger signs were transported to a facility?',
      question_ha: 'Yara nawa kasa da 5 masu alamun hatsari aka kai asibiti?',
    },
    ocr: { patterns: ['children\\s*(?:under\\s*5)?\\s*(?:danger|transported)[:\\s]*(\\d+)'], keywords: ['Children Danger Signs'] },
  },
  women_supported_delivery_items: {
    type: 'number',
    voice: {
      question_en: 'How many women were supported with delivery items through WDC efforts?',
      question_ha: 'Mata nawa aka taimaka musu da kayan haihuwa ta hanyar WDC?',
    },
    ocr: { patterns: ['delivery\\s*items[:\\s]*(\\d+)'], keywords: ['Delivery Items'] },
  },

  // ─── Section 3D: cMPDSR ────────────────────────────────────────────────────
  maternal_deaths: {
    type: 'number',
    voice: {
      question_en: 'Were there any maternal deaths this month? If yes, how many?',
      question_ha: 'Shin akwai mutuwar uwaye a wannan watan? Idan eh, nawa?',
    },
    ocr: { patterns: ['maternal\\s*death[s]?[:\\s]*(\\d+)'], keywords: ['Maternal Deaths'] },
  },
  perinatal_deaths: {
    type: 'number',
    voice: {
      question_en: 'Were there any perinatal deaths this month? If yes, how many?',
      question_ha: 'Shin akwai mutuwar jarirai a wannan watan? Idan eh, nawa?',
    },
    ocr: { patterns: ['perinatal\\s*death[s]?[:\\s]*(\\d+)'], keywords: ['Perinatal Deaths'] },
  },

  // ─── Section 6: Mobilization ───────────────────────────────────────────────
  awareness_theme: {
    type: 'text',
    voice: {
      question_en: 'What was the awareness creation theme this month?',
      question_ha: "Menene taken wayar da kan jama'a a wannan watan?",
    },
    ocr: { patterns: ['(?:awareness|theme)[:\\s]*([^\\n]+)'], keywords: ['Awareness Theme'] },
  },
  traditional_leaders_support: {
    type: 'text',
    voice: {
      question_en: 'What support is needed from traditional leaders?',
      question_ha: 'Wane taimako ake bukata daga shugabannin gargajiya?',
    },
    ocr: { patterns: [], keywords: ['Traditional Leaders'] },
  },
  religious_leaders_support: {
    type: 'text',
    voice: {
      question_en: 'What support is needed from religious leaders?',
      question_ha: 'Wane taimako ake bukata daga shugabannin addini?',
    },
    ocr: { patterns: [], keywords: ['Religious Leaders'] },
  },

  // ─── Section 8: Conclusion ─────────────────────────────────────────────────
  support_required: {
    type: 'text',
    voice: {
      question_en: 'What support is required from LEMCHIC, Government, Partners, or others?',
      question_ha: 'Wane taimako ake bukata daga LEMCHIC, Gwamnati, Abokan hulda, ko wasu?',
    },
    ocr: { patterns: [], keywords: ['Support Required'] },
  },
  aob: {
    type: 'text',
    voice: {
      question_en: 'Is there any other business to report?',
      question_ha: "Shin akwai wani al'amari da za a bayar da rahotonsa?",
    },
    ocr: { patterns: [], keywords: ['AOB', 'Any Other Business'] },
  },
  attendance_total: {
    type: 'number',
    voice: {
      question_en: 'What was the total attendance at the meeting?',
      question_ha: 'Menene jimlar masu halarta taron?',
    },
    ocr: { patterns: ['(?:total\\s*)?attendance[:\\s]*(\\d+)', 'total[:\\s]*(\\d+)\\s*(?:attended|present)'], keywords: ['Total Attendance', 'Total'] },
  },
  attendance_male: {
    type: 'number',
    voice: {
      question_en: 'How many male attendees were there?',
      question_ha: 'Maza nawa suka halarta?',
    },
    ocr: { patterns: ['male[:\\s]*(\\d+)', 'men[:\\s]*(\\d+)'], keywords: ['Male', 'Men'] },
  },
  attendance_female: {
    type: 'number',
    voice: {
      question_en: 'How many female attendees were there?',
      question_ha: 'Mata nawa suka halarta?',
    },
    ocr: { patterns: ['female[:\\s]*(\\d+)', 'women[:\\s]*(\\d+)'], keywords: ['Female', 'Women'] },
  },
  next_meeting_date: {
    type: 'date',
    voice: {
      question_en: 'When is the next meeting scheduled?',
      question_ha: 'Yaushe aka shirya taro na gaba?',
    },
    ocr: { patterns: ['next\\s*meeting[:\\s]*([\\d/-]+)'], keywords: ['Next Meeting'] },
  },
};

export default DEFAULT_FIELD_CONFIG;
