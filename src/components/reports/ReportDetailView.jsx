import { useState } from 'react';
import {
  FileText,
  Calendar,
  Users,
  CheckSquare,
  Activity,
  Heart,
  Building2,
  Truck,
  AlertTriangle,
  MessageSquare,
  Map,
  Megaphone,
  Target,
  HelpCircle,
  ClipboardList,
  Image,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDate, formatMonth, toTitleCase } from '../../utils/formatters';

const UPLOAD_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '');

/**
 * Detailed Report View Component
 * Displays all fields and answers from a WDC submission in a professional, elegant format
 */
const ReportDetailView = ({ report }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!report) return null;

  // Debug logging
  console.log('ReportDetailView - Full report data:', report);
  console.log('action_tracker:', report.action_tracker);
  console.log('community_feedback:', report.community_feedback);
  console.log('vdc_reports:', report.vdc_reports);
  console.log('action_plan:', report.action_plan);

  // Parse group photos — stored as JSON string or already an array
  const groupPhotos = (() => {
    if (!report.group_photo_path) return [];
    if (Array.isArray(report.group_photo_path)) return report.group_photo_path;
    try { return JSON.parse(report.group_photo_path); } catch { return []; }
  })();

  const photoUrl = (path) => `${UPLOAD_BASE}/${path}`;

  // Helper to render a field value
  const renderField = (label, value, icon = null) => {
    if (value === null || value === undefined || value === '') return null;

    return (
      <div className="flex items-start gap-3 py-2">
        {icon && <div className="text-primary-600 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <dt className="text-sm font-medium text-neutral-600">{label}</dt>
          <dd className="text-sm text-neutral-900 mt-0.5">
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
          </dd>
        </div>
      </div>
    );
  };

  // Helper to render a section header
  const renderSectionHeader = (title, icon) => (
    <div className="flex items-center gap-2 pb-3 mb-4 border-b-2 border-primary-500">
      {icon}
      <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Meeting Information */}
      <div className="bg-white rounded-lg border border-neutral-200 p-5">
        {renderSectionHeader('Meeting Information', <Calendar className="w-5 h-5 text-primary-600" />)}
        <dl className="space-y-2">
          {renderField('Report Month', formatMonth(report.report_month))}
          {renderField('Meeting Type', toTitleCase(report.meeting_type))}
          {report.report_date && renderField('Meeting Date', formatDate(report.report_date))}
          {report.report_time && renderField('Meeting Time', report.report_time)}
          {renderField('Meetings Held', report.meetings_held)}
        </dl>
      </div>

      {/* Section 2: Agenda Items */}
      {(report.agenda_opening_prayer || report.agenda_minutes || report.agenda_action_tracker ||
        report.agenda_reports || report.agenda_action_plan || report.agenda_aob || report.agenda_closing) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Meeting Agenda', <CheckSquare className="w-5 h-5 text-primary-600" />)}
          <div className="grid grid-cols-2 gap-3">
            {report.agenda_opening_prayer && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">Opening Prayer</span>
              </div>
            )}
            {report.agenda_minutes && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">Review of Minutes</span>
              </div>
            )}
            {report.agenda_action_tracker && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">Action Tracker Review</span>
              </div>
            )}
            {report.agenda_reports && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">VDC Reports</span>
              </div>
            )}
            {report.agenda_action_plan && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">Community Action Plan</span>
              </div>
            )}
            {report.agenda_aob && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">Any Other Business</span>
              </div>
            )}
            {report.agenda_closing && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-neutral-700">Closing Remarks</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Action Tracker */}
      {report.action_tracker && report.action_tracker.filter(i => i.action_point?.trim()).length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Action Tracker', <Activity className="w-5 h-5 text-primary-600" />)}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tl-lg">#</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Action Point</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Responsible</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Timeline</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Challenges</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {report.action_tracker.filter(i => i.action_point?.trim()).map((item, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 text-neutral-500 font-medium">{index + 1}</td>
                    <td className="px-3 py-2.5 text-neutral-900">{item.action_point}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{item.responsible_person || '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{item.timeline || '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{item.challenges || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        item.status ? 'bg-yellow-100 text-yellow-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {item.status ? toTitleCase(item.status.replace(/_/g, ' ')) : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Health Data */}
      {(report.health_penta1 || report.health_bcg || report.health_malaria_under5 ||
        report.health_anc_first_visit || report.health_hepb_tested) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Health Data', <Heart className="w-5 h-5 text-primary-600" />)}

          {/* Immunization */}
          {(report.health_penta1 || report.health_bcg || report.health_penta3 || report.health_measles) && (
            <div className="mb-5">
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">Immunization (OPD)</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {report.health_penta1 !== null && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{report.health_penta1}</p>
                    <p className="text-xs text-blue-600 mt-1">Penta 1</p>
                  </div>
                )}
                {report.health_bcg !== null && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{report.health_bcg}</p>
                    <p className="text-xs text-blue-600 mt-1">BCG</p>
                  </div>
                )}
                {report.health_penta3 !== null && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{report.health_penta3}</p>
                    <p className="text-xs text-blue-600 mt-1">Penta 3</p>
                  </div>
                )}
                {report.health_measles !== null && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{report.health_measles}</p>
                    <p className="text-xs text-blue-600 mt-1">Measles</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Under 5 Diseases */}
          {(report.health_malaria_under5 || report.health_diarrhea_under5) && (
            <div className="mb-5">
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">OPD Under 5 Years</h4>
              <div className="grid grid-cols-2 gap-4">
                {report.health_malaria_under5 !== null && (
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{report.health_malaria_under5}</p>
                    <p className="text-xs text-red-600 mt-1">Malaria Cases</p>
                  </div>
                )}
                {report.health_diarrhea_under5 !== null && (
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{report.health_diarrhea_under5}</p>
                    <p className="text-xs text-red-600 mt-1">Diarrhea Cases</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANC */}
          {(report.health_anc_first_visit || report.health_anc_fourth_visit || report.health_deliveries) && (
            <div className="mb-5">
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">Antenatal Care (ANC)</h4>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {report.health_anc_first_visit !== null && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{report.health_anc_first_visit}</p>
                    <p className="text-xs text-purple-600 mt-1">ANC 1st Visit</p>
                  </div>
                )}
                {report.health_anc_fourth_visit !== null && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{report.health_anc_fourth_visit}</p>
                    <p className="text-xs text-purple-600 mt-1">ANC 4th Visit</p>
                  </div>
                )}
                {report.health_anc_eighth_visit !== null && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{report.health_anc_eighth_visit}</p>
                    <p className="text-xs text-purple-600 mt-1">ANC 8th Visit</p>
                  </div>
                )}
                {report.health_deliveries !== null && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{report.health_deliveries}</p>
                    <p className="text-xs text-purple-600 mt-1">Deliveries</p>
                  </div>
                )}
                {report.health_postnatal !== null && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{report.health_postnatal}</p>
                    <p className="text-xs text-purple-600 mt-1">Postnatal Care</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Family Planning */}
          {(report.health_fp_counselling || report.health_fp_new_acceptors) && (
            <div className="mb-5">
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">Family Planning</h4>
              <div className="grid grid-cols-2 gap-4">
                {report.health_fp_counselling !== null && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{report.health_fp_counselling}</p>
                    <p className="text-xs text-green-600 mt-1">FP Counselling</p>
                  </div>
                )}
                {report.health_fp_new_acceptors !== null && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{report.health_fp_new_acceptors}</p>
                    <p className="text-xs text-green-600 mt-1">New Acceptors</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hepatitis B */}
          {(report.health_hepb_tested || report.health_hepb_positive) && (
            <div className="mb-5">
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">Hepatitis B Screening</h4>
              <div className="grid grid-cols-2 gap-4">
                {report.health_hepb_tested !== null && (
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">{report.health_hepb_tested}</p>
                    <p className="text-xs text-orange-600 mt-1">HepB Tested</p>
                  </div>
                )}
                {report.health_hepb_positive !== null && (
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">{report.health_hepb_positive}</p>
                    <p className="text-xs text-orange-600 mt-1">HepB Positive</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TB */}
          {(report.health_tb_presumptive || report.health_tb_on_treatment) && (
            <div>
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">Tuberculosis (TB)</h4>
              <div className="grid grid-cols-2 gap-4">
                {report.health_tb_presumptive !== null && (
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{report.health_tb_presumptive}</p>
                    <p className="text-xs text-yellow-600 mt-1">TB Presumptive</p>
                  </div>
                )}
                {report.health_tb_on_treatment !== null && (
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{report.health_tb_on_treatment}</p>
                    <p className="text-xs text-yellow-600 mt-1">On Treatment</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 5: Health Facility Support */}
      {(report.facilities_renovated_govt || report.facilities_renovated_partners ||
        report.items_donated_count || report.items_repaired_count) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Health Facility Support', <Building2 className="w-5 h-5 text-primary-600" />)}

          {/* Renovations */}
          {(report.facilities_renovated_govt || report.facilities_renovated_partners || report.facilities_renovated_wdc) && (
            <div className="mb-4">
              <h4 className="font-semibold text-neutral-900 text-sm mb-3">Facility Renovations</h4>
              <div className="grid grid-cols-3 gap-3">
                {report.facilities_renovated_govt !== null && renderField('By Government', report.facilities_renovated_govt)}
                {report.facilities_renovated_partners !== null && renderField('By Partners', report.facilities_renovated_partners)}
                {report.facilities_renovated_wdc !== null && renderField('By WDC', report.facilities_renovated_wdc)}
              </div>
            </div>
          )}

          {/* Donations */}
          {report.items_donated_count !== null && (
            <div className="mb-4">
              {renderField('Items Donated', report.items_donated_count)}
              {report.items_donated_types && report.items_donated_types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.items_donated_types.map((type, idx) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Repairs */}
          {report.items_repaired_count !== null && (
            <div>
              {renderField('Items Repaired', report.items_repaired_count)}
              {report.items_repaired_types && report.items_repaired_types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.items_repaired_types.map((type, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 6: Transportation & Emergency */}
      {(report.women_transported_anc || report.women_transported_delivery ||
        report.children_transported_danger || report.women_supported_delivery_items) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Transportation & Emergency Support', <Truck className="w-5 h-5 text-primary-600" />)}
          <div className="grid grid-cols-2 gap-4">
            {report.women_transported_anc !== null && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-indigo-700">{report.women_transported_anc}</p>
                <p className="text-xs text-indigo-600 mt-1">Women transported for ANC</p>
              </div>
            )}
            {report.women_transported_delivery !== null && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-indigo-700">{report.women_transported_delivery}</p>
                <p className="text-xs text-indigo-600 mt-1">Women transported for delivery</p>
              </div>
            )}
            {report.children_transported_danger !== null && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-indigo-700">{report.children_transported_danger}</p>
                <p className="text-xs text-indigo-600 mt-1">Children in danger signs</p>
              </div>
            )}
            {report.women_supported_delivery_items !== null && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-indigo-700">{report.women_supported_delivery_items}</p>
                <p className="text-xs text-indigo-600 mt-1">Women supported with delivery items</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 7: Maternal & Perinatal Deaths (cMPDSR) */}
      {(report.maternal_deaths || report.perinatal_deaths) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Community-based Maternal & Perinatal Death Surveillance', <AlertTriangle className="w-5 h-5 text-primary-600" />)}
          <div className="space-y-4">
            {report.maternal_deaths !== null && (
              <div>
                <div className="bg-red-50 rounded-lg p-3 mb-2">
                  <p className="text-2xl font-bold text-red-700">{report.maternal_deaths}</p>
                  <p className="text-xs text-red-600 mt-1">Maternal Deaths</p>
                </div>
                {report.maternal_death_causes && report.maternal_death_causes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Causes:</p>
                    <div className="flex flex-wrap gap-2">
                      {report.maternal_death_causes.map((cause, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {report.perinatal_deaths !== null && (
              <div>
                <div className="bg-orange-50 rounded-lg p-3 mb-2">
                  <p className="text-2xl font-bold text-orange-700">{report.perinatal_deaths}</p>
                  <p className="text-xs text-orange-600 mt-1">Perinatal Deaths</p>
                </div>
                {report.perinatal_death_causes && report.perinatal_death_causes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Causes:</p>
                    <div className="flex flex-wrap gap-2">
                      {report.perinatal_death_causes.map((cause, idx) => (
                        <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                          {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 8: Community Feedback */}
      {report.community_feedback && report.community_feedback.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Community Feedback', <MessageSquare className="w-5 h-5 text-primary-600" />)}
          {report.town_hall_conducted && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Town Hall Meeting</p>
              <p className="text-xs text-blue-700 mt-1">{report.town_hall_conducted}</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tl-lg w-1/4">Indicator</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Community Feedback</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tr-lg">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {report.community_feedback.map((item, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 font-medium text-neutral-800">{item.indicator}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{item.feedback || '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{item.action_required || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 9: VDC Reports */}
      {report.vdc_reports && report.vdc_reports.filter(v => v.vdc_name?.trim()).length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Village Development Committee (VDC) Reports', <Map className="w-5 h-5 text-primary-600" />)}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tl-lg">#</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">VDC Name</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Issues Identified</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tr-lg">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {report.vdc_reports.filter(v => v.vdc_name?.trim()).map((vdc, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 text-neutral-500 font-medium">{index + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-neutral-900">{vdc.vdc_name}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{vdc.issues || '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{vdc.action_taken || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 10: Community Mobilization */}
      {(report.awareness_theme || report.traditional_leaders_support || report.religious_leaders_support) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Community Mobilization', <Megaphone className="w-5 h-5 text-primary-600" />)}
          <dl className="space-y-3">
            {report.awareness_theme && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <dt className="text-sm font-semibold text-yellow-900 mb-1">Awareness Theme</dt>
                <dd className="text-sm text-yellow-800">{report.awareness_theme}</dd>
              </div>
            )}
            {report.traditional_leaders_support && (
              <div className="bg-green-50 rounded-lg p-3">
                <dt className="text-sm font-semibold text-green-900 mb-1">Traditional Leaders' Support</dt>
                <dd className="text-sm text-green-800">{report.traditional_leaders_support}</dd>
              </div>
            )}
            {report.religious_leaders_support && (
              <div className="bg-purple-50 rounded-lg p-3">
                <dt className="text-sm font-semibold text-purple-900 mb-1">Religious Leaders' Support</dt>
                <dd className="text-sm text-purple-800">{report.religious_leaders_support}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Section 11: Community Action Plan */}
      {report.action_plan && report.action_plan.filter(p => p.issue?.trim()).length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Community Action Plan', <Target className="w-5 h-5 text-primary-600" />)}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tl-lg">#</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Issue</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Action</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Responsible</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700 rounded-tr-lg">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {report.action_plan.filter(p => p.issue?.trim()).map((plan, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 text-neutral-500 font-medium">{index + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-neutral-900">{plan.issue}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{plan.action || '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{plan.responsible_person || '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{plan.timeline || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 12: Support Required & AOB */}
      {(report.support_required || report.aob || report.issues_identified ||
        report.challenges || report.recommendations) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Additional Notes & Support', <HelpCircle className="w-5 h-5 text-primary-600" />)}
          <dl className="space-y-3">
            {report.support_required && (
              <div>
                <dt className="text-sm font-medium text-neutral-600 mb-1">Support Required</dt>
                <dd className="text-sm text-neutral-900 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  {report.support_required}
                </dd>
              </div>
            )}
            {report.issues_identified && (
              <div>
                <dt className="text-sm font-medium text-neutral-600 mb-1">Issues Identified</dt>
                <dd className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg">{report.issues_identified}</dd>
              </div>
            )}
            {report.challenges && (
              <div>
                <dt className="text-sm font-medium text-neutral-600 mb-1">Challenges</dt>
                <dd className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg">{report.challenges}</dd>
              </div>
            )}
            {report.recommendations && (
              <div>
                <dt className="text-sm font-medium text-neutral-600 mb-1">Recommendations</dt>
                <dd className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg">{report.recommendations}</dd>
              </div>
            )}
            {report.aob && (
              <div>
                <dt className="text-sm font-medium text-neutral-600 mb-1">Any Other Business</dt>
                <dd className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg">{report.aob}</dd>
              </div>
            )}
            {report.additional_notes && (
              <div>
                <dt className="text-sm font-medium text-neutral-600 mb-1">Additional Notes</dt>
                <dd className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg">{report.additional_notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Group Photos */}
      {groupPhotos.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-5">
          {renderSectionHeader('Meeting Photos', <Image className="w-5 h-5 text-primary-600" />)}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groupPhotos.map((path, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all group"
                aria-label={`View photo ${idx + 1}`}
              >
                <img
                  src={photoUrl(path)}
                  alt={`Meeting photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Image className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 13: Attendance & Next Meeting */}
      <div className="bg-white rounded-lg border border-neutral-200 p-5">
        {renderSectionHeader('Attendance & Next Steps', <ClipboardList className="w-5 h-5 text-primary-600" />)}

        {/* Attendance */}
        {(report.attendance_total || report.attendance_male || report.attendance_female) && (
          <div className="mb-5">
            <h4 className="font-semibold text-neutral-900 text-sm mb-3">Meeting Attendance</h4>
            <div className="grid grid-cols-3 gap-3">
              {report.attendance_total !== null && (
                <div className="bg-primary-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary-700">{report.attendance_total}</p>
                  <p className="text-xs text-primary-600 mt-1">Total</p>
                </div>
              )}
              {report.attendance_male !== null && (
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{report.attendance_male}</p>
                  <p className="text-xs text-blue-600 mt-1">Male</p>
                </div>
              )}
              {report.attendance_female !== null && (
                <div className="bg-pink-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-pink-700">{report.attendance_female}</p>
                  <p className="text-xs text-pink-600 mt-1">Female</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Meeting */}
        {report.next_meeting_date && (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm font-medium text-green-900">Next Meeting Scheduled</p>
            <p className="text-lg font-bold text-green-700 mt-1">{formatDate(report.next_meeting_date)}</p>
          </div>
        )}
      </div>
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X className="w-7 h-7" />
          </button>

          {lightboxIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 text-white/80 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          <img
            src={photoUrl(groupPhotos[lightboxIndex])}
            alt={`Meeting photo ${lightboxIndex + 1}`}
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxIndex < groupPhotos.length - 1 && (
            <button
              type="button"
              className="absolute right-4 text-white/80 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              aria-label="Next photo"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <p className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIndex + 1} / {groupPhotos.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportDetailView;
