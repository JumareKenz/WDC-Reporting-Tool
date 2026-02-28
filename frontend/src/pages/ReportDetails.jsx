import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Flag,
  Mic,
  Building2,
  HeartPulse,
  Bus,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Users2,
  Lightbulb,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
} from 'lucide-react';
import { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { useReportById, useDownloadVoiceNote } from '../hooks/useWDCData';
import { REPORT_STATUS } from '../utils/constants';

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({
    health: true,
    facility: true,
    transport: true,
    cmpdsr: true,
    feedback: true,
    vdc: true,
    mobilization: true,
    actionPlan: true,
  });

  const {
    data: reportData,
    isLoading,
    error,
  } = useReportById(id);

  const downloadMutation = useDownloadVoiceNote();

  const report = reportData?.data;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDownloadVoiceNote = (voiceNote) => {
    downloadMutation.mutate({
      voiceNoteId: voiceNote.id,
      filename: voiceNote.file_name,
    });
  };

  const StatusBadge = ({ status }) => {
    const config = {
      [REPORT_STATUS.SUBMITTED]: {
        icon: Clock,
        text: 'Submitted',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      [REPORT_STATUS.REVIEWED]: {
        icon: CheckCircle,
        text: 'Reviewed',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      [REPORT_STATUS.FLAGGED]: {
        icon: Flag,
        text: 'Flagged',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      [REPORT_STATUS.DRAFT]: {
        icon: FileText,
        text: 'Draft',
        className: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      },
      [REPORT_STATUS.DECLINED]: {
        icon: AlertTriangle,
        text: 'Declined',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
    };

    const { icon: Icon, text, className } = config[status] || config[REPORT_STATUS.DRAFT];

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${className}`}>
        <Icon className="w-4 h-4" />
        {text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMonth = (monthString) => {
    if (!monthString) return 'N/A';
    return new Date(monthString + '-01').toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '—';
    return Number(num).toLocaleString();
  };

  // Section Header Component
  const SectionHeader = ({ title, icon: Icon, section, count }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-blue-50 hover:from-primary-100 hover:to-blue-100 transition-colors rounded-t-xl border-b border-primary-100"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900">{title}</h3>
          {count !== undefined && (
            <p className="text-xs text-neutral-500">{count} item{count !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-neutral-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-neutral-400" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading report details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert
            type="error"
            title="Error Loading Report"
            message={error.message || 'Failed to load report details.'}
          />
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="warning" message="Report not found." />
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Parse JSON fields
  const actionTracker = parseJSON(report.action_tracker) || [];
  const communityFeedback = parseJSON(report.community_feedback) || [];
  const vdcReports = parseJSON(report.vdc_reports) || [];
  const actionPlan = parseJSON(report.action_plan) || [];
  const maternalDeathCauses = parseJSON(report.maternal_death_causes) || [];
  const perinatalDeathCauses = parseJSON(report.perinatal_death_causes) || [];
  const itemsDonatedTypes = parseJSON(report.items_donated_types) || [];
  const itemsDonatedGovtTypes = parseJSON(report.items_donated_govt_types) || [];
  const itemsRepairedTypes = parseJSON(report.items_repaired_types) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => navigate(-1)}
                size="sm"
              >
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Report Details
                </h1>
                <p className="mt-1 text-sm text-neutral-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatMonth(report.report_month)}
                  <span className="text-neutral-300">|</span>
                  <MapPin className="w-4 h-4" />
                  {report.ward?.name} Ward, {report.ward?.lga_name}
                </p>
              </div>
            </div>
            <StatusBadge status={report.status} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={Calendar}
            color="primary"
            label="Meetings Held"
            value={report.meetings_held || 0}
          />
          <SummaryCard
            icon={Users}
            color="green"
            label="Total Attendees"
            value={report.attendees_count || 0}
          />
          <SummaryCard
            icon={HeartPulse}
            color="red"
            label="ANC Visits"
            value={report.health_anc_total || 0}
          />
          <SummaryCard
            icon={Stethoscope}
            color="blue"
            label="Deliveries"
            value={report.health_deliveries || 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Information */}
            <Card>
              <SectionHeader title="Meeting Information" icon={ClipboardList} section="meeting" />
              {expandedSections.meeting !== false && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Meeting Type" value={report.meeting_type || 'Monthly'} />
                    <InfoItem label="Report Date" value={report.report_date || '—'} />
                    <InfoItem label="Report Time" value={report.report_time || '—'} />
                    <InfoItem 
                      label="Attendance" 
                      value={report.attendance_total ? `${report.attendance_total} (${report.attendance_male || 0}M, ${report.attendance_female || 0}F)` : '—'} 
                    />
                  </div>
                  
                  {/* Agenda Items */}
                  <div className="pt-4 border-t border-neutral-100">
                    <p className="text-sm font-medium text-neutral-700 mb-2">Agenda Items Covered</p>
                    <div className="flex flex-wrap gap-2">
                      {report.agenda_opening_prayer && <AgendaTag label="Opening Prayer" />}
                      {report.agenda_minutes && <AgendaTag label="Minutes" />}
                      {report.agenda_action_tracker && <AgendaTag label="Action Tracker" />}
                      {report.agenda_reports && <AgendaTag label="Reports" />}
                      {report.agenda_action_plan && <AgendaTag label="Action Plan" />}
                      {report.agenda_aob && <AgendaTag label="A.O.B" />}
                      {report.agenda_closing && <AgendaTag label="Closing" />}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Action Tracker */}
            {actionTracker.length > 0 && (
              <Card>
                <SectionHeader 
                  title="Action Tracker" 
                  icon={ClipboardList} 
                  section="actionTracker"
                  count={actionTracker.length}
                />
                {expandedSections.actionTracker && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {actionTracker.map((item, idx) => (
                        <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-neutral-900 text-sm">{item.action_point || 'Untitled Action'}</p>
                            <StatusPill status={item.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
                            {item.responsible_person && (
                              <span><strong>Responsible:</strong> {item.responsible_person}</span>
                            )}
                            {item.timeline && (
                              <span><strong>Timeline:</strong> {item.timeline}</span>
                            )}
                          </div>
                          {item.challenges && (
                            <p className="text-xs text-neutral-500 mt-2"><strong>Challenges:</strong> {item.challenges}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Health Data */}
            <Card>
              <SectionHeader title="Health Data" icon={HeartPulse} section="health" />
              {expandedSections.health && (
                <div className="p-4 space-y-6">
                  {/* OPD & Immunization */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">OPD & Immunization</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <HealthStat label="OPD General Attendance" value={report.health_general_attendance_total} color="blue" />
                      <HealthStat label="Routine Immunization" value={report.health_routine_immunization_total} color="green" />
                      <HealthStat label="PENTA1" value={report.health_penta1} color="teal" />
                      <HealthStat label="BCG" value={report.health_bcg} color="cyan" />
                      <HealthStat label="PENTA3" value={report.health_penta3} color="indigo" />
                      <HealthStat label="MEASLES" value={report.health_measles} color="violet" />
                      <HealthStat label="Malaria Under 5" value={report.health_malaria_under5} color="red" />
                      <HealthStat label="Diarrhea Under 5" value={report.health_diarrhea_under5} color="orange" />
                    </div>
                  </div>

                  {/* ANC */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">ANC (Antenatal Care)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <HealthStat label="ANC Total" value={report.health_anc_total} color="pink" />
                      <HealthStat label="1st Visit" value={report.health_anc_first_visit} color="rose" />
                      <HealthStat label="4th Visit" value={report.health_anc_fourth_visit} color="fuchsia" />
                      <HealthStat label="8th Visit" value={report.health_anc_eighth_visit} color="purple" />
                    </div>
                  </div>

                  {/* Labour, Deliveries & Post-Natal */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Labour, Deliveries & Post-Natal</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <HealthStat label="Deliveries" value={report.health_deliveries} color="violet" />
                      <HealthStat label="Post-Natal" value={report.health_postnatal} color="purple" />
                    </div>
                  </div>

                  {/* Family Planning */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Family Planning</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <HealthStat label="Counselling" value={report.health_fp_counselling} color="amber" />
                      <HealthStat label="New Acceptors" value={report.health_fp_new_acceptors} color="yellow" />
                    </div>
                  </div>

                  {/* Hepatitis B */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Hepatitis B</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <HealthStat label="Person Tested" value={report.health_hepb_tested} color="lime" />
                      <HealthStat label="Person Tested Positive" value={report.health_hepb_positive} color="emerald" />
                    </div>
                  </div>

                  {/* TB */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Tuberculosis (TB)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <HealthStat label="Total Presumptive" value={report.health_tb_presumptive} color="sky" />
                      <HealthStat label="Total on Treatment" value={report.health_tb_on_treatment} color="blue" />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Facility Support */}
            <Card>
              <SectionHeader title="Health Facility Support" icon={Building2} section="facility" />
              {expandedSections.facility && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FacilityStat 
                      label="Govt Renovations" 
                      value={report.facilities_renovated_govt}
                      icon="🏛️"
                    />
                    <FacilityStat 
                      label="Partner Renovations" 
                      value={report.facilities_renovated_partners}
                      icon="🤝"
                    />
                    <FacilityStat 
                      label="WDC Renovations" 
                      value={report.facilities_renovated_wdc}
                      icon="🏗️"
                    />
                  </div>
                  
                  {itemsDonatedTypes.length > 0 && (
                    <div className="pt-3 border-t border-neutral-100">
                      <p className="text-sm font-medium text-neutral-700 mb-2">Items Donated by WDC</p>
                      <div className="flex flex-wrap gap-2">
                        {itemsDonatedTypes.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {itemsRepairedTypes.length > 0 && (
                    <div className="pt-3 border-t border-neutral-100">
                      <p className="text-sm font-medium text-neutral-700 mb-2">Items Repaired</p>
                      <div className="flex flex-wrap gap-2">
                        {itemsRepairedTypes.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Transportation & Emergency */}
            <Card>
              <SectionHeader title="Transportation & Emergency Support" icon={Bus} section="transport" />
              {expandedSections.transport && (
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TransportStat label="Women to ANC" value={report.women_transported_anc} />
                    <TransportStat label="Women for Delivery" value={report.women_transported_delivery} />
                    <TransportStat label="Children (Danger)" value={report.children_transported_danger} />
                    <TransportStat label="Delivery Items" value={report.women_supported_delivery_items} />
                  </div>
                </div>
              )}
            </Card>

            {/* cMPDSR */}
            <Card>
              <SectionHeader title="cMPDSR (Death Surveillance)" icon={AlertTriangle} section="cmpdsr" />
              {expandedSections.cmpdsr && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-sm font-medium text-red-800 mb-1">Maternal Deaths</p>
                      <p className="text-3xl font-bold text-red-600">{formatNumber(report.maternal_deaths)}</p>
                      {maternalDeathCauses.length > 0 && maternalDeathCauses.some(c => c) && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-red-700 mb-1">Causes:</p>
                          <ul className="text-xs text-red-600 space-y-0.5">
                            {maternalDeathCauses.filter(c => c).map((cause, idx) => (
                              <li key={idx}>• {cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                      <p className="text-sm font-medium text-orange-800 mb-1">Perinatal Deaths</p>
                      <p className="text-3xl font-bold text-orange-600">{formatNumber(report.perinatal_deaths)}</p>
                      {perinatalDeathCauses.length > 0 && perinatalDeathCauses.some(c => c) && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-orange-700 mb-1">Causes:</p>
                          <ul className="text-xs text-orange-600 space-y-0.5">
                            {perinatalDeathCauses.filter(c => c).map((cause, idx) => (
                              <li key={idx}>• {cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Community Feedback */}
            {communityFeedback.length > 0 && (
              <Card>
                <SectionHeader 
                  title="Community Feedback" 
                  icon={MessageSquare} 
                  section="feedback"
                  count={communityFeedback.length}
                />
                {expandedSections.feedback && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {communityFeedback.map((item, idx) => (
                        item.feedback && (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="font-medium text-blue-900 text-sm">{item.indicator}</p>
                            <p className="text-sm text-blue-800 mt-1">{item.feedback}</p>
                            {item.action_required && (
                              <p className="text-xs text-blue-600 mt-2">
                                <strong>Action:</strong> {item.action_required}
                              </p>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* VDC Reports */}
            {vdcReports.length > 0 && vdcReports.some(r => r.vdc_name || r.issues) && (
              <Card>
                <SectionHeader 
                  title="VDC Reports" 
                  icon={Users2} 
                  section="vdc"
                  count={vdcReports.filter(r => r.vdc_name).length}
                />
                {expandedSections.vdc && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {vdcReports.filter(r => r.vdc_name).map((item, idx) => (
                        <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="font-medium text-purple-900 text-sm">{item.vdc_name}</p>
                          {item.issues && (
                            <p className="text-sm text-purple-800 mt-1"><strong>Issues:</strong> {item.issues}</p>
                          )}
                          {item.action_taken && (
                            <p className="text-xs text-purple-600 mt-1"><strong>Action:</strong> {item.action_taken}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Community Mobilization */}
            {(report.awareness_theme || report.traditional_leaders_support || report.religious_leaders_support) && (
              <Card>
                <SectionHeader title="Community Mobilization" icon={Users2} section="mobilization" />
                {expandedSections.mobilization && (
                  <div className="p-4 space-y-3">
                    {report.awareness_theme && (
                      <InfoItem label="Awareness Theme" value={report.awareness_theme} />
                    )}
                    {report.traditional_leaders_support && (
                      <InfoItem label="Traditional Leaders Support" value={report.traditional_leaders_support} />
                    )}
                    {report.religious_leaders_support && (
                      <InfoItem label="Religious Leaders Support" value={report.religious_leaders_support} />
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Action Plan */}
            {actionPlan.length > 0 && actionPlan.some(a => a.issue) && (
              <Card>
                <SectionHeader 
                  title="Community Action Plan" 
                  icon={Lightbulb} 
                  section="actionPlan"
                  count={actionPlan.filter(a => a.issue).length}
                />
                {expandedSections.actionPlan && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {actionPlan.filter(a => a.issue).map((item, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <p className="font-medium text-amber-900 text-sm">{item.issue}</p>
                          {item.action && (
                            <p className="text-sm text-amber-800 mt-1"><strong>Action:</strong> {item.action}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-amber-700">
                            {item.timeline && <span><strong>Timeline:</strong> {item.timeline}</span>}
                            {item.responsible_person && <span><strong>By:</strong> {item.responsible_person}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Support Required & AOB */}
            {(report.support_required || report.aob) && (
              <Card>
                <SectionHeader title="Support & Any Other Business" icon={MessageSquare} section="support" />
                {expandedSections.support !== false && (
                  <div className="p-4 space-y-4">
                    {report.support_required && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-1">Support Required</p>
                        <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">{report.support_required}</p>
                      </div>
                    )}
                    {report.aob && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-1">Any Other Business</p>
                        <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">{report.aob}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Report Metadata */}
            <Card title="Report Information">
              <div className="space-y-4 p-4">
                <MetadataItem icon={MapPin} label="Ward" value={report.ward?.name} />
                <MetadataItem icon={Building2} label="LGA" value={report.ward?.lga_name} />
                <MetadataItem icon={User} label="Submitted By" value={report.submitted_by?.full_name} />
                <MetadataItem icon={Calendar} label="Submitted At" value={formatDate(report.submitted_at)} />
                {report.reviewed_at && (
                  <MetadataItem icon={CheckCircle} label="Reviewed At" value={formatDate(report.reviewed_at)} />
                )}
                {report.next_meeting_date && (
                  <MetadataItem icon={Calendar} label="Next Meeting" value={report.next_meeting_date} />
                )}
              </div>
            </Card>

            {/* Voice Notes */}
            {report.voice_notes && report.voice_notes.length > 0 && (
              <Card
                title="Voice Notes"
                subtitle={`${report.voice_notes.length} attached`}
              >
                <div className="p-4 space-y-3">
                  {report.voice_notes.map((voiceNote) => (
                    <div
                      key={voiceNote.id}
                      className="border border-neutral-200 rounded-lg p-3 bg-neutral-50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Mic className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-900 truncate">
                            {voiceNote.file_name}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {(voiceNote.file_size / 1024 / 1024).toFixed(2)} MB
                            {voiceNote.duration_seconds && (
                              <> • {Math.floor(voiceNote.duration_seconds / 60)}:{(voiceNote.duration_seconds % 60).toString().padStart(2, '0')}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Download}
                        fullWidth
                        onClick={() => handleDownloadVoiceNote(voiceNote)}
                        loading={downloadMutation.isPending}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card title="Actions">
              <div className="p-4 space-y-2">
                <Button
                  variant="outline"
                  fullWidth
                  icon={ArrowLeft}
                  onClick={() => navigate(-1)}
                >
                  Back to Reports
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => window.print()}
                >
                  Print Report
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components

const SummaryCard = ({ icon: Icon, color, label, value }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-xs text-neutral-500">{label}</p>
    <p className="text-sm font-medium text-neutral-900">{value || '—'}</p>
  </div>
);

const MetadataItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-neutral-400 mt-0.5" />
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-900">{value || '—'}</p>
    </div>
  </div>
);

const AgendaTag = ({ label }) => (
  <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-md font-medium">
    {label}
  </span>
);

const StatusPill = ({ status }) => {
  const styles = {
    'Completed': 'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Delayed': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-neutral-100 text-neutral-600'}`}>
      {status || 'Pending'}
    </span>
  );
};

const HealthStat = ({ label, value, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    pink: 'bg-pink-50 text-pink-700 border-pink-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    lime: 'bg-lime-50 text-lime-700 border-lime-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  return (
    <div className={`p-3 rounded-lg border text-center ${colorMap[color] || colorMap.blue}`}>
      <p className="text-lg font-bold">{formatNumber(value)}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
};

const FacilityStat = ({ label, value, icon }) => (
  <div className="p-3 bg-neutral-50 rounded-lg text-center">
    <span className="text-2xl">{icon}</span>
    <p className="text-xl font-bold text-neutral-900 mt-1">{formatNumber(value)}</p>
    <p className="text-xs text-neutral-500">{label}</p>
  </div>
);

const TransportStat = ({ label, value }) => (
  <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
    <p className="text-xl font-bold text-blue-700">{formatNumber(value)}</p>
    <p className="text-xs text-blue-600">{label}</p>
  </div>
);

// Utility function to parse JSON
function parseJSON(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default ReportDetails;
