import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';

import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Field,
  EmptyState,
  PageLoading,
  Modal,
  Checkbox,
  useToast,
} from '../../../components/ui.jsx';
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  PERMISSION_CATALOGUE,
} from '../../../services/managerBridge.js';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function ManagerRolesPermissionsSection() {
  const { managerUser } = useAuth();
  const { toast } = useToast();

  const [roles, setRoles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('ADMIN');

  // Staged permissions for the selected role
  const [stagedPermissions, setStagedPermissions] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applying, setApplying] = useState(false);

  // Create Custom Role Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState(['customers.read']);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete Role confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await listRoles();
      setRoles(list);
      if (!selectedRoleId && list.length > 0) {
        setSelectedRoleId(list[0].id);
      }
    } catch (e) {
      setError(e.detail || e.message || 'Could not load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const selectedRole = useMemo(() => {
    if (!roles) return null;
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  // When selected role changes, reset staged permissions
  useEffect(() => {
    if (selectedRole) {
      setStagedPermissions([...(selectedRole.permissions || [])]);
      setApplyReason('');
      setApplyError('');
    }
  }, [selectedRoleId, selectedRole]);

  // Grouped Permissions catalogue by Module
  const groupedPermissions = useMemo(() => {
    const map = new Map();
    for (const p of PERMISSION_CATALOGUE) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module).push(p);
    }
    return [...map.entries()].map(([module, perms]) => ({ module, perms }));
  }, []);

  // Compute diff between original role permissions and staged
  const diff = useMemo(() => {
    if (!selectedRole) return { grants: [], revokes: [] };
    const originalSet = new Set(selectedRole.permissions || []);
    const stagedSet = new Set(stagedPermissions);
    return {
      grants: [...stagedSet].filter((c) => !originalSet.has(c)),
      revokes: [...originalSet].filter((c) => !stagedSet.has(c)),
    };
  }, [selectedRole, stagedPermissions]);

  const changeCount = diff.grants.length + diff.revokes.length;

  const togglePermission = (code) => {
    if (stagedPermissions.includes(code)) {
      setStagedPermissions(stagedPermissions.filter((c) => c !== code));
    } else {
      setStagedPermissions([...stagedPermissions, code]);
    }
  };

  const handleApplyChanges = async () => {
    if (!applyReason.trim()) {
      setApplyError('A justification reason is mandatory for governance audit records.');
      return;
    }
    setApplying(true);
    setApplyError('');
    try {
      await updateRole(
        selectedRole.id,
        { permissions: stagedPermissions },
        applyReason.trim()
      );
      toast({
        title: 'Role Permissions Updated',
        body: `Applied ${changeCount} permission change(s) for role ${selectedRole.name}. Written to audit log.`,
      });
      setReviewModalOpen(false);
      setApplyReason('');
      await loadRoles();
    } catch (e) {
      setApplyError(e.detail || e.message || 'Failed to update role permissions.');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setCreateError('Role name is required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const created = await createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: newRolePerms,
      });
      toast({
        title: 'Custom Role Materialized',
        body: `Role "${created.name}" created with ${created.permissions.length} initial permissions.`,
      });
      setCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRolePerms(['customers.read']);
      await loadRoles();
      setSelectedRoleId(created.id);
    } catch (e) {
      setCreateError(e.detail || e.message || 'Failed to create custom role.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteRole(roleToDelete.id);
      toast({
        title: 'Custom Role Deleted',
        body: `Role "${roleToDelete.name}" has been removed from platform governance.`,
      });
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      await loadRoles();
      setSelectedRoleId('ADMIN');
    } catch (e) {
      setDeleteError(e.detail || e.message || 'Cannot delete role.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <SectionHeader
        titleAs="h1"
        eyebrow="Administration"
        title="Roles & Permissions"
        description="Core authorisation matrix. Fine-tune system clearance roles, configure module capabilities, or instantiate custom operational clearance roles."
        action={
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Custom Role
          </Button>
        }
      />

      {error ? (
        <EmptyState variant="error" icon={KeyRound} title="Could not load roles" body={error} />
      ) : loading ? (
        <PageLoading />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: ROLES LIST (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 px-1">
              Platform Clearance Roles ({roles?.length || 0})
            </h2>

            <div className="space-y-1.5">
              {(roles || []).map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`group relative flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-midnight-900 border-midnight-950 text-white shadow-md'
                        : 'bg-white border-ink-100 hover:border-gold-300 text-ink-900'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-xs truncate ${isSelected ? 'text-white' : 'text-midnight-950'}`}>
                          {r.name}
                        </p>
                        {r.isSystem ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                                : 'bg-porcelain-100 text-ink-600 border border-ink-200'
                            }`}
                          >
                            System
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            Custom
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-midnight-200' : 'text-ink-500'}`}>
                        {r.description || r.id}
                      </p>
                      <p className={`text-xs font-mono mt-1 ${isSelected ? 'text-gold-400' : 'text-ink-600'}`}>
                        {(r.permissions || []).length} / 23 permissions
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {!r.isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(r);
                            setDeleteError('');
                            setDeleteModalOpen(true);
                          }}
                          className={`p-1.5 rounded-md hover:bg-danger-500/20 text-danger-500 hover:text-danger-400 transition-colors`}
                          title="Delete custom role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-gold-400' : 'text-ink-300'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: PERMISSION CATALOGUE EDITOR (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedRole ? (
              <Card className="p-5 border border-ink-100 bg-white shadow-card">
                {/* Header of selected role */}
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-ink-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-semibold text-midnight-950">
                        {selectedRole.name}
                      </h2>
                      {selectedRole.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System Role (Protected)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">
                      {selectedRole.description || 'Configured role capabilities.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Currently Active Grants</p>
                    <p className="text-lg font-bold text-midnight-950">
                      {stagedPermissions.length} <span className="text-xs font-normal text-ink-400">/ 23</span>
                    </p>
                  </div>
                </div>

                {/* Staged Changes Indicator Banner */}
                {changeCount > 0 && (
                  <div className="my-4 rounded-xl border border-gold-300 bg-gold-50/50 p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-midnight-950">
                        {changeCount} permission modification{changeCount === 1 ? '' : 's'} staged
                      </p>
                      <p className="text-xs text-ink-600 mt-0.5">
                        +{diff.grants.length} grants, -{diff.revokes.length} revokes pending confirmation
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setStagedPermissions([...(selectedRole.permissions || [])])}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Discard
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => setReviewModalOpen(true)}>
                        Review & Apply
                      </Button>
                    </div>
                  </div>
                )}

                {/* Grouped Permission Checkbox Checklist */}
                <div className="mt-4 space-y-5">
                  {groupedPermissions.map(({ module, perms }) => {
                    const moduleCount = perms.filter((p) => stagedPermissions.includes(p.code)).length;
                    return (
                      <div key={module} className="rounded-xl border border-ink-100 overflow-hidden bg-white">
                        <div className="bg-porcelain-100/70 px-4 py-2.5 flex items-center justify-between border-b border-ink-100">
                          <span className="text-xs font-bold text-midnight-950 uppercase tracking-wider">
                            {module}
                          </span>
                          <span className="text-xs font-medium text-ink-500">
                            {moduleCount} / {perms.length} Granted
                          </span>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {perms.map((p) => {
                            const isChecked = stagedPermissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${
                                  isChecked
                                    ? 'bg-midnight-950/5 border-midnight-200'
                                    : 'bg-white border-ink-100 hover:border-ink-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.code)}
                                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-midnight-900"
                                />
                                <div className="text-xs min-w-0">
                                  <p className="font-semibold text-ink-900 leading-tight">{p.label}</p>
                                  <p className="font-mono text-xs text-ink-500 mt-0.5">{p.code}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      {/* REVIEW & APPLY MODAL */}
      {reviewModalOpen && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Review Permission Changes for ${selectedRole?.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {applyError && (
              <div className="p-2.5 rounded bg-danger-50 border border-danger-200 text-danger-700">
                {applyError}
              </div>
            )}

            <div className="rounded-lg bg-porcelain-50 border border-ink-200 p-3 space-y-2">
              <p className="font-semibold text-midnight-950">Summary of Modulated Changes:</p>
              {diff.grants.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase">Grants ({diff.grants.length}):</p>
                  <p className="font-mono text-emerald-900">{diff.grants.join(', ')}</p>
                </div>
              )}
              {diff.revokes.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-danger-700 uppercase">Revocations ({diff.revokes.length}):</p>
                  <p className="font-mono text-danger-900">{diff.revokes.join(', ')}</p>
                </div>
              )}
            </div>

            <Field label="Mandatory Governance Justification / Ticket" required>
              <textarea
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                placeholder="State the regulatory or operational reason for this permission change..."
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={3}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={applying} onClick={handleApplyChanges}>
                Confirm & Apply Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE CUSTOM ROLE MODAL */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Custom Operational Role"
          size="md"
        >
          <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
            {createError && (
              <div className="p-2.5 rounded bg-danger-50 border border-danger-200 text-danger-700">
                {createError}
              </div>
            )}

            <Field label="Role Name" required>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Senior Wealth Advisor"
                required
              />
            </Field>

            <Field label="Description & Scope" required>
              <Input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="e.g. Dedicated high-net-worth portfolio advisory clearance"
                required
              />
            </Field>

            <div className="space-y-2">
              <p className="font-semibold text-ink-700">Initial Granted Permissions:</p>
              <div className="max-h-48 overflow-y-auto border border-ink-200 rounded-lg p-2 space-y-1.5 bg-porcelain-50">
                {PERMISSION_CATALOGUE.map((p) => {
                  const checked = newRolePerms.includes(p.code);
                  return (
                    <label key={p.code} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setNewRolePerms(newRolePerms.filter((c) => c !== p.code));
                          } else {
                            setNewRolePerms([...newRolePerms, p.code]);
                          }
                        }}
                        className="rounded border-ink-300 text-midnight-900"
                      />
                      <span>{p.label} <code className="text-ink-400">({p.code})</code></span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={creating}>
                Create Role
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CUSTOM ROLE MODAL */}
      {deleteModalOpen && roleToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={`Delete Custom Role: ${roleToDelete.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              Are you sure you want to delete the role <strong>{roleToDelete.name}</strong>?
              This action is permanent. The role can only be deleted if no staff user currently holds it.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700">
                <p className="font-semibold">Deletion Blocked</p>
                <p className="mt-0.5">{deleteError}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDeleteRole}>
                Delete Role
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
