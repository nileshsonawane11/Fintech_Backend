import React from 'react';
import {
  Button as UiButton,
  Card,
  Badge,
  StatusChip,
  Modal as UiModal,
  ToastProvider,
  useToast,
  EmptyState,
  OtpInput,
  ResendOtp,
  Spinner,
  PageLoading,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  FormError,
  SectionHeader,
  statusTone,
  Table,
  Tabs,
  Stepper
} from '../ui.jsx';
import { Search, X } from 'lucide-react';

export const Button = (props) => <UiButton {...props} />;
export { Card, Badge, StatusChip, ToastProvider, useToast, EmptyState, OtpInput, ResendOtp, Spinner, PageLoading, Field, Input, Textarea, Select, Checkbox, FormError, SectionHeader, statusTone, Table, Tabs, Stepper };

export const Modal = ({ isOpen, open, ...props }) => (
  <UiModal open={open ?? isOpen} {...props} />
);

export const QueueSearch = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search by identifier, name, or reference...',
  resultsCount,
  totalCount,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative">
        <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-xs border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight-700/20 focus:border-midnight-700 bg-white transition-all text-ink-800"
        />
        {value && (
          <button
            type="button"
            onClick={onClear || (() => onChange(''))}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600 rounded-md"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {typeof resultsCount === 'number' && (
        <p className="text-xs text-ink-500 font-medium px-1">
          Showing <span className="font-semibold text-ink-700">{resultsCount}</span> {resultsCount === 1 ? 'record' : 'records'}
          {typeof totalCount === 'number' && totalCount !== resultsCount ? ` (filtered from ${totalCount})` : ''}
        </p>
      )}
    </div>
  );
};
