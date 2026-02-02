import { useState, useRef, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  Edit2,
  Key,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Building2,
  Users,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import {
  useLGAs,
  useUsersSummary,
  useLGACoordinator,
  useWardSecretary,
  useUpdateUser,
  useChangeUserPassword,
  useToggleUserAccess,
  useAssignUser,
} from '../hooks/useStateData';
import { getLGAWards } from '../api/users';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

// ---------------------------------------------------------------------------
// Helper: active-rate calculation
// ---------------------------------------------------------------------------
function getActiveRate(s) {
  if (!s) return 0;
  const total = s.total_coordinators + s.total_secretaries;
  const active = s.active_coordinators + s.active_secretaries;
  return total > 0 ? Math.round((active / total) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Sub-component: single summary stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub, colorClass }) {
  return (
    <div className={`${colorClass.bg} rounded-xl p-4 border border-white/60 shadow-sm`}>
      <p className={`text-xs font-semibold ${colorClass.label} uppercase tracking-wider`}>{label}</p>
      <p className={`text-2xl font-bold ${colorClass.value} mt-0.5`}>{value}</p>
      <p className={`text-xs ${colorClass.label} mt-0.5`}>{sub}</p>
    </div>
  );
}

const STAT_COLORS = {
  primary:  { bg: 'bg-primary-50',  label: 'text-primary-600',  value: 'text-primary-800' },
  blue:     { bg: 'bg-blue-50',     label: 'text-blue-600',     value: 'text-blue-800' },
  emerald:  { bg: 'bg-emerald-50',  label: 'text-emerald-600',  value: 'text-emerald-800' },
  violet:   { bg: 'bg-violet-50',   label: 'text-violet-600',   value: 'text-violet-800' },
  amber:    { bg: 'bg-amber-50',    label: 'text-amber-600',    value: 'text-amber-800' },
};

// ---------------------------------------------------------------------------
// Sub-component: empty / placeholder states
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="glass-card rounded-xl border border-white/40 shadow-sm p-12 flex flex-col items-center justify-center text-center h-full">
      <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <Users className="w-8 h-8 text-primary-600" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-1">Select an LGA or Ward</h3>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">
        Browse the LGA tree on the left to view and manage coordinators and WDC secretaries across Kaduna State.
      </p>
    </div>
  );
}

function NoUserState({ type, onAssign }) {
  return (
    <div className="glass-card rounded-xl border border-white/40 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />
      <div className="p-10 flex flex-col items-center justify-center text-center">
        <div
          className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-amber-200"
          style={{ width: 72, height: 72 }}
        >
          <Users className="w-9 h-9 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-800 mb-1.5">No {type} Assigned</h3>
        <p className="text-sm text-neutral-500 max-w-sm leading-relaxed mb-6">
          This {type === 'LGA Coordinator' ? 'LGA' : 'ward'} currently has no {type.toLowerCase()}.
          Assign one now so they can begin reporting on the platform.
        </p>
        <button
          onClick={onAssign}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
            bg-gradient-to-r from-primary-600 to-primary-500
            text-white text-sm font-semibold shadow-md
            hover:shadow-lg hover:from-primary-700 hover:to-primary-600
            transition-all duration-200"
        >
          <UserPlus className="w-4 h-4" />
          Assign {type}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: detailed user profile card (right panel)
// ---------------------------------------------------------------------------
function UserDetailCard({ user, onEdit, onPassword, onAccess, onCopyEmail, copiedEmail }) {
  const isCoordinator = user.role === 'LGA_COORDINATOR';
  const initials = (user.full_name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const formatDate = (val) => {
    if (!val) return 'Never logged in';
    const d = new Date(val);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="glass-card rounded-xl border border-white/40 shadow-sm overflow-hidden">
      {/* ── gradient header ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-7 flex items-center gap-5">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white/30 shadow-md">
          <span className="text-white text-3xl font-bold">{initials}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">{user.full_name}</h2>
          <span
            className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isCoordinator ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {isCoordinator ? 'LGA Coordinator' : 'WDC Secretary'}
          </span>
        </div>
      </div>

      {/* ── info rows ── */}
      <div className="px-6 py-5 space-y-4">
        {/* email */}
        <InfoRow icon={<Mail className="w-4 h-4 text-neutral-500" />} label="Login Username">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-800">{user.email}</span>
            <button
              onClick={onCopyEmail}
              className="p-1 rounded text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Copy email"
            >
              {copiedEmail ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs text-neutral-400 italic">Cannot be changed – this is the login username</p>
        </InfoRow>

        {/* phone */}
        <InfoRow icon={<Phone className="w-4 h-4 text-neutral-500" />} label="Phone Number">
          <span className="text-sm font-medium text-neutral-800">{user.phone || '—'}</span>
        </InfoRow>

        {/* assignment */}
        <InfoRow icon={<MapPin className="w-4 h-4 text-neutral-500" />} label="Assignment">
          <span className="text-sm font-medium text-neutral-800">
            {isCoordinator ? user.lga_name : `${user.ward_name} Ward`}
            {!isCoordinator && user.lga_name && (
              <span className="text-neutral-400 font-normal"> · {user.lga_name} LGA</span>
            )}
          </span>
        </InfoRow>

        {/* status */}
        <InfoRow
          icon={
            user.is_active ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <ShieldOff className="w-4 h-4 text-red-500" />
            )
          }
          label="Access Status"
          iconBg={user.is_active ? 'bg-emerald-50' : 'bg-red-50'}
        >
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
              user.is_active ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-400'}`}
            />
            {user.is_active ? 'Active' : 'Access Revoked'}
          </span>
        </InfoRow>

        {/* last login */}
        <InfoRow icon={<Clock className="w-4 h-4 text-neutral-500" />} label="Last Login">
          <span className="text-sm font-medium text-neutral-800">{formatDate(user.last_login)}</span>
        </InfoRow>
      </div>

      {/* ── actions footer ── */}
      <div className="px-6 py-4 bg-neutral-50/60 border-t border-neutral-100">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Actions</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 text-sm font-medium transition-all shadow-sm"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
          <button
            onClick={onPassword}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 text-sm font-medium transition-all shadow-sm"
          >
            <Key className="w-4 h-4" /> Reset Password
          </button>
          <button
            onClick={onAccess}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all shadow-sm ${
              user.is_active
                ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
            }`}
          >
            {user.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {user.is_active ? 'Revoke Access' : 'Restore Access'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Small reusable info-row inside the user card
function InfoRow({ icon, label, children, iconBg = 'bg-neutral-50' }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-400 uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function StateUsersPage() {
  // ── tree state ──
  const [expandedLGAs, setExpandedLGAs] = useState(new Set());
  const [selectedLGAId, setSelectedLGAId]   = useState(null);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');

  // ward cache – persists ward lists so we only fetch once per LGA
  const [lgaWardsCache, setLgaWardsCache] = useState({});
  const cacheRef = useRef(lgaWardsCache);
  cacheRef.current = lgaWardsCache;

  // ── modal & form state ──
  const [showEditModal, setShowEditModal]         = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm]= useState(false);
  const [showAssignModal, setShowAssignModal]     = useState(false);

  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPw, setShowPw]     = useState(false);
  const [showCfPw, setShowCfPw] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [assignForm, setAssignForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm_password: '',
  });
  const [assignErrors, setAssignErrors] = useState({});
  const [showAssignPw, setShowAssignPw]     = useState(false);
  const [showAssignCfPw, setShowAssignCfPw] = useState(false);

  // ── toast ──
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── data hooks ──
  const { data: summary }  = useUsersSummary();
  const { data: lgasData } = useLGAs();
  const lgas = lgasData?.data?.lgas || lgasData?.lgas || [];

  // coordinator fetched only when an LGA is selected and no ward is selected
  const { data: coordinatorData, isLoading: loadingCoordinator } = useLGACoordinator(
    selectedLGAId && !selectedWardId ? selectedLGAId : null
  );
  // secretary fetched only when a ward is selected
  const { data: secretaryData, isLoading: loadingSecretary } = useWardSecretary(selectedWardId);

  // mutations
  const updateUserMutation       = useUpdateUser();
  const changePasswordMutation   = useChangeUserPassword();
  const toggleAccessMutation     = useToggleUserAccess();
  const assignUserMutation       = useAssignUser();

  // derive the user shown in the right panel
  const selectedUser = selectedWardId
    ? secretaryData?.user || null
    : coordinatorData?.user || null;
  const isLoadingUser = selectedWardId ? loadingSecretary : loadingCoordinator;

  // context objects for the currently selected LGA / ward
  const selectedLGA  = lgas.find((l) => l.id === selectedLGAId) || null;
  const selectedWard = lgaWardsCache[selectedLGAId]?.find((w) => w.id === selectedWardId) || null;

  // ── ward fetching (imperative, cached) ──
  const fetchWardsForLGA = useCallback(async (lgaId) => {
    if (cacheRef.current[lgaId]) return;
    try {
      const wards = await getLGAWards(lgaId);
      setLgaWardsCache((prev) => ({ ...prev, [lgaId]: wards }));
    } catch (err) {
      console.error('Failed to load wards:', err);
    }
  }, []);

  // ── tree interactions ──
  const handleLGAClick = (lga) => {
    const isExpanded = expandedLGAs.has(lga.id);
    if (isExpanded && selectedLGAId === lga.id && !selectedWardId) {
      setExpandedLGAs((prev) => { const s = new Set(prev); s.delete(lga.id); return s; });
    } else {
      if (!isExpanded) {
        setExpandedLGAs((prev) => new Set([...prev, lga.id]));
        fetchWardsForLGA(lga.id);
      }
      setSelectedLGAId(lga.id);
      setSelectedWardId(null);
    }
  };

  const handleWardClick = (ward, lgaId) => {
    setSelectedWardId(ward.id);
    setSelectedLGAId(lgaId);
  };

  // ── modal openers ──
  const openEditModal = () => {
    if (!selectedUser) return;
    setEditForm({ full_name: selectedUser.full_name || '', phone: selectedUser.phone || '' });
    setShowEditModal(true);
  };

  const openPasswordModal = () => {
    setPasswordForm({ new_password: '', confirm_password: '' });
    setPasswordErrors({});
    setShowPw(false);
    setShowCfPw(false);
    setShowPasswordModal(true);
  };

  const openAssignModal = () => {
    // Pre-fill email with convention-based suggestion
    const lgaCode = (selectedLGA?.code || '').toLowerCase();
    let suggestedEmail = '';
    if (selectedWardId && selectedWard) {
      const wardSlug = selectedWard.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      suggestedEmail = `wdc.${lgaCode}.${wardSlug}@kaduna.gov.ng`;
    } else if (selectedLGAId) {
      suggestedEmail = `coord.${lgaCode}@kaduna.gov.ng`;
    }
    setAssignForm({ full_name: '', email: suggestedEmail, phone: '', password: '', confirm_password: '' });
    setAssignErrors({});
    setShowAssignPw(false);
    setShowAssignCfPw(false);
    setShowAssignModal(true);
  };

  // ── modal submit handlers ──
  const handleEditSave = async () => {
    if (!selectedUser || !editForm.full_name.trim()) return;
    try {
      await updateUserMutation.mutateAsync({
        userId: selectedUser.id,
        data: { full_name: editForm.full_name, phone: editForm.phone },
      });
      setShowEditModal(false);
      showToast('User profile updated successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  const handlePasswordSave = async () => {
    const errs = {};
    if (!passwordForm.new_password)
      errs.new_password = 'New password is required';
    else if (passwordForm.new_password.length < 6)
      errs.new_password = 'Password must be at least 6 characters';
    if (passwordForm.new_password !== passwordForm.confirm_password)
      errs.confirm_password = 'Passwords do not match';

    if (Object.keys(errs).length) { setPasswordErrors(errs); return; }

    try {
      await changePasswordMutation.mutateAsync({
        userId: selectedUser.id,
        data: { new_password: passwordForm.new_password },
      });
      setShowPasswordModal(false);
      showToast('Password has been reset successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to reset password.', 'error');
    }
  };

  const handleAccessToggle = async () => {
    try {
      await toggleAccessMutation.mutateAsync({
        userId: selectedUser.id,
        data: { is_active: !selectedUser.is_active },
      });
      setShowRevokeConfirm(false);
      showToast(
        selectedUser.is_active
          ? `Access revoked for ${selectedUser.full_name}.`
          : `Access restored for ${selectedUser.full_name}.`
      );
    } catch (err) {
      showToast(err.message || 'Failed to toggle access.', 'error');
    }
  };

  const handleAssignSave = async () => {
    const errs = {};
    if (!assignForm.full_name.trim())
      errs.full_name = 'Full name is required';
    if (!assignForm.email.trim())
      errs.email = 'Email is required';
    if (!assignForm.phone.trim())
      errs.phone = 'Phone number is required for SMS notifications';
    // Password is optional - will be auto-generated if not provided
    if (assignForm.password && assignForm.password.length < 6)
      errs.password = 'At least 6 characters';
    if (assignForm.password && assignForm.password !== assignForm.confirm_password)
      errs.confirm_password = 'Passwords do not match';

    if (Object.keys(errs).length) { setAssignErrors(errs); return; }

    try {
      const result = await assignUserMutation.mutateAsync({
        full_name: assignForm.full_name,
        email: assignForm.email,
        phone: assignForm.phone,
        password: assignForm.password || undefined,  // Auto-generate if empty
        role: selectedWardId ? 'WDC_SECRETARY' : 'LGA_COORDINATOR',
        lga_id: selectedWardId ? undefined : selectedLGAId,
        ward_id: selectedWardId || undefined,
      });
      setShowAssignModal(false);

      // Show success message with SMS status
      const roleLabel = selectedWardId ? 'WDC Secretary' : 'LGA Coordinator';
      let message = `${roleLabel} assigned successfully.`;

      if (result.sms_sent) {
        message += ' Login credentials sent via SMS.';
      } else if (result.credentials) {
        message += ` Credentials: ${result.credentials.email} / ${result.credentials.password}`;
      }

      showToast(message);
    } catch (err) {
      showToast(err.message || 'Failed to assign user.', 'error');
    }
  };

  const copyEmail = () => {
    if (!selectedUser) return;
    navigator.clipboard.writeText(selectedUser.email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 1500);
    });
  };

  // ── filtered LGAs ──
  const filteredLGAs = lgas.filter(
    (lga) =>
      lga.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lga.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-4 md:p-6 min-h-[calc(100vh-64px)]">
      {/* ── toast notification ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-white text-sm
            flex items-center gap-2 animate-slide-in
            ${toast.type === 'success' ? 'bg-primary-600' : 'bg-red-600'}`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {toast.message}
        </div>
      )}

      {/* ── page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 leading-tight">User Management</h1>
            <p className="text-neutral-500 text-xs">
              Manage LGA Coordinators and WDC Secretaries across Kaduna State
            </p>
          </div>
        </div>
      </div>

      {/* ── summary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total LGAs"
          value={summary?.total_lgas ?? '—'}
          sub={`${summary?.total_wards ?? '—'} Wards`}
          colorClass={STAT_COLORS.primary}
        />
        <StatCard
          label="Coordinators"
          value={`${summary?.total_coordinators ?? 0}/${summary?.total_lgas ?? 23}`}
          sub={
            summary?.unassigned_lgas > 0
              ? `${summary.unassigned_lgas} LGA${summary.unassigned_lgas > 1 ? 's' : ''} unassigned`
              : 'All LGAs covered'
          }
          colorClass={summary?.unassigned_lgas > 0 ? STAT_COLORS.amber : STAT_COLORS.blue}
        />
        <StatCard
          label="WDC Secretaries"
          value={`${summary?.total_secretaries ?? 0}/${summary?.total_wards ?? 255}`}
          sub={
            summary?.unassigned_wards > 0
              ? `${summary.unassigned_wards} Ward${summary.unassigned_wards > 1 ? 's' : ''} unassigned`
              : 'All wards covered'
          }
          colorClass={summary?.unassigned_wards > 0 ? STAT_COLORS.amber : STAT_COLORS.emerald}
        />
        <StatCard
          label="Active Rate"
          value={`${getActiveRate(summary)}%`}
          sub="Platform access"
          colorClass={STAT_COLORS.violet}
        />
      </div>

      {/* ── two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── LEFT: LGA navigation tree ── */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="glass-card rounded-xl border border-white/40 shadow-sm overflow-hidden">
            {/* search */}
            <div className="p-3 border-b border-neutral-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search LGAs…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent placeholder-neutral-400"
                />
              </div>
            </div>

            {/* scrollable LGA list */}
            <div className="max-h-[540px] overflow-y-auto">
              {filteredLGAs.map((lga) => {
                const isExpanded    = expandedLGAs.has(lga.id);
                const isSelectedLGA = selectedLGAId === lga.id && !selectedWardId;
                const wards         = lgaWardsCache[lga.id] || [];
                const wardsLoaded   = lgaWardsCache[lga.id] !== undefined;

                return (
                  <div key={lga.id}>
                    {/* LGA row */}
                    <button
                      onClick={() => handleLGAClick(lga)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-150
                        ${isSelectedLGA
                          ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white'
                          : 'hover:bg-primary-50 text-neutral-700'}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isSelectedLGA ? 'text-white/80' : 'text-neutral-400'}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelectedLGA ? 'text-white/80' : 'text-neutral-400'}`} />
                      )}
                      <Building2 className={`w-4 h-4 flex-shrink-0 ${isSelectedLGA ? 'text-white/80' : 'text-primary-500'}`} />
                      <span className="text-sm font-medium flex-1 truncate">{lga.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isSelectedLGA ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {lga.num_wards}
                      </span>
                    </button>

                    {/* ward rows (visible when expanded) */}
                    {isExpanded && (
                      <div className="bg-neutral-50/50 border-t border-neutral-100/60">
                        {!wardsLoaded && (
                          <div className="py-2.5 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading wards…
                          </div>
                        )}
                        {wardsLoaded && wards.length === 0 && (
                          <p className="py-2 text-xs text-neutral-400 text-center">No wards found</p>
                        )}
                        {wards.map((ward) => {
                          const isSelWard = selectedWardId === ward.id;
                          return (
                            <button
                              key={ward.id}
                              onClick={() => handleWardClick(ward, lga.id)}
                              className={`w-full flex items-center gap-2 pl-9 pr-3 py-2 text-left transition-all duration-150
                                ${isSelWard
                                  ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white'
                                  : 'hover:bg-primary-50 text-neutral-600'}`}
                            >
                              <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelWard ? 'text-white/80' : 'text-neutral-400'}`} />
                              <span className="text-xs font-medium truncate">{ward.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredLGAs.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400">No LGAs match your search</p>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: user detail panel ── */}
        <div className="flex-1 min-w-0">
          {/* nothing selected */}
          {!selectedLGAId && !selectedWardId && <EmptyState />}

          {/* loading */}
          {(selectedLGAId || selectedWardId) && isLoadingUser && (
            <div className="glass-card rounded-xl border border-white/40 shadow-sm p-16 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          )}

          {/* no user assigned → show assign prompt */}
          {!isLoadingUser && (selectedLGAId || selectedWardId) && !selectedUser && (
            <NoUserState
              type={selectedWardId ? 'WDC Secretary' : 'LGA Coordinator'}
              onAssign={openAssignModal}
            />
          )}

          {/* user detail card */}
          {!isLoadingUser && selectedUser && (
            <UserDetailCard
              user={selectedUser}
              onEdit={openEditModal}
              onPassword={openPasswordModal}
              onAccess={() => setShowRevokeConfirm(true)}
              onCopyEmail={copyEmail}
              copiedEmail={copiedEmail}
            />
          )}
        </div>
      </div>

      {/* ================================================================
           MODALS
         ================================================================ */}

      {/* ── Edit Profile Modal ── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User Profile" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
              className="input-base w-full"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              className="input-base w-full"
              placeholder="+234 800 000 0000"
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              The email address is the login username and <strong>cannot be changed</strong>. Only the name
              and phone number are editable here.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleEditSave} loading={updateUserMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Reset Password" size="md">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Set a new password for{' '}
            <span className="font-semibold text-neutral-800">{selectedUser?.full_name}</span>.
            They will need this new password to log in.
          </p>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={passwordForm.new_password}
                onChange={(e) => {
                  setPasswordForm((p) => ({ ...p, new_password: e.target.value }));
                  setPasswordErrors((p) => ({ ...p, new_password: null }));
                }}
                className={`input-base w-full pr-10 ${passwordErrors.new_password ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.new_password && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.new_password}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showCfPw ? 'text' : 'password'}
                value={passwordForm.confirm_password}
                onChange={(e) => {
                  setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }));
                  setPasswordErrors((p) => ({ ...p, confirm_password: null }));
                }}
                className={`input-base w-full pr-10 ${passwordErrors.confirm_password ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowCfPw(!showCfPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showCfPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.confirm_password && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm_password}</p>
            )}
          </div>
          <p className="text-xs text-neutral-400">Password must be at least 6 characters long.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handlePasswordSave} loading={changePasswordMutation.isPending}>
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Revoke / Restore Access Confirmation Modal ── */}
      {showRevokeConfirm && selectedUser && (
        <Modal
          isOpen={showRevokeConfirm}
          onClose={() => setShowRevokeConfirm(false)}
          title={selectedUser.is_active ? 'Revoke Access' : 'Restore Access'}
          size="sm"
        >
          <div className="space-y-4">
            <div
              className={`rounded-lg p-3.5 flex items-start gap-3 ${
                selectedUser.is_active
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  selectedUser.is_active ? 'text-red-500' : 'text-emerald-600'
                }`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${
                    selectedUser.is_active ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {selectedUser.is_active ? 'Revoke Platform Access' : 'Restore Platform Access'}
                </p>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    selectedUser.is_active ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {selectedUser.is_active
                    ? `Revoking access will prevent ${selectedUser.full_name} from logging in. They will
                       not be able to submit reports or access any features until access is restored.`
                    : `Restoring access will allow ${selectedUser.full_name} to log back in and resume
                       their duties immediately.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRevokeConfirm(false)}>Cancel</Button>
              <Button
                variant={selectedUser.is_active ? 'danger' : 'success'}
                size="sm"
                onClick={handleAccessToggle}
                loading={toggleAccessMutation.isPending}
              >
                {selectedUser.is_active ? 'Revoke Access' : 'Restore Access'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign User Modal ── */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign ${selectedWardId ? 'WDC Secretary' : 'LGA Coordinator'}`}
        size="md"
      >
        <div className="space-y-4">
          {/* context badge – shows which LGA / ward is being filled */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-primary-50 border border-primary-200 rounded-lg">
            <Building2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-primary-500 uppercase tracking-wider font-semibold">
                {selectedWardId ? 'Ward' : 'LGA'}
              </p>
              <p className="text-sm font-semibold text-primary-800">
                {selectedWardId ? selectedWard?.name : selectedLGA?.name}
                {selectedWardId && selectedLGA && (
                  <span className="text-primary-500 font-normal"> · {selectedLGA.name} LGA</span>
                )}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assignForm.full_name}
              onChange={(e) => {
                setAssignForm((p) => ({ ...p, full_name: e.target.value }));
                setAssignErrors((p) => ({ ...p, full_name: null }));
              }}
              className={`input-base w-full ${assignErrors.full_name ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="e.g. Dr. Fatima Abubakar Yusuf"
            />
            {assignErrors.full_name && (
              <p className="text-xs text-red-500 mt-1">{assignErrors.full_name}</p>
            )}
          </div>

          {/* Email / Login Username */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Login Username (Email) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={assignForm.email}
              onChange={(e) => {
                setAssignForm((p) => ({ ...p, email: e.target.value }));
                setAssignErrors((p) => ({ ...p, email: null }));
              }}
              className={`input-base w-full ${assignErrors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="e.g. coord.chk@kaduna.gov.ng"
            />
            {assignErrors.email && (
              <p className="text-xs text-red-500 mt-1">{assignErrors.email}</p>
            )}
            <p className="text-xs text-neutral-400 mt-1">
              This will be their permanent login username and cannot be changed later.
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={assignForm.phone}
              onChange={(e) => {
                setAssignForm((p) => ({ ...p, phone: e.target.value }));
                setAssignErrors((p) => ({ ...p, phone: null }));
              }}
              className={`input-base w-full ${assignErrors.phone ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="+234 800 000 0000"
            />
            {assignErrors.phone && (
              <p className="text-xs text-red-500 mt-1">{assignErrors.phone}</p>
            )}
            <p className="text-xs text-neutral-400 mt-1">
              Login credentials will be sent via SMS to this number.
            </p>
          </div>

          {/* Password + Confirm side by side */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
            <p className="text-xs text-blue-700">
              <strong>Optional:</strong> Leave password blank to auto-generate a secure password.
              It will be sent via SMS to the phone number above.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Password <span className="text-neutral-400">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type={showAssignPw ? 'text' : 'password'}
                  value={assignForm.password}
                  onChange={(e) => {
                    setAssignForm((p) => ({ ...p, password: e.target.value }));
                    setAssignErrors((p) => ({ ...p, password: null }));
                  }}
                  className={`input-base w-full pr-10 ${assignErrors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="Auto-generated if blank"
                />
                <button
                  type="button"
                  onClick={() => setShowAssignPw(!showAssignPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showAssignPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {assignErrors.password && (
                <p className="text-xs text-red-500 mt-1">{assignErrors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm Password <span className="text-neutral-400">(if provided)</span>
              </label>
              <div className="relative">
                <input
                  type={showAssignCfPw ? 'text' : 'password'}
                  value={assignForm.confirm_password}
                  onChange={(e) => {
                    setAssignForm((p) => ({ ...p, confirm_password: e.target.value }));
                    setAssignErrors((p) => ({ ...p, confirm_password: null }));
                  }}
                  className={`input-base w-full pr-10 ${assignErrors.confirm_password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowAssignCfPw(!showAssignCfPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showAssignCfPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {assignErrors.confirm_password && (
                <p className="text-xs text-red-500 mt-1">{assignErrors.confirm_password}</p>
              )}
            </div>
          </div>

          {/* action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAssignSave} loading={assignUserMutation.isPending}>
              <UserPlus className="w-4 h-4" />
              {' '}Assign {selectedWardId ? 'Secretary' : 'Coordinator'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
