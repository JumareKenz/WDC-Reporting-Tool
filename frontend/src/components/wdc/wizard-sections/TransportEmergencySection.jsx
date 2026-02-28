import React from 'react';
import { NumberInput } from './shared';

/**
 * Section 3C: Transportation & Emergency
 */
const TransportEmergencySection = ({ formData, onChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Record the number of women and children transported to health facilities through WDC/VDC efforts.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <NumberInput
            label="Women transported to facility for ANC by WDC/VDC"
            name="women_transported_anc"
            value={formData.women_transported_anc}
            onChange={handleChange}
          />
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <NumberInput
            label="Women transported to facility for delivery by WDC/VDC"
            name="women_transported_delivery"
            value={formData.women_transported_delivery}
            onChange={handleChange}
          />
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <NumberInput
            label="Children under 5 with danger signs transported"
            name="children_transported_danger"
            value={formData.children_transported_danger}
            onChange={handleChange}
          />
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <NumberInput
            label="Women supported with delivery items through WDC efforts"
            name="women_supported_delivery_items"
            value={formData.women_supported_delivery_items}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
};

export default TransportEmergencySection;
