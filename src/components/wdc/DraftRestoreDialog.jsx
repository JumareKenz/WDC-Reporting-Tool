import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Server, HardDrive, AlertTriangle, 
  GitMerge, Trash2, FileText 
} from 'lucide-react';

/**
 * Draft Restore Dialog
 * 
 * Shows when both local and server drafts exist,
 * allowing user to choose which to use.
 */

const FIELD_LABELS = {
  report_date: 'Report Date',
  meeting_type: 'Meeting Type',
  attendance_total: 'Total Attendance',
  attendance_male: 'Male Attendees',
  attendance_female: 'Female Attendees',
  health_opd_total: 'OPD Attendance',
  health_immunization_total: 'Immunization Count',
  health_anc_total: 'ANC Registrations',
  health_deliveries_total: 'Deliveries',
  meeting_location: 'Meeting Location',
  agenda_items: 'Agenda Items',
  action_tracker: 'Action Tracker',
  challenges: 'Challenges',
};

const DraftRestoreDialog = ({ 
  isOpen,
  localDraft,
  serverDraft,
  onRestoreLocal,
  onRestoreServer,
  onMerge,
  onDiscard,
  currentStep = 0
}) => {
  if (!isOpen) return null;

  const hasLocal = !!localDraft;
  const hasServer = !!serverDraft;
  const hasConflict = hasLocal && hasServer;

  const localDate = localDraft?.updatedAt ? new Date(localDraft.updatedAt) : null;
  const serverDate = serverDraft?.updated_at ? new Date(serverDraft.updated_at) : null;

  const localIsNewer = localDate && serverDate 
    ? localDate > serverDate 
    : hasLocal;

  const formatRelative = (date) => {
    if (!date) return 'unknown';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff} minute${diff > 1 ? 's' : ''} ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hour${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 1440)} day${Math.floor(diff / 1440) > 1 ? 's' : ''} ago`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-restore-title"
        >
          {/* Header */}
          <div className="bg-green-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-white" aria-hidden="true" />
              <h2 id="draft-restore-title" className="text-lg font-semibold text-white">
                Unsaved Draft Found
              </h2>
            </div>
            <p className="text-green-100 text-sm mt-1">
              You have an incomplete report that was auto-saved.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Conflict Warning */}
            {hasConflict && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-amber-700">
                  Both a local draft and a server draft exist. Choose which version to continue with.
                </p>
              </div>
            )}

            {/* Draft Options */}
            <div className="space-y-3">
              {hasLocal && (
                <button
                  onClick={onRestoreLocal}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                    transition-all duration-200
                    ${localIsNewer 
                      ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${localIsNewer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    <HardDrive className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Local Draft
                      </span>
                      {localIsNewer && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Most Recent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Saved {formatRelative(localDate)} on this device
                    </p>
                    {currentStep > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Progress: Step {currentStep + 1}
                      </p>
                    )}
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                </button>
              )}

              {hasServer && (
                <button
                  onClick={onRestoreServer}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                    transition-all duration-200
                    ${!localIsNewer 
                      ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${!localIsNewer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    <Server className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Server Draft
                      </span>
                      {!localIsNewer && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Most Recent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Saved {formatRelative(serverDate)} from another device
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                </button>
              )}

              {hasConflict && (
                <button
                  onClick={onMerge}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-left transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0">
                    <GitMerge className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-purple-900">
                      Smart Merge
                    </span>
                    <p className="text-sm text-purple-700 mt-0.5">
                      Combine the newest data from both drafts
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Discard Option */}
            <button
              onClick={onDiscard}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Discard draft and start fresh
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DraftRestoreDialog;
