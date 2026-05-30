import React, { useEffect } from 'react';
import { NumberInput } from './shared';

const HealthDataSection = ({ formData, onChange, errors }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-calc: Immunization Total = PENTA1 + BCG + PENTA3 + MEASLES
  useEffect(() => {
    const total = (parseInt(formData.health_penta1) || 0) + (parseInt(formData.health_bcg) || 0)
      + (parseInt(formData.health_penta3) || 0) + (parseInt(formData.health_measles) || 0);
    onChange(prev => (parseInt(prev.health_routine_immunization_total) || 0) === total ? prev : { ...prev, health_routine_immunization_total: String(total) });
  }, [formData.health_penta1, formData.health_bcg, formData.health_penta3, formData.health_measles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calc: OPD Under 5 Total = malaria + diarrhea
  useEffect(() => {
    const total = (parseInt(formData.health_malaria_under5) || 0) + (parseInt(formData.health_diarrhea_under5) || 0);
    onChange(prev => (parseInt(prev.health_opd_under5_total) || 0) === total ? prev : { ...prev, health_opd_under5_total: String(total) });
  }, [formData.health_malaria_under5, formData.health_diarrhea_under5]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calc: ANC Total = first visit + fourth visit
  useEffect(() => {
    const total = (parseInt(formData.health_anc_first_visit) || 0) + (parseInt(formData.health_anc_fourth_visit) || 0);
    onChange(prev => (parseInt(prev.health_anc_total) || 0) === total ? prev : { ...prev, health_anc_total: String(total) });
  }, [formData.health_anc_first_visit, formData.health_anc_fourth_visit]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* OPD General Attendance */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">OPD General Attendance</h4>
        <p className="text-xs text-gray-500 mb-3">Total outpatient visits across the reporting period.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberInput label="OPD General Attendance Total" name="health_general_attendance_total" value={formData.health_general_attendance_total} onChange={handleChange} required />
        </div>
      </div>

      {/* OPD Immunization */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">OPD Immunization</h4>
        <p className="text-xs text-gray-500 mb-3">Routine immunization counts.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="OPD Immunization Total" name="health_routine_immunization_total" value={formData.health_routine_immunization_total} onChange={handleChange} readOnly />
          <NumberInput label="PENTA1" name="health_penta1" value={formData.health_penta1} onChange={handleChange} required />
          <NumberInput label="BCG" name="health_bcg" value={formData.health_bcg} onChange={handleChange} required />
          <NumberInput label="PENTA3" name="health_penta3" value={formData.health_penta3} onChange={handleChange} required />
          <NumberInput label="MEASLES" name="health_measles" value={formData.health_measles} onChange={handleChange} required />
        </div>
      </div>

      {/* OPD Under 5 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">OPD Under 5</h4>
        <p className="text-xs text-gray-500 mb-3">Outpatient attendance for children under five.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberInput label="OPD Under 5 Total" name="health_opd_under5_total" value={formData.health_opd_under5_total} onChange={handleChange} readOnly />
          <NumberInput label="MALARIA UNDER 5" name="health_malaria_under5" value={formData.health_malaria_under5} onChange={handleChange} required />
          <NumberInput label="DIARRHEA UNDER 5" name="health_diarrhea_under5" value={formData.health_diarrhea_under5} onChange={handleChange} required />
        </div>
      </div>

      {/* ANC */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">ANC (Antenatal Care)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumberInput label="ANC Total" name="health_anc_total" value={formData.health_anc_total} onChange={handleChange} readOnly />
          <NumberInput label="FIRST VISIT" name="health_anc_first_visit" value={formData.health_anc_first_visit} onChange={handleChange} required />
          <NumberInput label="FOURTH VISIT" name="health_anc_fourth_visit" value={formData.health_anc_fourth_visit} onChange={handleChange} required />
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
