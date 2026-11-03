import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, FileSearch, Search } from 'lucide-react';
import { Button, EmptyState, Field, Input, PageLoading, SectionHeader, Select, StatusChip, Table } from '../../../components/ui.jsx';
import { ageOf, formatDateTime, statusLabel } from '../../../lib/format.js';
import { auditCsv, listAudit } from '../../../services/managerBridge.js';
import { useDbTick } from '../../../context/AuthContext.jsx';

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Seed data uses FAILURE, runtime entries may use FAILED — treat them as one outcome. */
function normalizeOutcome(outcome) {
  const o = String(outcome || '').toUpperCase();
  if (o === 'FAILURE' || o === 'FAILED') return 'FAILED';
  if (o === 'SUCCESS') return 'SUCCESS';
  return o || '—';
}

export default function ManagerAuditPage() {
  useDbTick();
  const [allRows, setAllRows] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('ALL');
  const [outcome, setOutcome] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let alive = true;
    listAudit({})
      .then((rows) => { if (alive) { setAllRows(rows); setError(''); } })
      .catch((e) => { if (alive) setError(e.message || 'Could not load the audit log.'); });
    return () => { alive = false; };
  }, []);

  const actions = useMemo(() => {
    if (!allRows) return [];
    return [...new Set(allRows.map((r) => r.action).filter(Boolean))].sort();
  }, [allRows]);

  const filtered = useMemo(() => {
    if (!allRows) return null;
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (q) {
        const hay = [r.actor, r.actorName, r.entity, r.entityType, r.entityId, r.detail].map((v) => (v || '').toLowerCase());
        if (!hay.some((v) => v.includes(q))) return false;
      }
      if (action !== 'ALL' && r.action !== action) return false;
      if (outcome !== 'ALL' && normalizeOutcome(r.outcome) !== outcome) return false;
      return true;
    });
  }, [allRows, search, action, outcome]);

  const expandedRow = useMemo(
    () => (filtered || []).find((r) => r.id === expandedId) || null,
    [filtered, expandedId],
  );

  const columns = [
    {
      key: 'at', label: 'Time',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap text-[13px]">{formatDateTime(r.at || r.timestamp)}</p>
          <p className="text-xs text-ink-500">{ageOf(r.at || r.timestamp)} ago</p>
        </div>
      ),
    },
    {
      key: 'actor', label: 'Actor',
      render: (r) => (
        <div>
          <p className="font-medium text-ink-900">{r.actor || r.actorName || '—'}</p>
          <p className="text-xs text-ink-500">{r.actorRole ? statusLabel(r.actorRole) : '—'}</p>
        </div>
      ),
    },
    { key: 'action', label: 'Action', render: (r) => <span className="font-mono text-[13px]">{r.action || '—'}</span> },
    {
      key: 'entity', label: 'Entity',
      render: (r) => (
        <div>
          <p className="text-[13px]">{statusLabel(r.entity || r.entityType)}</p>
          <p className="font-mono text-xs text-ink-500">{r.entityId || '—'}</p>
        </div>
      ),
    },
    { key: 'outcome', label: 'Outcome', render: (r) => <StatusChip status={normalizeOutcome(r.outcome)} /> },
    {
      key: 'detail', label: 'Detail',
      render: (r) => (
        <span className="inline-flex max-w-[280px] items-start gap-1 text-[13px] text-ink-600">
          {expandedId === r.id ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          <span className={expandedId === r.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}>{r.detail || '—'}</span>
        </span>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Audit & Compliance"
        title="Audit Log"
        description="Every staff decision and governance action, in order. Click a row to read its full detail. Exports respect the filters below."
        action={(
          <Button variant="ghost" disabled={!filtered?.length} onClick={() => { if (filtered?.length) downloadCsv('finedge-audit-log.csv', auditCsv(filtered)); }}>
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
        )}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px_180px] sm:items-end">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input className="pl-9" placeholder="Search actor or entity…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search audit log by actor or entity" />
        </div>
        <Field label="Action">
          <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
            <option value="ALL">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{statusLabel(a)}</option>)}
          </Select>
        </Field>
        <Field label="Outcome">
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Filter by outcome">
            <option value="ALL">All outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </Select>
        </Field>
      </div>

      {filtered && <p className="mb-3 text-sm text-ink-500" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</p>}

      {error ? (
        <EmptyState variant="error" icon={FileSearch} title="Could not load the audit log" body={error} />
      ) : !filtered ? (
        <PageLoading />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileSearch} title="No audit entries match these filters" body="Widen the search or reset the action and outcome filters." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              onRowClick={(r) => setExpandedId((cur) => (cur === r.id ? null : r.id))}
            />
          </div>
          {expandedRow && (
            <div className="mt-3 rounded-xl border border-ink-100 bg-porcelain-50 px-4 py-3.5" role="region" aria-label="Audit entry detail">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Detail · {expandedRow.action || '—'} · {expandedRow.actor || expandedRow.actorName || '—'} · {formatDateTime(expandedRow.at || expandedRow.timestamp)}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{expandedRow.detail || '—'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
