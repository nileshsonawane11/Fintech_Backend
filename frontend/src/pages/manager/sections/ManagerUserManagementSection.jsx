import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';

import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Field,
  EmptyState,
  PageLoading,
  Modal,
  Table,
  StatusChip,
  useToast,
} from '../../../components/ui.jsx';

import { formatDateTime, maskPan } from '../../../lib/format.js';
import {
  listUnifiedUsers,
  getUserDetail,
  createInternalUser,
  updateUserStatus,
  updateUserOverrides,
  updateUserRoles,
  PERMISSION_CATALOGUE,
} from '../../../services/managerBridge.js';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Search,
  Plus,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Check,
  Mail,
  Phone,
  Briefcase,
  Sliders,
} from 'lucide-react';

export default function ManagerUserManagementSection() {
  const { managerUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected User for Drawer
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerDetail, setDrawerDetail] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState('profile'); // 'profile' | 'overrides' | 'audit'

  // Permission Overrides editing in Drawer
  const [stagedOverrides, setStagedOverrides] = useState({});
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Role Assignment Modal (Module 52 A.9)
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRoleForUser, setSelectedRoleForUser] = useState('');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [roleChangeError, setRoleChangeError] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Status Action Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Create Internal User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmAdminModalOpen, setConfirmAdminModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    roleType: 'OPERATIONS',
    specificRole: 'ACCOUNT_OPS',
    fullName: '',
    email: '',
    password: '',
    employeeCode: '',
    department: 'Operations',
    designation: 'Operations Specialist',
    reportingManager: 'Devendra Singhania (STF-001)',
  });
  const [adminConfirmInput, setAdminConfirmInput] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const isAdmin = managerUser?.role === 'ADMIN';

  const loadUsers = async () => {
    traceData('ManagerUserManagement');
    try {
      setLoading(true);
      setError('');
      const list = await listUnifiedUsers();
      setUsers(list);
    } catch (e) {
      setError(e.detail || e.message || 'Could not load users directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openDrawer = async (user) => {
    setSelectedUser(user);
    setDrawerTab('profile');
    setStagedOverrides(user.permissionOverrides ? { ...user.permissionOverrides } : {});
    setDrawerLoading(true);
    try {
      const detail = await getUserDetail(user.id, user.type);
      setDrawerDetail(detail);
      if (detail?.user?.permissionOverrides) {
        setStagedOverrides({ ...detail.user.permissionOverrides });
      }
    } catch (e) {
      toast({ tone: 'error', title: 'Error', body: e.detail || 'Could not load user details.' });
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedUser(null);
    setDrawerDetail(null);
    setStagedOverrides({});
    setOverrideReason('');
  };

  useEffect(() => {
    if (!selectedUser) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !overrideModalOpen && !roleModalOpen && !statusModalOpen) {
        closeDrawer();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedUser, overrideModalOpen, roleModalOpen, statusModalOpen]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (typeFilter !== 'ALL' && u.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [u.name, u.email, u.id, u.mobile, u.role, u.roleTitle]
        .map((v) => (v || '').toLowerCase());
      return haystack.some((v) => v.includes(q));
    });
  }, [users, search, typeFilter, statusFilter]);

  // Compute stats
  const stats = useMemo(() => {
    if (!users) return { total: 0, customers: 0, staff: 0, activeStaff: 0 };
    return {
      total: users.length,
      customers: users.filter((u) => u.type === 'CUSTOMER').length,
      staff: users.filter((u) => u.type === 'STAFF').length,
      activeStaff: users.filter((u) => u.type === 'STAFF' && u.status === 'ACTIVE').length,
    };
  }, [users]);

  // Grouped Permissions catalogue
  const groupedPermissions = useMemo(() => {
    const map = new Map();
    for (const p of PERMISSION_CATALOGUE) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module).push(p);
    }
    return [...map.entries()].map(([module, perms]) => ({ module, perms }));
  }, []);

  // Compute live effective permissions for the drawer user based on staged overrides
  const effectivePermissionsSummary = useMemo(() => {
    if (!selectedUser || selectedUser.type !== 'STAFF') return [];
    const baseGrants = new Set(selectedUser.permissions || []);
    const items = [];

    PERMISSION_CATALOGUE.forEach((p) => {
      const overrideVal = stagedOverrides[p.code];
      const hasBase = baseGrants.has(p.code);
      let isEffective = false;
      let source = 'None';

      if (overrideVal === 'DENY') {
        isEffective = false;
        source = 'Denied by User Override';
      } else if (overrideVal === 'ALLOW') {
        isEffective = true;
        source = 'Granted by User Override';
      } else if (hasBase) {
        isEffective = true;
        source = `Granted by Role (${selectedUser.roleTitle || selectedUser.role})`;
      }

      items.push({
        code: p.code,
        label: p.label,
        module: p.module,
        isEffective,
        overrideVal: overrideVal || 'INHERIT',
        source,
      });
    });

    return items;
  }, [selectedUser, stagedOverrides]);

  const hasOverrideChanges = useMemo(() => {
    if (!selectedUser) return false;
    const original = selectedUser.permissionOverrides || {};
    const allKeys = new Set([...Object.keys(original), ...Object.keys(stagedOverrides)]);
    for (const k of allKeys) {
      const orig = original[k] || 'INHERIT';
      const staged = stagedOverrides[k] || 'INHERIT';
      if (orig !== staged) return true;
    }
    return false;
  }, [selectedUser, stagedOverrides]);

  const isSelf = Boolean(
    selectedUser &&
    managerUser &&
    (selectedUser.id === managerUser.staffId ||
      selectedUser.id === managerUser.id ||
      (selectedUser.email && managerUser.email && selectedUser.email.toLowerCase() === managerUser.email.toLowerCase()))
  );

  const handleRoleUpdate = async () => {
    if (!roleChangeReason.trim()) {
      setRoleChangeError('A reason is mandatory for changing a user role.');
      return;
    }
    setUpdatingRole(true);
    setRoleChangeError('');
    try {
      await updateUserRoles(selectedUser.id, selectedRoleForUser, roleChangeReason.trim());
      toast({
        title: 'Role Updated',
        body: `Assigned ${selectedRoleForUser} role to ${selectedUser.name}. Written to audit log.`,
      });
      setRoleModalOpen(false);
      setRoleChangeReason('');
      await loadUsers();
      const updated = await getUserDetail(selectedUser.id, selectedUser.type);
      setDrawerDetail(updated);
      setSelectedUser(updated.user);
    } catch (e) {
      setRoleChangeError(e.detail || e.message || 'Failed to update user role.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleSaveOverrides = async () => {
    if (!overrideReason.trim()) {
      toast({ tone: 'error', title: 'Reason Required', body: 'A reason is required to update permission overrides.' });
      return;
    }
    traceForm('UserOverridesUpdate', { staffId: selectedUser.id, overrides: stagedOverrides });
    setSavingOverrides(true);
    try {
      await updateUserOverrides(selectedUser.id, stagedOverrides, overrideReason.trim());
      toast({ title: 'Overrides Updated', body: `Security overrides applied for ${selectedUser.name}. Written to audit log.` });
      setOverrideModalOpen(false);
      setOverrideReason('');
      await loadUsers();
      const updated = await getUserDetail(selectedUser.id, selectedUser.type);
      setDrawerDetail(updated);
      setSelectedUser(updated.user);
    } catch (e) {
      toast({ tone: 'error', title: 'Update Failed', body: e.detail || e.message });
    } finally {
      setSavingOverrides(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusReason.trim()) {
      setStatusError('A reason is mandatory for activating or deactivating a user.');
      return;
    }
    setUpdatingStatus(true);
    try {
      await updateUserStatus(selectedUser.id, selectedUser.type, targetStatus, statusReason.trim());
      toast({
        title: `User ${targetStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'}`,
        body: `${selectedUser.name}'s account is now ${targetStatus}.`,
      });
      setStatusModalOpen(false);
      setStatusReason('');
      setStatusError('');
      await loadUsers();
      const updated = await getUserDetail(selectedUser.id, selectedUser.type);
      setDrawerDetail(updated);
      setSelectedUser(updated.user);
    } catch (e) {
      setStatusError(e.detail || e.message || 'Status update failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      setCreateError('Full name and email are mandatory.');
      return;
    }
    if (createForm.roleType === 'ADMIN') {
      setConfirmAdminModalOpen(true);
      return;
    }
    executeCreateUser();
  };

  const executeCreateUser = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await createInternalUser({
        ...createForm,
        role: createForm.roleType,
      });
      toast({
        title: 'Staff User Materialized',
        body: `Created ${createForm.fullName} (${createForm.email}) with ${createForm.roleType} clearance.`,
      });
      setCreateModalOpen(false);
      setConfirmAdminModalOpen(false);
      setAdminConfirmInput('');
      setCreateForm({
        roleType: 'OPERATIONS',
        specificRole: 'ACCOUNT_OPS',
        fullName: '',
        email: '',
        password: '',
        employeeCode: '',
        department: 'Operations',
        designation: 'Operations Specialist',
        reportingManager: 'Devendra Singhania (STF-001)',
      });
      loadUsers();
    } catch (e) {
      setCreateError(e.detail || e.message || 'Failed to create internal user.');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'User & Identifier',
      render: (u) => (
        <div>
          <p className="font-semibold text-ink-900 flex items-center gap-1.5">
            {u.name || '—'}
            {isSelf && u.id === selectedUser?.id && (
              <span className="text-xs text-gold-600 font-medium">(you)</span>
            )}
          </p>
          <p className="font-mono text-xs text-ink-500">{u.id}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Directory Type',
      render: (u) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            u.type === 'STAFF'
              ? 'bg-purple-100 text-purple-800 border border-purple-200'
              : 'bg-midnight-100 text-midnight-800 border border-midnight-200'
          }`}
        >
          {u.type === 'STAFF' ? 'Internal Staff' : 'Retail Customer'}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email & Contact',
      render: (u) => (
        <div>
          <p className="text-xs text-ink-800">{u.email || '—'}</p>
          <p className="text-xs text-ink-500">{u.mobile || '—'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Assigned Clearance',
      render: (u) => (
        <div>
          <span className="font-medium text-xs text-ink-900">{u.roleTitle || u.role}</span>
          {u.department && <p className="text-xs text-ink-500">{u.department}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Account Status',
      render: (u) => <StatusChip status={u.status} />,
    },
    {
      key: 'kyc',
      label: 'KYC Status',
      render: (u) =>
        u.type === 'CUSTOMER' ? <StatusChip status={u.kycStatus} /> : <span className="text-xs text-ink-400">—</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (u) => (
        <Button size="sm" variant="secondary" onClick={() => openDrawer(u)}>
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        titleAs="h1"
        eyebrow="Administration"
        title="User Management"
        description="Unified directory of customers and internal staff. Manage account status, clearance roles, and granular permission overrides with strict RBAC non-repudiation."
        action={
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Internal User
          </Button>
        }
      />

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card className="p-3 bg-white border border-ink-100">
          <p className="text-xs text-ink-500 font-medium">Total Directory Users</p>
          <p className="text-xl font-bold text-midnight-950 mt-1">{stats.total}</p>
        </Card>
        <Card className="p-3 bg-white border border-ink-100">
          <p className="text-xs text-ink-500 font-medium">Retail Customers</p>
          <p className="text-xl font-bold text-midnight-950 mt-1">{stats.customers}</p>
        </Card>
        <Card className="p-3 bg-white border border-ink-100">
          <p className="text-xs text-ink-500 font-medium">Total Staff Clearance</p>
          <p className="text-xl font-bold text-midnight-950 mt-1">{stats.staff}</p>
        </Card>
        <Card className="p-3 bg-white border border-ink-100">
          <p className="text-xs text-ink-500 font-medium">Active Staff Duty</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{stats.activeStaff}</p>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px_180px] sm:items-end">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search by name, email, CIF, staff ID, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <Field label="User Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
            <option value="ALL">All Directory Users</option>
            <option value="CUSTOMER">Retail Customers</option>
            <option value="STAFF">Internal Staff</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled / Inactive</option>
          </Select>
        </Field>
      </div>

      {filteredUsers && (
        <p className="mb-3 text-xs text-ink-500" aria-live="polite">
          Showing {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
        </p>
      )}

      {error ? (
        <EmptyState variant="error" icon={Users} title="Could not load users directory" body={error} />
      ) : loading ? (
        <PageLoading />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users match your criteria"
          body="Try clearing the search query or adjusting your filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={filteredUsers}
            rowKey={(u) => u.id}
            onRowClick={(u) => openDrawer(u)}
          />
        </div>
      )}

      {/* USER DRAWER (Right sheet) */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-midnight-950/40 backdrop-blur-xs transition-opacity"
          onClick={closeDrawer}
        >
          <div
            className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`User Details: ${selectedUser.name}`}
          >
            {/* Pinned Drawer Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-ink-100 bg-porcelain-50 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-midnight-950">
                    {selectedUser.name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedUser.type === 'STAFF' ? 'bg-purple-100 text-purple-800' : 'bg-midnight-100 text-midnight-800'
                    }`}
                  >
                    {selectedUser.type === 'STAFF' ? 'Staff' : 'Customer'}
                  </span>
                  <StatusChip status={selectedUser.status} />
                </div>
                <p className="text-xs text-ink-500 mt-0.5 font-mono">
                  {selectedUser.id} · {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                aria-label="Close user drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="shrink-0 flex border-b border-ink-200 bg-porcelain-50 px-6 pt-2 gap-4">
              <button
                type="button"
                onClick={() => setDrawerTab('profile')}
                className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  drawerTab === 'profile'
                    ? 'border-gold-500 text-midnight-950'
                    : 'border-transparent text-ink-500 hover:text-ink-800'
                }`}
              >
                Profile & Identity
              </button>
              {selectedUser.type === 'STAFF' && (
                <button
                  type="button"
                  onClick={() => setDrawerTab('overrides')}
                  className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                    drawerTab === 'overrides'
                      ? 'border-gold-500 text-midnight-950'
                      : 'border-transparent text-ink-500 hover:text-ink-800'
                  }`}
                >
                  Permission Overrides & Effective Set
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerTab('audit')}
                className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  drawerTab === 'audit'
                    ? 'border-gold-500 text-midnight-950'
                    : 'border-transparent text-ink-500 hover:text-ink-800'
                }`}
              >
                User Audit Trail
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {drawerLoading ? (
                <PageLoading />
              ) : (
                <>
                  {/* TAB 1: PROFILE & IDENTITY */}
                  {drawerTab === 'profile' && (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-ink-100 p-4 bg-porcelain-50/60">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
                          Identity & Contact Block
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-ink-500 font-medium">Full Legal Name</p>
                            <p className="font-semibold text-ink-900 mt-0.5">{selectedUser.name}</p>
                          </div>
                          <div>
                            <p className="text-ink-500 font-medium">Corporate / User ID</p>
                            <p className="font-mono text-ink-900 mt-0.5">{selectedUser.id}</p>
                          </div>
                          <div>
                            <p className="text-ink-500 font-medium">Email Address</p>
                            <p className="text-ink-900 mt-0.5">{selectedUser.email}</p>
                          </div>
                          <div>
                            <p className="text-ink-500 font-medium">Contact Phone</p>
                            <p className="text-ink-900 mt-0.5">{selectedUser.mobile || '—'}</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <p className="text-ink-500 font-medium">Clearance / Role</p>
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRoleForUser(selectedUser.role || 'CUSTOMER');
                                    setRoleChangeReason('');
                                    setRoleChangeError('');
                                    setRoleModalOpen(true);
                                  }}
                                  className="text-xs font-semibold text-gold-700 hover:text-gold-900 hover:underline"
                                >
                                  Change Role
                                </button>
                              )}
                            </div>
                            <p className="font-semibold text-ink-900 mt-0.5">
                              {selectedUser.roleTitle || selectedUser.role}
                            </p>
                          </div>
                          <div>
                            <p className="text-ink-500 font-medium">Account Status</p>
                            <div className="mt-0.5">
                              <StatusChip status={selectedUser.status} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Type-Specific Profile Block */}
                      {selectedUser.type === 'CUSTOMER' ? (
                        <div className="rounded-xl border border-ink-100 p-4 bg-white">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
                            Customer CIF Profile
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-ink-500 font-medium">Customer CIF Number</p>
                              <p className="font-mono font-semibold text-midnight-950 mt-0.5">
                                {selectedUser.customerId}
                              </p>
                            </div>
                            <div>
                              <p className="text-ink-500 font-medium">PAN Number</p>
                              <p className="font-mono text-ink-900 mt-0.5">
                                {maskPan(selectedUser.pan)}
                              </p>
                            </div>
                            <div>
                              <p className="text-ink-500 font-medium">KYC Compliance Status</p>
                              <div className="mt-0.5">
                                <StatusChip status={selectedUser.kycStatus} />
                              </div>
                            </div>
                            <div>
                              <p className="text-ink-500 font-medium">Risk Category</p>
                              <p className="font-semibold text-ink-900 mt-0.5">
                                {selectedUser.riskCategory || 'LOW'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-ink-100 p-4 bg-white">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
                            Internal Staff Clearance Profile
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-ink-500 font-medium">Department</p>
                              <p className="font-semibold text-ink-900 mt-0.5">{selectedUser.department}</p>
                            </div>
                            <div>
                              <p className="text-ink-500 font-medium">Designation</p>
                              <p className="text-ink-900 mt-0.5">{selectedUser.designation || selectedUser.roleTitle}</p>
                            </div>
                            {selectedUser.employeeCode && (
                              <div>
                                <p className="text-ink-500 font-medium">Employee Code</p>
                                <p className="font-mono text-ink-900 mt-0.5">{selectedUser.employeeCode}</p>
                              </div>
                            )}
                            {selectedUser.managerCode && (
                              <div>
                                <p className="text-ink-500 font-medium">Branch Manager Code</p>
                                <p className="font-mono text-ink-900 mt-0.5">{selectedUser.managerCode}</p>
                              </div>
                            )}
                            {selectedUser.adminCode && (
                              <div>
                                <p className="text-ink-500 font-medium">Administrator Code</p>
                                <p className="font-mono text-ink-900 mt-0.5">{selectedUser.adminCode}</p>
                              </div>
                            )}
                            {selectedUser.reportingManager && (
                              <div>
                                <p className="text-ink-500 font-medium">Reporting Supervisor</p>
                                <p className="text-ink-900 mt-0.5">{selectedUser.reportingManager}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-ink-500 font-medium">Last Login</p>
                              <p className="text-ink-900 mt-0.5">{formatDateTime(selectedUser.lastLogin)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PERMISSION OVERRIDES & EFFECTIVE SET */}
                  {drawerTab === 'overrides' && selectedUser.type === 'STAFF' && (
                    <div className="space-y-6">
                      {isSelf && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-900">Self-Escalation Prohibited</p>
                            <p className="mt-0.5">
                              Spec §7 rule: Nobody can modify their own clearance roles or permissions. Privileges for this account must be adjusted by an independent Administrator.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Live Effective Permissions Summary Card */}
                      <div className="rounded-xl border border-midnight-100 bg-midnight-950/5 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-midnight-900 flex items-center gap-1.5">
                            <Sliders className="h-4 w-4 text-gold-600" />
                            Live Effective Authorisation Set (Spec §8)
                          </h3>
                          <span className="text-xs font-bold text-midnight-950">
                            {effectivePermissionsSummary.filter((p) => p.isEffective).length} of 23 Granted
                          </span>
                        </div>
                        <p className="text-xs text-ink-600 leading-relaxed mb-3">
                          Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-ink-200 text-midnight-900 font-mono">(Role Grants ∪ User ALLOWs) − User DENYs</code>. DENY always wins.
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-ink-200">
                          {effectivePermissionsSummary
                            .filter((p) => p.isEffective)
                            .map((p) => (
                              <span
                                key={p.code}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  p.overrideVal === 'ALLOW'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-porcelain-100 text-ink-800 border border-ink-200'
                                }`}
                                title={p.source}
                              >
                                {p.code}
                                {p.overrideVal === 'ALLOW' && <span className="ml-1 text-xs text-emerald-600 font-bold">+ALLOW</span>}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Override Selectors grouped by Module */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-ink-800 uppercase tracking-wider">
                            Granular Permission Overrides
                          </h3>
                          {hasOverrideChanges && !isSelf && (
                            <Button size="sm" variant="primary" onClick={() => setOverrideModalOpen(true)}>
                              Apply Overrides
                            </Button>
                          )}
                        </div>

                        {groupedPermissions.map(({ module, perms }) => (
                          <div key={module} className="rounded-lg border border-ink-200 overflow-hidden">
                            <div className="bg-porcelain-100 px-3.5 py-2 text-xs font-semibold text-ink-700">
                              {module}
                            </div>
                            <div className="divide-y divide-ink-100 bg-white">
                              {perms.map((p) => {
                                const currentOverride = stagedOverrides[p.code] || 'INHERIT';
                                return (
                                  <div key={p.code} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                                    <div>
                                      <p className="font-medium text-ink-900">{p.label}</p>
                                      <p className="font-mono text-xs text-ink-500">{p.code}</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-porcelain-100 p-0.5 rounded-lg border border-ink-200">
                                      <button
                                        type="button"
                                        disabled={isSelf}
                                        onClick={() => {
                                          const next = { ...stagedOverrides };
                                          delete next[p.code];
                                          setStagedOverrides(next);
                                        }}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          currentOverride === 'INHERIT'
                                            ? 'bg-white text-ink-900 shadow-xs'
                                            : 'text-ink-500 hover:text-ink-900'
                                        }`}
                                      >
                                        Inherit
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSelf}
                                        onClick={() =>
                                          setStagedOverrides({
                                            ...stagedOverrides,
                                            [p.code]: 'ALLOW',
                                          })
                                        }
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          currentOverride === 'ALLOW'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-ink-500 hover:text-emerald-700'
                                        }`}
                                      >
                                        Allow
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSelf}
                                        onClick={() =>
                                          setStagedOverrides({
                                            ...stagedOverrides,
                                            [p.code]: 'DENY',
                                          })
                                        }
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          currentOverride === 'DENY'
                                            ? 'bg-danger-600 text-white shadow-xs'
                                            : 'text-ink-500 hover:text-danger-700'
                                        }`}
                                      >
                                        Deny
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: USER AUDIT TRAIL */}
                  {drawerTab === 'audit' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                        Historical Security & Decision Events
                      </h3>
                      {!drawerDetail?.auditTrail || drawerDetail.auditTrail.length === 0 ? (
                        <p className="text-xs text-ink-500 py-6 text-center">
                          No audit events recorded for this user identity yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {drawerDetail.auditTrail.map((ev, i) => (
                            <div key={i} className="p-3 rounded-lg border border-ink-200 bg-porcelain-50/50 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-semibold text-midnight-950">{ev.action}</span>
                                <span className="text-ink-500">{formatDateTime(ev.at || ev.timestamp)}</span>
                              </div>
                              <p className="text-ink-700 leading-relaxed">{ev.detail || 'Operational event'}</p>
                              <div className="mt-2 text-xs text-ink-500 flex items-center justify-between border-t border-ink-100 pt-1.5">
                                <span>Actor: {ev.actor}</span>
                                <StatusChip status={ev.outcome || ev.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pinned Drawer Footer */}
            <div className="shrink-0 flex items-center justify-between border-t border-ink-200 bg-porcelain-50 px-6 py-3.5">
              <div>
                {!isSelf && (
                  <Button
                    size="sm"
                    variant={selectedUser.status === 'ACTIVE' ? 'danger' : 'secondary'}
                    onClick={() => {
                      setTargetStatus(selectedUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE');
                      setStatusReason('');
                      setStatusError('');
                      setStatusModalOpen(true);
                    }}
                  >
                    {selectedUser.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                  </Button>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={closeDrawer}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REASON MODAL FOR PERMISSION OVERRIDES */}
      {overrideModalOpen && (
        <Modal
          isOpen={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          title="Confirm Permission Overrides"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              Updating permission overrides directly alters the effective clearance capabilities for{' '}
              <strong>{selectedUser?.name}</strong>. A mandatory reason is required for compliance audit logging.
            </p>
            <Field label="Governance Reason / Change Ticket" required error={!overrideReason.trim() ? '' : null}>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Q4 supervisory cross-coverage authorized by Risk Committee CR-9921"
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={3}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOverrideModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={savingOverrides} onClick={handleSaveOverrides}>
                Save Overrides
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* STATUS CHANGE MODAL */}
      {statusModalOpen && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Confirm Account ${targetStatus === 'ACTIVE' ? 'Activation' : 'Deactivation'}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              You are about to set status to <strong>{targetStatus}</strong> for <strong>{selectedUser?.name}</strong>.
              {targetStatus === 'DISABLED' && ' The user will immediately be barred from signing in.'}
            </p>
            {statusError && (
              <div className="p-2.5 rounded bg-danger-50 border border-danger-200 text-danger-700">
                {statusError}
              </div>
            )}
            <Field label="Mandatory Reason" required>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="State the governance justification..."
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={3}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={targetStatus === 'ACTIVE' ? 'primary' : 'danger'}
                loading={updatingStatus}
                onClick={handleStatusUpdate}
              >
                Confirm {targetStatus === 'ACTIVE' ? 'Activation' : 'Deactivation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE INTERNAL USER MODAL */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Internal Staff User"
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            {createError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 text-xs">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Clearance Role Type" required>
                <Select
                  value={createForm.roleType}
                  onChange={(e) => {
                    const rt = e.target.value;
                    let dept = 'Operations';
                    let desig = 'Operations Specialist';
                    if (rt === 'ADMIN') {
                      dept = 'Platform Administration';
                      desig = 'System Administrator';
                    } else if (rt === 'BANK_MANAGER') {
                      dept = 'Branch Operations';
                      desig = 'Branch Manager';
                    }
                    setCreateForm({
                      ...createForm,
                      roleType: rt,
                      department: dept,
                      designation: desig,
                    });
                  }}
                >
                  <option value="OPERATIONS">Operations Specialist (Branch Ops)</option>
                  <option value="BANK_MANAGER" disabled={!isAdmin}>
                    Branch Manager {!isAdmin ? '(Admin Only)' : ''}
                  </option>
                  <option value="ADMIN" disabled={!isAdmin}>
                    System Administrator {!isAdmin ? '(Admin Only)' : ''}
                  </option>
                </Select>
              </Field>

              {createForm.roleType === 'OPERATIONS' && (
                <Field label="Specific Operations Stream">
                  <Select
                    value={createForm.specificRole}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        specificRole: e.target.value,
                        designation: e.target.value.replace('_', ' '),
                      })
                    }
                  >
                    <option value="ACCOUNT_OPS">Account & Card Operations (ACCOUNT_OPS)</option>
                    <option value="KYC_OFFICER">KYC Verification Officer (KYC_OFFICER)</option>
                    <option value="CUSTOMER_SUPPORT">Customer Support Lead (CUSTOMER_SUPPORT)</option>
                    <option value="AUDIT_COMPLIANCE">Internal Auditor (AUDIT_COMPLIANCE)</option>
                  </Select>
                </Field>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Legal Name" required>
                <Input
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Priya Nair"
                  required
                />
              </Field>
              <Field label="Corporate Email" required>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="name@finedge.bank"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Department" required>
                <Input
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  required
                />
              </Field>
              <Field label="Designation Title" required>
                <Input
                  value={createForm.designation}
                  onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee / Staff Code">
                <Input
                  value={createForm.employeeCode}
                  onChange={(e) => setCreateForm({ ...createForm, employeeCode: e.target.value })}
                  placeholder="e.g. EMP-2009 (auto-generated if empty)"
                />
              </Field>
              <Field label="Initial Password">
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Default: Staff@2026#Sec"
                />
              </Field>
            </div>

            {createForm.roleType === 'OPERATIONS' && (
              <Field label="Reporting Manager" required>
                <Select
                  value={createForm.reportingManager}
                  onChange={(e) => setCreateForm({ ...createForm, reportingManager: e.target.value })}
                >
                  <option value="Devendra Singhania (STF-001)">Devendra Singhania (Chief Branch Manager)</option>
                  <option value="Ishita Rao (STF-006)">Ishita Rao (System Administrator)</option>
                </Select>
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={creating}>
                Proceed to Create
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM ADMIN CREATION MODAL */}
      {confirmAdminModalOpen && (
        <Modal
          isOpen={confirmAdminModalOpen}
          onClose={() => setConfirmAdminModalOpen(false)}
          title="Confirm Administrator Creation"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">High-Privilege Security Action</p>
                <p className="mt-0.5">
                  You are creating an account with full <strong>ADMIN</strong> clearance across the entire platform. To prevent accidental elevation, please type the new administrator's email address below to confirm.
                </p>
              </div>
            </div>

            <Field label={`Type "${createForm.email}" to confirm:`} required>
              <Input
                value={adminConfirmInput}
                onChange={(e) => setAdminConfirmInput(e.target.value)}
                placeholder={createForm.email}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConfirmAdminModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={adminConfirmInput.trim().toLowerCase() !== createForm.email.trim().toLowerCase()}
                loading={creating}
                onClick={executeCreateUser}
              >
                Confirm & Create Admin
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
