// -----------------------------------------------------------------------------
// <copyright file="index.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type {
  CommandStatus,
  EngineInstanceStatus,
  ExtensionKind,
  RunContinuity,
  RunKind,
  RunRelation,
  RunStatus,
} from '@razor/contracts';

/** Formats a numeric amount with currency symbol and decimal formatting. */
export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formats a ratio as percentage (e.g. 0.125 -> +12.50%). */
export function formatPercentage(ratio: number | null | undefined, withSign = true): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) {
    return '—';
  }
  const pct = ratio * 100;
  const formatted = `${pct.toFixed(2)}%`;
  if (withSign && pct > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/** Formats an ISO date-time string into a human readable format. */
export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) {
    return '—';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Formats a cryptographic SHA-256 or UUID hash to truncated format (e.g. `a1b2...c3d4`). */
export function formatHash(hash: string | null | undefined, length = 8): string {
  if (!hash) {
    return '—';
  }
  if (hash.length <= length * 2) {
    return hash;
  }
  return `${hash.slice(0, length)}…${hash.slice(-length)}`;
}

/** Badge styling classes for an engine instance status with Supabase emerald accents. */
export function getInstanceStatusBadge(status: EngineInstanceStatus | string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'Active':
      return {
        label: 'Active',
        className: 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/25',
      };
    case 'Draining':
      return {
        label: 'Draining',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    case 'Decommissioned':
      return {
        label: 'Decommissioned',
        className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      };
    default:
      return {
        label: 'Pending',
        className: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      };
  }
}

/** Badge styling classes for a flow run status with Supabase emerald accents. */
export function getRunStatusBadge(status: RunStatus | string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'Running':
      return {
        label: 'Running',
        className: 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/25 animate-pulse',
      };
    case 'Completed':
      return {
        label: 'Completed',
        className: 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/25',
      };
    case 'Paused':
      return {
        label: 'Paused',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    case 'Failed':
    case 'Faulted':
      return {
        label: 'Faulted',
        className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      };
    case 'Cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      };
    default:
      return {
        label: 'Pending',
        className: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      };
  }
}

/** Badge styling classes for run relation (Original, Appended, Branched, Spliced). */
export function getRunRelationBadge(relation: RunRelation | string | null | undefined): {
  label: string;
  className: string;
} {
  switch (relation) {
    case 'Branched':
      return {
        label: 'Branched',
        className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      };
    case 'Spliced':
      return {
        label: 'Spliced',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    case 'Appended':
      return {
        label: 'Appended',
        className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      };
    default:
      return {
        label: 'Original',
        className: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      };
  }
}

/** Badge styling classes for command delivery and execution status. */
export function getCommandStatusBadge(status: CommandStatus | string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'Completed':
      return {
        label: 'Completed',
        className: 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/25',
      };
    case 'Dispatched':
    case 'Delivered':
      return {
        label: status,
        className: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      };
    case 'Failed':
    case 'TimedOut':
      return {
        label: status,
        className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      };
    default:
      return {
        label: 'Queued',
        className: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      };
  }
}

/** Badge styling classes for extension slots. */
export function getExtensionKindBadge(kind: ExtensionKind | string): {
  label: string;
  className: string;
} {
  switch (kind) {
    case 'Adapter':
      return {
        label: 'Adapter',
        className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      };
    case 'Strategy':
      return {
        label: 'Strategy',
        className: 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/25',
      };
    case 'Indicator':
      return {
        label: 'Indicator',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    case 'NeuralNetwork':
      return {
        label: 'Neural Network',
        className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      };
    case 'HookPlugin':
      return {
        label: 'Hook Plugin',
        className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      };
    default:
      return {
        label: kind,
        className: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      };
  }
}

// -----------------------------------------------------------------------------
// Supabase-Style Custom Design System Components (shadcn on Radix UI Primitives)
// -----------------------------------------------------------------------------
export { cn } from './lib/utils';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from './components/Card';
export { StatCard, type StatCardProps } from './components/StatCard';
export { Badge, type BadgeProps, type BadgeVariant } from './components/Badge';
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from './components/Dialog';
export { ModalSheet, type ModalSheetProps } from './components/ModalSheet';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
} from './components/DropdownMenu';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedControlOption,
  type SegmentedControlOption as SegmentedOption,
} from './components/SegmentedControl';
export { ThemeToggle, type ThemeToggleProps, type Theme } from './components/ThemeToggle';
export { Input, type InputProps } from './components/Input';
export { Textarea, type TextareaProps } from './components/Textarea';
export { Label, type LabelProps } from './components/Label';
export { Switch } from './components/Switch';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/Tooltip';
export { Separator } from './components/Separator';
