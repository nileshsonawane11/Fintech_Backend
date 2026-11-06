import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Users } from 'lucide-react';
import {
  Button, Checkbox, EmptyState, Field, Input, Modal, PageLoading,
  SectionHeader, StatusChip, Table, Textarea, useToast,
} from '../../../components/ui.jsx';
import { formatDateTime, statusLabel } from '../../../lib/format.js';
import {
  PERMISSION_CATALOGUE, ROLE_TEMPLATES, listStaff, setStaffActive, updateStaffPermissions,
} from '../../../services/managerBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

export default function ManagerStaffPage() {
  useDbTick();
  const { managerUser, user: custUser } = useAuth();
  const user = managerUser || custUser;
  const isAuditor = user?.role === 'AUDITOR' || user?.role === 'AUDIT_COMPLIANCE';
  const actor = user?.fullName || user?.name || 'Chief Branch Manager';
  const actorRole = user?.role || 'BANK_MANAGER';

  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [staged, setStaged] = useState(null); // permissions array being edited
  const [reviewOpen, setReviewOpen] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applying, setApplying] = useState(false);

  const load = () => {
    listStaff()
      .then((rows) => { setStaff(rows); setError(''); })
      .catch((e) => setError(e.message || 'Could not load staff.'));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!staff) return null;
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => [s.name, s.email, s.role].some((v) => (v || '').toLowerCase().includes(q)));
  }, [staff, query]);

  const selected = useMemo(
    () => (staff || []).find((s) => s.id === selectedStaffId) || null,
    [staff, selectedStaffId],
  );

  // When the selection changes, reset the staged set to that staffer's current permissions.
  useEffect(() => {
    if (selected) setStaged([...(selected.permissions || [])]);
    else setStaged(null);
    setReviewOpen(false);
    setApplyReason('');
    setApplyError('');
  }, [selectedStaffId]); // eslint-disable-line react-hooks/exhaustive-deps

  const diff = useMemo(() => {
    if (!selected || !staged) return { grants: [], revokes: [] };
    const current = new Set(selected.permissions || []);
    const next = new Set(staged);
    return {
      grants: [...next].filter((c) => !current.has(c)),
      revokes: [...current].filter((c) => !next.has(c)),
    };
  }, [selected, staged]);
  const changeCount = diff.grants.length + diff.revokes.length;

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of PERMISSION_CATALOGUE) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module).push(p);
    }
    return [...map.entries()].map(([module, perms]) => ({ module, perms }));
  }, []);

  const labelFor = (code) => PERMISSION_CATALOGUE.find((p) => p.code === code)?.label || code;

  const isActive = (s) => (s.active !== undefined ? !!s.active : String(s.status || '').toUpperCase() === 'ACTIVE');
  const isSelf = (s) => Boolean(user && ((s.id && (user.id === s.id || user.staffId === s.id)) || (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase())));

  async function handleActivate(s) {
    setActivatingId(s.id);
    try {
      await setStaffActive(s.id, true, { actor, actorRole, actorEmail: user?.email });
      toast({ title: 'Staff account activated', body: `${s.name} can sign in again.` });
      load();
    } catch (e) {
      toast({ tone: 'error', title: 'Activation failed', body: e.message });
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    if (!deactivateReason.trim()) { setDeactivateError('A reason is required to deactivate a staff account.'); return; }
    setDeactivating(true);
    try {
      await setStaffActive(deactivateTarget.id, false, { actor, actorRole, actorEmail: user?.email, reason: deactivateReason.trim() });
      toast({ title: 'Staff account deactivated', body: `${deactivateTarget.name} can no longer sign in. Reason recorded in the audit log.` });
      setDeactivateTarget(null);
      setDeactivateReason('');
      setDeactivateError('');
      load();
    } catch (e) {
      setDeactivateError(e.message || 'Deactivation failed.');
    } finally {
      setDeactivating(false);
    }
  }

  async function handleApply() {
    if (!selected) return;
    if (!applyReason.trim()) { setApplyError('A reason is required for every permission change.'); return; }
    setApplying(true);
    try {
      await updateStaffPermissions(selected.id, [...staged], { actor, actorRole, actorEmail: user?.email, reason: applyReason.trim() });
      toast({ title: 'Permissions updated', body: `${changeCount} change${changeCount === 1 ? '' : 's'} applied for ${selected.name}. The change has been written to the audit log.` });
      setReviewOpen(false);
      setApplyReason('');
      setApplyError('');
      load();
    } catch (e) {
      setApplyError(e.message || 'Could not apply permission changes.');
    } finally {
      setApplying(false);
    }
  }

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (s) => (
        <div>
          <p className="font-semibold text-ink-900">{s.name || '—'}{isSelf(s) && <span className="text-ink-500"> (you)</span>}</p>
          <p className="text-xs text-ink-500">{s.id}</p>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (s) => <span className="text-[13px]">{s.email || '—'}</span> },
    { key: 'role', label: 'Role', render: (s) => <span className="font-medium text-ink-800">{statusLabel(s.role)}</span> },
    { key: 'status', label: 'Status', render: (s) => <StatusChip status={isActive(s) ? 'ACTIVE' : 'DISABLED'} /> },
    {
      key: 'permissions', label: 'Permissions',
      render: (s) => (
        <button
          type="button"
          onClick={() => setSelectedStaffId(s.id)}
          className="font-medium text-midnight-800 underline decoration-gold-400 decoration-2 underline-offset-2 hover:text-midnight-600"
        >
          {(s.permissions || []).length} permissions
        </button>
      ),
    },
    { key: 'lastLogin', label: 'Last login', render: (s) => <span className="whitespace-nowrap">{formatDateTime(s.lastLoginAt || s.lastLogin)}</span> },
    {
      key: 'actions', label: 'Actions',
      render: (s) => {
        if (isSelf(s)) {
          return (
            <Button size="sm" variant="secondary" disabled title="Your own account cannot be deactivated here">
              Deactivate
            </Button>
          );
        }
        if (isAuditor) {
          return <span className="text-xs text-ink-500" title="Auditors have read-only access">Read-only</span>;
        }
        return isActive(s) ? (
          <Button size="sm" variant="danger" onClick={() => { setDeactivateTarget(s); setDeactivateReason(''); setDeactivateError(''); }}>
            Deactivate
          </Button>
        ) : (
          <Button size="sm" variant="secondary" loading={activatingId === s.id} onClick={() => handleActivate(s)}>
            Activate
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Admin"
        title="Staff & Roles"
        description="Manage staff accounts and role permissions. Deactivation and permission changes are governance actions — they require a reason and are written to the audit log."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input className="pl-9" placeholder="Search name, email or role…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search staff" />
        </div>
        {filtered && <p className="text-sm text-ink-500" aria-live="polite">{filtered.length} staff {filtered.length === 1 ? 'member' : 'members'}</p>}
      </div>

      {error ? (
        <EmptyState variant="error" icon={Users} title="Could not load staff" body={error} />
      ) : !filtered ? (
        <PageLoading />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No staff match this search" body="Try a different name, email or role." />
      ) : (
        <Table columns={columns} rows={filtered} rowKey={(s) => s.id} />
      )}

      {/* ---------------- RBAC panel ---------------- */}
      <div className="mt-10">
        <SectionHeader
          eyebrow="Roles & Governance"
          title="Permissions"
          description="Changes are staged and applied after review. Nothing changes until you review the diff and confirm with a reason."
        />

        {!staff ? <PageLoading /> : (
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Select a staff member</p>
              <div className="flex flex-col gap-1.5" role="listbox" aria-label="Staff selector">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={selectedStaffId === s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                      selectedStaffId === s.id
                        ? 'border-midnight-700 bg-midnight-800 text-porcelain-50'
                        : 'border-ink-200 bg-white text-ink-800 hover:border-midnight-400'
                    }`}
                  >
                    <span className="block font-medium">{s.name}</span>
                    <span className={`block text-xs ${selectedStaffId === s.id ? 'text-porcelain-200' : 'text-ink-500'}`}>{statusLabel(s.role)} · {(s.permissions || []).length} permissions</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              {!selected ? (
                <EmptyState icon={ShieldCheck} title="No staff member selected" body="Choose a staff member on the left to review and stage permission changes for them." />
              ) : (
                <div className="space-y-5">
                  <p className="text-sm text-ink-600">
                    Editing permissions for <strong className="text-ink-900">{selected.name}</strong> ({statusLabel(selected.role)}).
                    {isAuditor && <span className="text-ink-500"> Auditor access is read-only — toggles are disabled.</span>}
                  </p>
                  {grouped.map(({ module, perms }) => (
                    <div key={module}>
                      <h3 className="mb-2 font-display text-base font-semibold text-midnight-950">{module}</h3>
                      <Table
                        columns={[
                          {
                            key: 'label', label: 'Permission',
                            render: (p) => (
                              <div>
                                <p className="font-medium text-ink-900">{p.label}</p>
                                <p className="font-mono text-xs text-ink-500">{p.code}</p>
                              </div>
                            ),
                          },
                          {
                            key: 'template', label: 'In role template',
                            render: (p) => (ROLE_TEMPLATES[selected.role] || []).includes(p.code)
                              ? <span className="inline-block h-2.5 w-2.5 rounded-full bg-midnight-600" title={`Included in the ${statusLabel(selected.role)} role template`} aria-label="In role template" />
                              : <span className="text-ink-300">—</span>,
                          },
                          {
                            key: 'granted', label: 'Granted',
                            render: (p) => (
                              <Checkbox
                                label={<span className="sr-only">{`Grant ${p.label} to ${selected.name}`}</span>}
                                checked={(staged || []).includes(p.code)}
                                disabled={isAuditor}
                                title={isAuditor ? 'Auditors have read-only access and cannot change permissions' : undefined}
                                onChange={(e) => {
                                  setStaged((cur) => (e.target.checked ? [...(cur || []), p.code] : (cur || []).filter((c) => c !== p.code)));
                                }}
                              />
                            ),
                          },
                        ]}
                        rows={perms}
                        rowKey={(p) => p.code}
                      />
                    </div>
                  ))}

                  {changeCount > 0 && (
                    <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-raised" role="status">
                      <p className="text-sm font-semibold text-ink-900">
                        {changeCount} change{changeCount === 1 ? '' : 's'} staged
                        <span className="font-normal text-ink-600"> · {diff.grants.length} to grant · {diff.revokes.length} to revoke</span>
                      </p>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setStaged([...(selected.permissions || [])])}>Discard</Button>
                        <Button size="sm" disabled={isAuditor} title={isAuditor ? 'Auditors have read-only access' : undefined} onClick={() => { setApplyReason(''); setApplyError(''); setReviewOpen(true); }}>
                          Review & Apply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deactivate confirmation */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate staff account"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={deactivating} onClick={handleDeactivate}>Deactivate account</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-700">
            Deactivate <strong>{deactivateTarget?.name}</strong> ({deactivateTarget?.email})? They will no longer be able to sign in to the staff console. This can be reversed by reactivating the account, and the action is written to the audit log.
          </p>
          <Field label="Reason for deactivation" required error={deactivateError}>
            <Textarea rows={3} value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="e.g. Role ended, transferred to another branch…" />
          </Field>
        </div>
      </Modal>

      {/* Permission review & apply */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Review permission changes"
        wide
        footer={(
          <>
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>Back to editing</Button>
            <Button loading={applying} onClick={handleApply}>Apply changes</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-700">
            Applying to <strong>{selected?.name}</strong> ({selected ? statusLabel(selected.role) : '—'}). These changes take effect immediately after you apply, and the change — with your reason — is written to the audit log.
          </p>
          {diff.grants.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">To grant</p>
              <ul className="space-y-1 text-sm">
                {diff.grants.map((code) => <li key={code} className="text-success-600">+ {labelFor(code)} <span className="font-mono text-xs text-ink-500">({code})</span></li>)}
              </ul>
            </div>
          )}
          {diff.revokes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">To revoke</p>
              <ul className="space-y-1 text-sm">
                {diff.revokes.map((code) => <li key={code} className="text-danger-600">− {labelFor(code)} <span className="font-mono text-xs text-ink-500">({code})</span></li>)}
              </ul>
            </div>
          )}
          <Field label="Reason for this change" required error={applyError}>
            <Textarea rows={3} value={applyReason} onChange={(e) => setApplyReason(e.target.value)} placeholder="e.g. Taking on loan disbursement cover for the quarter…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
