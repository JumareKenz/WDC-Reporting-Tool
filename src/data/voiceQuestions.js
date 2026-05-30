/**
 * Voice Assistant question scripts for the WDC Monthly Report form.
 * Each entry maps a form field to natural spoken questions in English and Hausa.
 * Fields are ordered matching the form sections.
 */

const voiceQuestions = [
  // Section 1: Agenda & Governance
  {
    field: 'meeting_type',
    type: 'select',
    options: ['Monthly', 'Emergency', 'Quarterly Town Hall'],
    en: 'What type of meeting was held? Monthly, Emergency, or Quarterly Town Hall?',
    ha: 'Wane irin taro aka yi? Na wata-wata, na gaggawa, ko na kwata na gari?',
  },

  // Section 2: Action Tracker — handled as a group prompt
  {
    field: 'action_tracker_summary',
    type: 'text',
    en: 'Were there any action points from the last meeting? If yes, briefly describe what was agreed and what progress has been made.',
    ha: 'Shin akwai abubuwan da aka amince akai daga taron da ya gabata? Idan eh, a takaice ka bayyana abin da aka amince da shi da kuma ci gaban da aka samu.',
  },

  // Section 3A: General Attendance — OPD Immunization
  {
    field: 'health_opd_total',
    type: 'number',
    en: 'What was the total OPD attendance this month?',
    ha: 'Menene jimlar masu zuwa OPD a wannan watan?',
  },
  {
    field: 'health_penta1',
    type: 'number',
    en: 'How many children received the Penta 1 vaccine this month?',
    ha: 'Yara nawa suka karbi allurar Penta 1 a wannan watan?',
  },
  {
    field: 'health_bcg',
    type: 'number',
    en: 'How many children received the BCG vaccine?',
    ha: 'Yara nawa suka karbi allurar BCG?',
  },
  {
    field: 'health_penta3',
    type: 'number',
    en: 'How many children received the Penta 3 vaccine?',
    ha: 'Yara nawa suka karbi allurar Penta 3?',
  },
  {
    field: 'health_measles',
    type: 'number',
    en: 'How many children received the Measles vaccine?',
    ha: 'Yara nawa suka karbi allurar Measles?',
  },

  // OPD Under 5
  {
    field: 'health_opd_under5_total',
    type: 'number',
    en: 'What was the total OPD attendance for children under 5?',
    ha: 'Menene jimlar yara kasa da shekaru 5 da suka zo OPD?',
  },
  {
    field: 'health_malaria_under5',
    type: 'number',
    en: 'How many children under 5 were treated for malaria?',
    ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin zazzabin cizon sauro?',
  },
  {
    field: 'health_diarrhea_under5',
    type: 'number',
    en: 'How many children under 5 were treated for diarrhea?',
    ha: 'Yara nawa kasa da shekaru 5 aka yi wa maganin gudawa?',
  },

  // ANC
  {
    field: 'health_anc_total',
    type: 'number',
    en: 'What was the total ANC attendance this month?',
    ha: 'Menene jimlar mata masu zuwa kulawa kafin haihuwa a wannan watan?',
  },
  {
    field: 'health_anc_first_visit',
    type: 'number',
    en: 'How many women came for their first ANC visit?',
    ha: 'Mata nawa suka zo ziyarar ANC ta farko?',
  },
  {
    field: 'health_anc_fourth_visit',
    type: 'number',
    en: 'How many women came for their fourth ANC visit?',
    ha: 'Mata nawa suka zo ziyarar ANC ta hudu?',
  },

  // Labour & Deliveries
  {
    field: 'health_deliveries',
    type: 'number',
    en: 'How many deliveries took place at the health facility this month?',
    ha: 'Haihuwa nawa aka yi a asibitin wannan watan?',
  },
  {
    field: 'health_postnatal',
    type: 'number',
    en: 'How many post-natal visits were made?',
    ha: 'Ziyarce-ziyarcen bayan haihuwa nawa aka yi?',
  },

  // Family Planning
  {
    field: 'health_fp_counselling',
    type: 'number',
    en: 'How many people received family planning counselling?',
    ha: 'Mutane nawa suka sami shawarar tsarin iyali?',
  },
  {
    field: 'health_fp_new_acceptors',
    type: 'number',
    en: 'How many new family planning acceptors were there?',
    ha: 'Masu karbar tsarin iyali sababbi nawa ne?',
  },

  // Hepatitis B
  {
    field: 'health_hepb_tested',
    type: 'number',
    en: 'How many people were tested for Hepatitis B?',
    ha: 'Mutane nawa aka gwada cutar Hepatitis B?',
  },
  {
    field: 'health_hepb_positive',
    type: 'number',
    en: 'How many tested positive for Hepatitis B?',
    ha: 'Mutane nawa suka gwada positive na Hepatitis B?',
  },

  // TB
  {
    field: 'health_tb_presumptive',
    type: 'number',
    en: 'How many presumptive TB cases were identified?',
    ha: 'Mutane nawa ake zargi da cutar tarin fuka?',
  },
  {
    field: 'health_tb_on_treatment',
    type: 'number',
    en: 'How many people are currently on TB treatment?',
    ha: 'Mutane nawa suke kan maganin tarin fuka yanzu?',
  },

  // Section 3B: Health Facility Support
  {
    field: 'facilities_renovated_govt',
    type: 'number',
    en: 'How many health facilities were renovated by the government this month?',
    ha: 'Asibiti nawa gwamnati ta gyara a wannan watan?',
  },
  {
    field: 'facilities_renovated_partners',
    type: 'number',
    en: 'How many facilities were renovated by development partners?',
    ha: 'Asibiti nawa abokan hulda suka gyara?',
  },
  {
    field: 'facilities_renovated_wdc',
    type: 'number',
    en: 'How many facilities were renovated by the WDC?',
    ha: 'Asibiti nawa WDC ta gyara?',
  },
  {
    field: 'items_donated_count',
    type: 'number',
    en: 'How many items were donated to health facilities by the WDC?',
    ha: 'Kayayyaki nawa WDC ta ba da gudummawa ga asibitoci?',
  },
  {
    field: 'items_donated_govt_count',
    type: 'number',
    en: 'How many items were donated by the government?',
    ha: 'Kayayyaki nawa gwamnati ta ba da gudummawa?',
  },
  {
    field: 'items_repaired_count',
    type: 'number',
    en: 'How many items were repaired in health facilities?',
    ha: 'Kayayyaki nawa aka gyara a asibitoci?',
  },

  // Section 3C: Transportation
  {
    field: 'women_transported_anc',
    type: 'number',
    en: 'How many women were transported to the facility for ANC by the WDC or VDC?',
    ha: 'Mata nawa WDC ko VDC suka kai asibiti don kulawa kafin haihuwa?',
  },
  {
    field: 'women_transported_delivery',
    type: 'number',
    en: 'How many women were transported to the facility for delivery?',
    ha: 'Mata nawa aka kai asibiti don haihuwa?',
  },
  {
    field: 'children_transported_danger',
    type: 'number',
    en: 'How many children under 5 with danger signs were transported to a facility?',
    ha: 'Yara nawa kasa da 5 masu alamun hatsari aka kai asibiti?',
  },
  {
    field: 'women_supported_delivery_items',
    type: 'number',
    en: 'How many women were supported with delivery items through WDC efforts?',
    ha: 'Mata nawa aka taimaka musu da kayan haihuwa ta hanyar WDC?',
  },

  // Section 3D: cMPDSR
  {
    field: 'maternal_deaths',
    type: 'number',
    en: 'Were there any maternal deaths this month? If yes, how many?',
    ha: 'Shin akwai mutuwar uwaye a wannan watan? Idan eh, nawa?',
  },
  {
    field: 'perinatal_deaths',
    type: 'number',
    en: 'Were there any perinatal deaths this month? If yes, how many?',
    ha: 'Shin akwai mutuwar jarirai a wannan watan? Idan eh, nawa?',
  },

  // Section 5: VDC Reports (summary)
  {
    field: 'vdc_summary',
    type: 'text',
    en: 'Are there any reports from the Village Development Committees? Briefly describe the main issues raised.',
    ha: 'Shin akwai rahoton daga Kwamitin Ci gaban Kauye? A takaice ku bayyana babban matsalolin da aka taso.',
  },

  // Section 6: Community Mobilization
  {
    field: 'awareness_theme',
    type: 'text',
    en: 'What was the awareness creation theme this month?',
    ha: 'Menene taken wayar da kan jama\'a a wannan watan?',
  },
  {
    field: 'traditional_leaders_support',
    type: 'text',
    en: 'What support is needed from traditional leaders?',
    ha: 'Wane taimako ake bukata daga shugabannin gargajiya?',
  },
  {
    field: 'religious_leaders_support',
    type: 'text',
    en: 'What support is needed from religious leaders?',
    ha: 'Wane taimako ake bukata daga shugabannin addini?',
  },

  // Section 8: Support & Conclusion
  {
    field: 'support_required',
    type: 'text',
    en: 'What support is required from LEMCHIC, Government, Partners, or others?',
    ha: 'Wane taimako ake bukata daga LEMCHIC, Gwamnati, Abokan hulda, ko wasu?',
  },
  {
    field: 'aob',
    type: 'text',
    en: 'Is there any other business to report?',
    ha: 'Shin akwai wani al\'amari da za a bayar da rahotonsa?',
  },
  {
    field: 'attendance_total',
    type: 'number',
    en: 'What was the total attendance at the meeting?',
    ha: 'Menene jimlar masu halarta taron?',
  },
  {
    field: 'attendance_male',
    type: 'number',
    en: 'How many male attendees were there?',
    ha: 'Maza nawa suka halarta?',
  },
  {
    field: 'attendance_female',
    type: 'number',
    en: 'How many female attendees were there?',
    ha: 'Mata nawa suka halarta?',
  },
  {
    field: 'next_meeting_date',
    type: 'date',
    en: 'When is the next meeting scheduled?',
    ha: 'Yaushe aka shirya taro na gaba?',
  },
];

export default voiceQuestions;
