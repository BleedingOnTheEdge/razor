'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatTimestamp, formatHash } from '@razor/ui-kit';

export interface CommandEventData {
  commandId: string;
  numericCommandId: number;
  commandType: string;
  correlationId: string;
  status: string;
  submittedAt: string;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  parametersJson?: string | null;
  resultPayloadJson?: string | null;
}

interface CommandEventDetailModalProps {
  command: CommandEventData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CommandEventDetailModal({ command, isOpen, onClose }: CommandEventDetailModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen || !command) return null;

  function copyText(section: string, text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  }

  function formatJson(jsonString?: string | null): string {
    if (!jsonString || !jsonString.trim()) return 'None (Empty payload)';
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  }

  const isSuccess = command.status.toUpperCase() === 'COMPLETED' || command.status.toUpperCase() === 'SUCCEEDED';
  const isFailed = command.status.toUpperCase() === 'FAILED' || command.status.toUpperCase() === 'REJECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
      <div
        className="w-full max-w-2xl bg-[#171717] border border-[#262626] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626] bg-[#141414]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-100" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <span>{command.commandType}</span>
                <span className="text-zinc-400 font-normal">#{command.numericCommandId}</span>
              </h2>
              <p className="text-[11px] text-zinc-500 font-sans">
                Engine Telemetry & Command Response Telemetry Inspector
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#262626] hover:bg-black hover:text-white transition-colors"
            title="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-[#171717] text-zinc-100 rounded-xl">
          {/* Status & Correlation Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 border border-[#262626] bg-[#141414]">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Status</span>
              <span
                className={`font-bold mt-0.5 inline-block ${
                  isSuccess ? 'text-[#3ECF8E]' : isFailed ? 'text-rose-400' : 'text-zinc-100'
                }`}
              >
                [{command.status.toUpperCase()}]
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Opcode</span>
              <span className="font-bold text-zinc-100 mt-0.5 block">#{command.numericCommandId}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Correlation</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-bold text-zinc-100">{formatHash(command.correlationId, 6)}</span>
                <button
                  type="button"
                  onClick={() => copyText('corr', command.correlationId)}
                  className="text-zinc-500 hover:text-zinc-100 p-0.5"
                  title="Copy correlation ID"
                >
                  {copiedSection === 'corr' ? <Check className="w-3 h-3 text-[#3ECF8E]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Submitted</span>
              <span className="text-zinc-100 font-normal mt-0.5 block">
                {formatTimestamp(command.submittedAt)}
              </span>
            </div>
          </div>

          {/* Timestamps Lifecycle */}
          {(command.dispatchedAt || command.completedAt) && (
            <div className="p-3 border border-zinc-300 bg-[#141414] flex flex-wrap gap-4 text-[11px]">
              {command.dispatchedAt && (
                <div>
                  <span className="text-zinc-500 font-bold uppercase">Dispatched At: </span>
                  <span className="text-zinc-100">{formatTimestamp(command.dispatchedAt)}</span>
                </div>
              )}
              {command.completedAt && (
                <div>
                  <span className="text-zinc-500 font-bold uppercase">Completed At: </span>
                  <span className="text-zinc-100">{formatTimestamp(command.completedAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message if Failed */}
          {command.errorMessage && (
            <div className="p-3 border border-red-500 bg-red-50 text-red-700">
              <span className="font-bold uppercase block mb-1">[ENGINE ERROR / REJECTION]</span>
              <pre className="text-xs font-mono whitespace-pre-wrap">{command.errorMessage}</pre>
            </div>
          )}

          {/* Parameters Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-zinc-100">
                Dispatched Parameters Payload
              </span>
              <button
                type="button"
                onClick={() => copyText('params', formatJson(command.parametersJson))}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 font-bold"
              >
                {copiedSection === 'params' ? (
                  <>
                    <Check className="w-3 h-3 text-[#3ECF8E]" />
                    <span className="text-[#3ECF8E]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 border border-[#262626] bg-[#141414] text-zinc-200 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
              {formatJson(command.parametersJson)}
            </pre>
          </div>

          {/* Return Response / Result Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-zinc-100">
                Engine Return Response & Data
              </span>
              <button
                type="button"
                onClick={() => copyText('result', formatJson(command.resultPayloadJson))}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 font-bold"
              >
                {copiedSection === 'result' ? (
                  <>
                    <Check className="w-3 h-3 text-[#3ECF8E]" />
                    <span className="text-[#3ECF8E]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Response</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 border border-[#262626] bg-[#141414] text-zinc-200 max-h-56 overflow-y-auto whitespace-pre-wrap select-all">
              {formatJson(command.resultPayloadJson)}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#141414] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors"
          >
            [CLOSE MODAL]
          </button>
        </div>
      </div>
    </div>
  );
}
