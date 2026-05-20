import { useState, useEffect } from 'react';
import {
    Cloud,
    CloudOff,
    Save,
    Check,
    AlertTriangle,
    Loader2,
    Upload,
    RefreshCw,
} from 'lucide-react';

/**
 * Visual status bar showing draft status, online/offline state, and sync progress.
 * 
 * @param {Object} props Component props
 * @param {string} props.draftStatus Draft status: idle | saving | saved | error
 * @param {Date} props.lastSavedAt Last saved timestamp
 * @param {boolean} props.isOnline Whether device is online
 * @param {Object} props.queueStats Queue statistics { queued, syncing, failed, total }
 * @param {boolean} props.isSyncing Whether queue is currently syncing
 * @param {Function} props.onForceSave Callback for manual save
 * @param {Function} props.onRetryFailed Callback to retry failed submissions
 */
const DraftStatusBar = ({
    draftStatus = 'idle',
    lastSavedAt,
    isOnline = true,
    queueStats = { queued: 0, syncing: 0, failed: 0, total: 0 },
    isSyncing = false,
    onForceSave,
    onRetryFailed,
}) => {
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    // Show brief "saved" animation
    useEffect(() => {
        if (draftStatus === 'saved') {
            setShowSaveSuccess(true);
            const timer = setTimeout(() => setShowSaveSuccess(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [draftStatus, lastSavedAt]);

    // Format relative time
    const formatRelativeTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = Math.floor((now - new Date(date)) / 1000);

        if (diff < 5) return 'just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(date).toLocaleDateString();
    };

    // Get status display config
    const getStatusConfig = () => {
        if (!isOnline) {
            return {
                icon: CloudOff,
                text: 'Offline - Changes saved locally',
                className: 'bg-amber-50 text-amber-700 border-amber-200',
                iconClassName: 'text-amber-500',
            };
        }

        if (queueStats.syncing > 0 || isSyncing) {
            return {
                icon: Upload,
                text: `Syncing ${queueStats.syncing || queueStats.queued} submission${queueStats.syncing > 1 ? 's' : ''}...`,
                className: 'bg-blue-50 text-blue-700 border-blue-200',
                iconClassName: 'text-blue-500 animate-pulse',
            };
        }

        if (queueStats.queued > 0) {
            return {
                icon: Cloud,
                text: `${queueStats.queued} queued for sync`,
                className: 'bg-blue-50 text-blue-700 border-blue-200',
                iconClassName: 'text-blue-500',
            };
        }

        if (queueStats.failed > 0) {
            return {
                icon: AlertTriangle,
                text: `${queueStats.failed} failed - `,
                className: 'bg-red-50 text-red-700 border-red-200',
                iconClassName: 'text-red-500',
                action: { label: 'Retry', onClick: onRetryFailed },
            };
        }

        if (draftStatus === 'saving') {
            return {
                icon: Loader2,
                text: 'Saving...',
                className: 'bg-neutral-50 text-neutral-600 border-neutral-200',
                iconClassName: 'text-neutral-400 animate-spin',
            };
        }

        if (draftStatus === 'saved' || showSaveSuccess) {
            return {
                icon: Check,
                text: `Saved ${formatRelativeTime(lastSavedAt)}`,
                className: 'bg-green-50 text-green-700 border-green-200',
                iconClassName: 'text-green-500',
            };
        }

        if (draftStatus === 'error') {
            return {
                icon: AlertTriangle,
                text: 'Failed to save',
                className: 'bg-red-50 text-red-700 border-red-200',
                iconClassName: 'text-red-500',
            };
        }

        // Default: idle
        return {
            icon: Save,
            text: 'Draft',
            className: 'bg-neutral-50 text-neutral-500 border-neutral-200',
            iconClassName: 'text-neutral-400',
        };
    };

    const config = getStatusConfig();
    const StatusIcon = config.icon;

    return (
        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${config.className}`}>
            <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 flex-shrink-0 ${config.iconClassName}`} />
                <span className="font-medium">
                    {config.text}
                    {config.action && (
                        <button
                            onClick={config.action.onClick}
                            className="underline hover:no-underline ml-1"
                        >
                            {config.action.label}
                        </button>
                    )}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {/* Online/Offline indicator */}
                {isOnline ? (
                    <span className="flex items-center gap-1 text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span className="hidden sm:inline">Online</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="hidden sm:inline">Offline</span>
                    </span>
                )}

                {/* Manual save button */}
                {onForceSave && (
                    <button
                        onClick={onForceSave}
                        disabled={draftStatus === 'saving'}
                        className="p-1 hover:bg-white/50 rounded transition-colors disabled:opacity-50"
                        title="Save now"
                    >
                        {draftStatus === 'saving' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default DraftStatusBar;
