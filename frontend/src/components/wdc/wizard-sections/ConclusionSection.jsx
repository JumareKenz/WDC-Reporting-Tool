import React, { useEffect } from 'react';
import { Upload, X, Image, Users } from 'lucide-react';
import { TextInput, NumberInput, inputClass } from './shared';

/**
 * Section 8: Support Required, Attendance, Photos & Conclusion
 *
 * File uploads (attendance pictures & group photos) are stored in formData
 * as _attendance_pictures and _group_photos so the parent page can include
 * them in the submission payload.
 */
const ConclusionSection = ({ formData, onChange, onVoiceNote, errors }) => {
  const attendancePictures = formData._attendance_pictures || [];
  const groupPhotos = formData._group_photos || [];

  const male = parseInt(formData.attendance_male) || 0;
  const female = parseInt(formData.attendance_female) || 0;
  const computedTotal = male + female;

  // Auto-calculate attendance_total = male + female
  useEffect(() => {
    const currentTotal = parseInt(formData.attendance_total) || 0;
    if (currentTotal !== computedTotal) {
      onChange((prev) => ({ ...prev, attendance_total: String(computedTotal) }));
    }
  }, [male, female, computedTotal, formData.attendance_total, onChange]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      attendancePictures.forEach((pic) => URL.revokeObjectURL(pic.preview));
      groupPhotos.forEach((pic) => URL.revokeObjectURL(pic.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  const handlePictureUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPictures = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    onChange((prev) => ({
      ...prev,
      _attendance_pictures: [...(prev._attendance_pictures || []), ...newPictures],
    }));
  };

  const handleRemovePicture = (index) => {
    URL.revokeObjectURL(attendancePictures[index]?.preview);
    onChange((prev) => ({
      ...prev,
      _attendance_pictures: (prev._attendance_pictures || []).filter((_, i) => i !== index),
    }));
  };

  const handleGroupPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    onChange((prev) => ({
      ...prev,
      _group_photos: [...(prev._group_photos || []), ...newPhotos],
    }));
  };

  const handleRemoveGroupPhoto = (index) => {
    URL.revokeObjectURL(groupPhotos[index]?.preview);
    onChange((prev) => ({
      ...prev,
      _group_photos: (prev._group_photos || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Support Required */}
      <TextInput
        label="Support Required (LEMCHIC / Government / Partners / Others)"
        name="support_required"
        type="textarea"
        value={formData.support_required}
        onChange={handleChange}
        onVoiceNote={onVoiceNote ? (file) => onVoiceNote('support_required', file) : undefined}
        placeholder="List support required..."
        rows={3}
        required
      />

      <TextInput
        label="Any Other Business (AOB)"
        name="aob"
        type="textarea"
        value={formData.aob}
        onChange={handleChange}
        onVoiceNote={onVoiceNote ? (file) => onVoiceNote('aob', file) : undefined}
        placeholder="Other business..."
        rows={3}
        required
      />

      {/* Attendance Summary */}
      <div className="bg-green-50 p-5 rounded-xl border border-green-200">
        <h4 className="text-sm font-semibold text-green-800 mb-3">Attendance Summary</h4>
        <p className="text-xs text-green-600 mb-4">
          Enter male and female attendance. Total is automatically calculated.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <NumberInput label="Male" name="attendance_male" value={formData.attendance_male} onChange={handleChange} required />
          <NumberInput label="Female" name="attendance_female" value={formData.attendance_female} onChange={handleChange} required />
          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">
              Total <span className="text-red-500">*</span>
            </label>
            <div className="w-full rounded-xl border border-green-300 bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
              {computedTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Pictures */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h5 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Image className="w-4 h-4" />
          Upload Attendance Pictures
        </h5>
        <p className="text-xs text-gray-500 mb-3">
          Photograph the signed attendance list and upload it here.
        </p>
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
          <Upload className="w-7 h-7 text-gray-400 mb-1" />
          <p className="text-sm text-gray-600">Click to upload</p>
          <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
          <input type="file" accept="image/*" multiple onChange={handlePictureUpload} className="hidden" />
        </label>
        {attendancePictures.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
            {attendancePictures.map((pic, index) => (
              <div key={index} className="relative group">
                <img src={pic.preview} alt={`Attendance ${index + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => handleRemovePicture(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Photo */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h5 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Upload Group Photo
        </h5>
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
          <Upload className="w-7 h-7 text-gray-400 mb-1" />
          <p className="text-sm text-gray-600">Click to upload group photo</p>
          <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
          <input type="file" accept="image/*" onChange={handleGroupPhotoUpload} className="hidden" />
        </label>
        {groupPhotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
            {groupPhotos.map((pic, index) => (
              <div key={index} className="relative group">
                <img src={pic.preview} alt={`Group ${index + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => handleRemoveGroupPhoto(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Meeting & Signatures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="wiz-next_meeting_date" className="block text-xs sm:text-sm font-medium text-gray-700">
            Date of Next Meeting <span className="text-red-500">*</span>
          </label>
          <input
            id="wiz-next_meeting_date"
            type="date"
            name="next_meeting_date"
            value={formData.next_meeting_date}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Chairman Signature (Full Name)"
          name="chairman_signature"
          value={formData.chairman_signature}
          onChange={handleChange}
          placeholder="Chairman's full name..."
          required
        />
        <TextInput
          label="Secretary Signature (Full Name)"
          name="secretary_signature"
          value={formData.secretary_signature}
          onChange={handleChange}
          placeholder="Secretary's full name..."
          required
        />
      </div>
    </div>
  );
};

export default ConclusionSection;
