import React from 'react';
import { NumberInput } from './shared';

/**
 * Section 3A: General Attendance — Health Data (OPD, ANC, deliveries, FP, HEP B, TB)
 */
const HealthDataSection = ({ formData, onChange, errors }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-8">
      {/* General Attendance Total */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">General Attendance</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="General Attendance Total" name="health_general_attendance_total" value={formData.health_general_attendance_total} onChange={handleChange} required />
        </div>
      </div>

      {/* OPD Immunization */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">OPD Immunization</h4>
        <p className="text-xs text-gray-500 mb-3">Enter total immunization figures for the reporting period.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <NumberInput label="OPD Total" name="health_opd_total" value={formData.health_opd_total} onChange={handleChange} required />
          <NumberInput label="Routine Immunization Total" name="health_routine_immunization_total" value={formData.health_routine_immunization_total} onChange={handleChange} required />
          <NumberInput label="PENTA1" name="health_penta1" value={formData.health_penta1} onChange={handleChange} required />
          <NumberInput label="BCG" name="health_bcg" value={formData.health_bcg} onChange={handleChange} required />
          <NumberInput label="PENTA3" name="health_penta3" value={formData.health_penta3} onChange={handleChange} required />
          <NumberInput label="MEASLES" name="health_measles" value={formData.health_measles} onChange={handleChange} required />
        </div>
      </div>

      {/* OPD Under 5 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">OPD Under 5</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumberInput label="MALARIA UNDER 5" name="health_malaria_under5" value={formData.health_malaria_under5} onChange={handleChange} required />
          <NumberInput label="DIARRHEA UNDER 5" name="health_diarrhea_under5" value={formData.health_diarrhea_under5} onChange={handleChange} required />
        </div>
      </div>

      {/* ANC */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">ANC (Antenatal Care)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="ANC Total" name="health_anc_total" value={formData.health_anc_total} onChange={handleChange} required />
          <NumberInput label="FIRST VISIT" name="health_anc_first_visit" value={formData.health_anc_first_visit} onChange={handleChange} required />
          <NumberInput label="FOURTH VISIT" name="health_anc_fourth_visit" value={formData.health_anc_fourth_visit} onChange={handleChange} required />
          <NumberInput label="EIGHTH VISIT" name="health_anc_eighth_visit" value={formData.health_anc_eighth_visit} onChange={handleChange} required />
        </div>
      </div>

      {/* Labour, Deliveries & Post-Natal */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Labour, Deliveries & Post-Natal</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="Deliveries" name="health_deliveries" value={formData.health_deliveries} onChange={handleChange} required />
          <NumberInput label="Post-Natal" name="health_postnatal" value={formData.health_postnatal} onChange={handleChange} required />
        </div>
      </div>

      {/* Family Planning */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Family Planning</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="Counselling" name="health_fp_counselling" value={formData.health_fp_counselling} onChange={handleChange} required />
          <NumberInput label="New Acceptors" name="health_fp_new_acceptors" value={formData.health_fp_new_acceptors} onChange={handleChange} required />
        </div>
      </div>

      {/* HEP B */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Hepatitis B</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="Person Tested" name="health_hepb_tested" value={formData.health_hepb_tested} onChange={handleChange} error={errors.health_hepb_tested} required />
          <NumberInput label="Person Tested Positive" name="health_hepb_positive" value={formData.health_hepb_positive} onChange={handleChange} error={errors.health_hepb_positive} required />
        </div>
      </div>

      {/* TB */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Tuberculosis (TB)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="Total Presumptive" name="health_tb_presumptive" value={formData.health_tb_presumptive} onChange={handleChange} required />
          <NumberInput label="Total on Treatment" name="health_tb_on_treatment" value={formData.health_tb_on_treatment} onChange={handleChange} required />
        </div>
      </div>
    </div>
  );
};

export default HealthDataSection;
