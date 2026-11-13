import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Save,
  CheckCircle2,
  ShieldAlert,
  Info
} from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageLoading,
  SectionHeader,
  useToast
} from '../../../components/ui.jsx';
import { formatINR } from '../../../lib/format.js';
import { adminGetSettings, adminUpdateSettings } from '../../../services/managerBridge.js';

export default function ManagerPlatformSettingsSection() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // Form Draft State
  const [railsDraft, setRailsDraft] = useState({
    INTERNAL: { fee: 0, dailyLimit: 1000000 },
    UPI: { fee: 0, dailyLimit: 100000 },
    IMPS: { fee: 5, dailyLimit: 500000 },
    NEFT: { fee: 0, dailyLimit: 1000000 },
  });
  const [lockMinutesDraft, setLockMinutesDraft] = useState(15);
  const [slaDraft, setSlaDraft] = useState({ amberHours: 24, redHours: 72 });

  // Save Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [pendingDomain, setPendingDomain] = useState(null); // 'rails' | 'lock' | 'sla' | 'all'
  const [saveReason, setSaveReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  const loadSettings = async () => {
    traceData('ManagerPlatformSettings');
    try {
      setLoading(true);
      const res = await adminGetSettings();
      setSettings(res);
      if (res.transferRails) {
        setRailsDraft({
          INTERNAL: {
            fee: res.transferRails.INTERNAL?.fee ?? 0,
            dailyLimit: res.transferRails.INTERNAL?.dailyLimit ?? 1000000,
          },
          UPI: {
            fee: res.transferRails.UPI?.fee ?? 0,
            dailyLimit: res.transferRails.UPI?.dailyLimit ?? 100000,
          },
          IMPS: {
            fee: res.transferRails.IMPS?.fee ?? 5,
            dailyLimit: res.transferRails.IMPS?.dailyLimit ?? 500000,
          },
          NEFT: {
            fee: res.transferRails.NEFT?.fee ?? 0,
            dailyLimit: res.transferRails.NEFT?.dailyLimit ?? 1000000,
          },
        });
      }
      if (res.inactivityLockMinutes !== undefined) {
        setLockMinutesDraft(Number(res.inactivityLockMinutes));
      }
      if (res.slaThresholds) {
        setSlaDraft({
          amberHours: Number(res.slaThresholds.amberHours) || 24,
          redHours: Number(res.slaThresholds.redHours) || 72,
        });
      }
    } catch (err) {
      console.error('Failed to load platform settings', err);
      addToast(err.detail || err.message || 'Failed to load settings', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const openSave = (domain) => {
    setValidationError('');
    setSaveReason('');

    // Pre-save client validation
    if (domain === 'rails' || domain === 'all') {
      for (const [railId, r] of Object.entries(railsDraft)) {
        if (Number(r.fee) < 0) {
          setValidationError(`Transfer rail fee for ${railId} cannot be negative.`);
          return;
        }
        if (Number(r.dailyLimit) <= 0) {
          setValidationError(`Transfer rail daily limit for ${railId} must be greater than ₹0.`);
          return;
        }
      }
    }

    if (domain === 'lock' || domain === 'all') {
      const mins = Number(lockMinutesDraft);
      if (isNaN(mins) || mins < 1 || mins > 60) {
        setValidationError('Session inactivity lock must be set between 1 and 60 minutes.');
        return;
      }
    }

    if (domain === 'sla' || domain === 'all') {
      const amber = Number(slaDraft.amberHours);
      const red = Number(slaDraft.redHours);
      if (isNaN(amber) || amber <= 0) {
        setValidationError('Amber SLA threshold must be greater than 0 hours.');
        return;
      }
      if (isNaN(red) || red <= amber) {
        setValidationError('Red SLA threshold must be strictly greater than Amber SLA threshold.');
        return;
      }
    }

    setPendingDomain(domain);
    setSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    traceForm('PlatformSettingsUpdate', { rails: railsDraft, lockMinutes: lockMinutesDraft, sla: slaDraft });
    setSaving(true);
    try {
      const updates = {};
      if (pendingDomain === 'rails' || pendingDomain === 'all') {
        updates.transferRails = {
          INTERNAL: { ...settings?.transferRails?.INTERNAL, id: 'INTERNAL', label: 'Within FinEdge (Instant)', fee: Number(railsDraft.INTERNAL.fee), dailyLimit: Number(railsDraft.INTERNAL.dailyLimit), simulated: false },
          UPI: { ...settings?.transferRails?.UPI, id: 'UPI', label: 'UPI (Instant) — Simulation', fee: Number(railsDraft.UPI.fee), dailyLimit: Number(railsDraft.UPI.dailyLimit), simulated: true },
          IMPS: { ...settings?.transferRails?.IMPS, id: 'IMPS', label: 'IMPS (Instant) — Simulation', fee: Number(railsDraft.IMPS.fee), dailyLimit: Number(railsDraft.IMPS.dailyLimit), simulated: true },
          NEFT: { ...settings?.transferRails?.NEFT, id: 'NEFT', label: 'NEFT (2–4 hrs) — Simulation', fee: Number(railsDraft.NEFT.fee), dailyLimit: Number(railsDraft.NEFT.dailyLimit), simulated: true },
        };
      }
      if (pendingDomain === 'lock' || pendingDomain === 'all') {
        updates.inactivityLockMinutes = Number(lockMinutesDraft);
      }
      if (pendingDomain === 'sla' || pendingDomain === 'all') {
        updates.slaThresholds = {
          amberHours: Number(slaDraft.amberHours),
          redHours: Number(slaDraft.redHours),
        };
      }

      await adminUpdateSettings(updates, saveReason.trim());
      addToast('Platform operational settings updated successfully.', 'success');
      setSaveModalOpen(false);
      setPendingDomain(null);
      setSaveReason('');
      await loadSettings();
    } catch (err) {
      console.error('Failed to update settings', err);
      setValidationError(err.detail || err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading message="Loading platform settings..." />;

  const railOrder = [
    { id: 'INTERNAL', name: 'Internal Transfer (FinEdge to FinEdge)', badge: 'Instant' },
    { id: 'UPI', name: 'UPI Payment Rail', badge: 'Simulated' },
    { id: 'IMPS', name: 'IMPS Payment Rail', badge: 'Simulated' },
    { id: 'NEFT', name: 'NEFT Payment Rail', badge: 'Simulated' },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Administration"
        title="Platform Operational Settings"
        description="Master operational parameters controlling payment rails, security session timers, and operational SLA breach thresholds."
      />

      {/* 1. Transfer Rails Parameters */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
              <ArrowLeftRight className="h-5 w-5 text-gold-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-midnight-950">Payment Rails: Fees & Daily Limits</h3>
              <p className="text-xs text-ink-500 mt-0.5">Directly governs customer portal quotes, transaction fees, and daily dispatch ceilings.</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => openSave('rails')} className="min-h-11">
            <Save className="h-4 w-4 mr-2" /> Save Rail Settings
          </Button>
        </div>

        <div className="space-y-4">
          {railOrder.map((rail) => {
            const current = railsDraft[rail.id] || { fee: 0, dailyLimit: 1000000 };
            return (
              <div key={rail.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-xl border border-ink-200 bg-porcelain-50/50">
                <div className="md:col-span-4">
                  <p className="text-sm font-semibold text-midnight-950">{rail.name}</p>
                  <span className="text-xs text-ink-500 font-mono">Rail ID: {rail.id}</span>
                </div>
                <div className="md:col-span-4">
                  <Field label="Per-Transaction Fee (₹)" required>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={current.fee}
                      onChange={(e) => {
                        const next = { ...railsDraft };
                        next[rail.id] = { ...next[rail.id], fee: e.target.value };
                        setRailsDraft(next);
                      }}
                    />
                  </Field>
                </div>
                <div className="md:col-span-4">
                  <Field label="Daily Transfer Limit (₹)" required hint={`Current: ${formatINR(current.dailyLimit || 0)}`}>
                    <Input
                      type="number"
                      min="1000"
                      step="1000"
                      value={current.dailyLimit}
                      onChange={(e) => {
                        const next = { ...railsDraft };
                        next[rail.id] = { ...next[rail.id], dailyLimit: e.target.value };
                        setRailsDraft(next);
                      }}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2. Customer Portal Inactivity Lock */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
              <Clock className="h-5 w-5 text-gold-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-midnight-950">Portal Inactivity Lock Timer</h3>
              <p className="text-xs text-ink-500 mt-0.5">Session pause duration after user idle time (acceptable range: 1 to 60 minutes).</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => openSave('lock')} className="min-h-11">
            <Save className="h-4 w-4 mr-2" /> Save Inactivity Lock
          </Button>
        </div>

        <div className="max-w-md">
          <Field label="Inactivity Lock Timeout (Minutes)" required hint="Governs idle pause modal on customer NetBanking session">
            <Input
              type="number"
              min="1"
              max="60"
              value={lockMinutesDraft}
              onChange={(e) => setLockMinutesDraft(e.target.value)}
            />
          </Field>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-600 bg-porcelain-100 p-2.5 rounded-lg border border-ink-200">
            <Info className="h-4 w-4 text-midnight-700 shrink-0" />
            <span>Customers will be prompted to re-enter their password after <strong>{lockMinutesDraft} minutes</strong> of inactivity.</span>
          </div>
        </div>
      </Card>

      {/* 3. Support & Operations SLA Thresholds */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
              <AlertTriangle className="h-5 w-5 text-gold-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-midnight-950">Operational SLA Queue Thresholds</h3>
              <p className="text-xs text-ink-500 mt-0.5">Ages at which pending work items flag Amber (At Risk) and Red (Breaching) on staff consoles.</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => openSave('sla')} className="min-h-11">
            <Save className="h-4 w-4 mr-2" /> Save SLA Thresholds
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 max-w-xl">
          <Field label="Amber SLA Threshold (Hours)" required hint="Queue turns amber (At risk) after this age">
            <Input
              type="number"
              min="1"
              value={slaDraft.amberHours}
              onChange={(e) => setSlaDraft({ ...slaDraft, amberHours: e.target.value })}
            />
          </Field>

          <Field label="Red SLA Threshold (Hours)" required hint="Queue turns red (Breaching) after this age (must be > amber)">
            <Input
              type="number"
              min="2"
              value={slaDraft.redHours}
              onChange={(e) => setSlaDraft({ ...slaDraft, redHours: e.target.value })}
            />
          </Field>
        </div>
        <p className="text-xs text-ink-500 mt-4">
          Lowering the Red threshold causes queues older than that threshold to immediately turn red across Staff Dashboard and Reports.
        </p>
      </Card>

      {/* Audited Confirmation Modal */}
      {saveModalOpen && (
        <Modal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          title="Confirm Platform Settings Update"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              You are updating operational platform parameters for <strong>{pendingDomain?.toUpperCase()}</strong>. These settings take effect on the next operation with zero server restart required.
            </p>

            {validationError && (
              <div className="rounded-lg bg-danger-50 p-3 border border-danger-200 text-danger-700 font-medium">
                {validationError}
              </div>
            )}

            <Field label="Mandatory Justification Reason" required hint="Recorded in the immutable non-repudiation security audit trail">
              <textarea
                value={saveReason}
                onChange={(e) => setSaveReason(e.target.value)}
                placeholder="State the regulatory, treasury, or operational reason..."
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={3}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} onClick={handleConfirmSave}>
                Confirm &amp; Apply Settings
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
