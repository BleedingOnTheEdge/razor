'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export interface ParameterEntry {
  id: string;
  key: string;
  value: string;
  error?: string;
}

export interface DynamicParameterGeneratorProps {
  initialConfigJson?: string;
  onChange: (configJson: string) => void;
}

const COMMON_PRESETS: { key: string; defaultValue: string; label: string }[] = [
  { key: 'StopLossPct', defaultValue: '2.5', label: '+ Stop Loss %' },
  { key: 'TakeProfitPct', defaultValue: '5.0', label: '+ Take Profit %' },
  { key: 'MaxPositionPct', defaultValue: '10.0', label: '+ Max Position %' },
  { key: 'RiskPerTradePct', defaultValue: '1.0', label: '+ Risk Per Trade %' },
  { key: 'FastPeriod', defaultValue: '12', label: '+ Fast Period' },
  { key: 'SlowPeriod', defaultValue: '26', label: '+ Slow Period' },
  { key: 'SignalPeriod', defaultValue: '9', label: '+ Signal Period' },
  { key: 'SlippageToleranceTicks', defaultValue: '2', label: '+ Slippage Ticks' },
];

export function DynamicParameterGenerator({
  initialConfigJson = '{}',
  onChange,
}: DynamicParameterGeneratorProps) {
  const [entries, setEntries] = useState<ParameterEntry[]>(() => {
    try {
      const parsed = JSON.parse(initialConfigJson);
      const keys = Object.keys(parsed);
      if (keys.length === 0) {
        return [
          { id: '1', key: 'StopLossPct', value: '2.5' },
          { id: '2', key: 'TakeProfitPct', value: '5.0' },
          { id: '3', key: 'MaxPositionPct', value: '10.0' },
        ];
      }
      return keys.map((k, idx) => ({
        id: String(idx + 1),
        key: k,
        value: typeof parsed[k] === 'object' ? JSON.stringify(parsed[k]) : String(parsed[k]),
      }));
    } catch {
      return [{ id: '1', key: 'RiskPerTradePct', value: '1.5' }];
    }
  });

  // Validate a single entry's value
  const validateValue = (val: string): string | undefined => {
    const trimmed = val.trim();
    if (!trimmed) return 'Value cannot be empty';
    if (trimmed === 'true' || trimmed === 'false') return undefined;
    if (!isNaN(Number(trimmed))) return undefined;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return undefined;
      } catch {
        return 'Invalid JSON syntax';
      }
    }
    // Plain string is accepted
    return undefined;
  };

  const notifyChange = (updatedEntries: ParameterEntry[]) => {
    const resultObj: Record<string, any> = {};
    for (const item of updatedEntries) {
      const trimmedKey = item.key.trim();
      const trimmedVal = item.value.trim();
      if (!trimmedKey) continue;

      if (trimmedVal === 'true') {
        resultObj[trimmedKey] = true;
      } else if (trimmedVal === 'false') {
        resultObj[trimmedKey] = false;
      } else if (!isNaN(Number(trimmedVal))) {
        resultObj[trimmedKey] = Number(trimmedVal);
      } else if (
        (trimmedVal.startsWith('{') && trimmedVal.endsWith('}')) ||
        (trimmedVal.startsWith('[') && trimmedVal.endsWith(']'))
      ) {
        try {
          resultObj[trimmedKey] = JSON.parse(trimmedVal);
        } catch {
          resultObj[trimmedKey] = trimmedVal;
        }
      } else {
        resultObj[trimmedKey] = trimmedVal;
      }
    }
    onChange(JSON.stringify(resultObj, null, 2));
  };

  const handleKeyChange = (id: string, newKey: string) => {
    const next = entries.map((e) => (e.id === id ? { ...e, key: newKey } : e));
    setEntries(next);
    notifyChange(next);
  };

  const handleValueChange = (id: string, newVal: string) => {
    const error = validateValue(newVal);
    const next = entries.map((e) => (e.id === id ? { ...e, value: newVal, error } : e));
    setEntries(next);
    notifyChange(next);
  };

  const handleAddRow = () => {
    const next: ParameterEntry[] = [
      ...entries,
      { id: Date.now().toString(), key: '', value: '' },
    ];
    setEntries(next);
  };

  const handleRemoveRow = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    notifyChange(next);
  };

  const handleApplyPreset = (presetKey: string, presetDefault: string) => {
    if (entries.some((e) => e.key.toLowerCase() === presetKey.toLowerCase())) return;
    const next: ParameterEntry[] = [
      ...entries,
      { id: Date.now().toString(), key: presetKey, value: presetDefault },
    ];
    setEntries(next);
    notifyChange(next);
  };

  return (
    <div className="border border-[#262626] bg-[#171717] rounded-xl p-5 font-mono space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262626]">
        <div>
          <span className="font-bold text-sm text-zinc-100 uppercase tracking-wider block">
            Default Parameter Genes & Configurations
          </span>
          <span className="text-xs text-zinc-400 font-sans mt-0.5 block">
            Configure baseline strategy genes, risk limits, and execution tolerances.
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddRow}
          className="px-3 py-1.5 border border-[#262626] bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium text-xs font-bold uppercase flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Parameter</span>
        </button>
      </div>

      {/* Presets Bar */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-zinc-300 uppercase flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-zinc-100" />
          <span>Quick Gene Presets</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PRESETS.map((preset) => {
            const isAlreadyAdded = entries.some(
              (e) => e.key.toLowerCase() === preset.key.toLowerCase()
            );
            return (
              <button
                key={preset.key}
                type="button"
                disabled={isAlreadyAdded}
                onClick={() => handleApplyPreset(preset.key, preset.defaultValue)}
                className={`text-[11px] px-2.5 py-1 border transition-colors ${
                  isAlreadyAdded
                    ? 'border-[#262626] bg-[#1f1f1f] text-zinc-500 rounded-full cursor-not-allowed'
                    : 'border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Rows */}
      <div className="space-y-3 pt-2">
        {entries.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-[#262626] rounded-xl">
            No parameters configured. Click &quot;Add Parameter&quot; or select a preset above.
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={entry.id} className="space-y-1">
              <div className="flex items-center gap-2">
                {/* Index / drag pill */}
                <div className="w-7 h-10 border border-[#262626] bg-[#1f1f1f] rounded-md flex items-center justify-center font-bold text-xs text-zinc-100 shrink-0">
                  {index + 1}
                </div>

                {/* Key input */}
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="text"
                    value={entry.key}
                    onChange={(e) => handleKeyChange(entry.id, e.target.value)}
                    placeholder="ParameterName (e.g. StopLossPct)"
                    className="w-full px-3 py-2 border border-[#262626] bg-[#171717] rounded-md text-xs font-bold text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 h-10"
                  />
                </div>

                {/* Equals sign */}
                <span className="text-sm font-bold text-zinc-500 shrink-0">=</span>

                {/* Value input (spacious, ergonomic, validated) */}
                <div className="flex-[1.5] min-w-[180px] relative">
                  <input
                    type="text"
                    value={entry.value}
                    onChange={(e) => handleValueChange(entry.id, e.target.value)}
                    placeholder="Validated Value (e.g. 2.5, true, 50)"
                    className={`w-full px-3 py-2 border rounded-md text-xs font-mono text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 h-10 ${
                      entry.error
                        ? 'border-rose-500/30 bg-rose-950/20 focus:border-rose-500/50'
                        : 'border-[#262626] bg-[#141414] focus:bg-[#171717]'
                    }`}
                  />
                  {entry.error ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 absolute right-2.5 top-3" />
                  ) : entry.value.trim() ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3ECF8E] absolute right-2.5 top-3 opacity-60" />
                  ) : null}
                </div>

                {/* Delete row */}
                <button
                  type="button"
                  onClick={() => handleRemoveRow(entry.id)}
                  className="w-10 h-10 border border-[#262626] bg-[#171717] hover:bg-rose-950/40 hover:border-rose-500/50 text-zinc-100 hover:text-rose-400 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  title="Remove parameter"
                  aria-label="Remove parameter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {entry.error && (
                <p className="text-[10px] text-rose-400 font-sans pl-9 font-bold">
                  {entry.error}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
