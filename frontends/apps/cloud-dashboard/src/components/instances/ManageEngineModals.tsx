'use client';

import React, { useState } from 'react';
import { Edit2, Key, ShieldAlert, Trash2, Copy, Check, AlertTriangle, Info } from 'lucide-react';
import { ModalSheet, Button } from '@razor/ui-kit';
import { useToast } from '@/components/ui/toast';
import { getApiClient } from '@/lib/api-client';

// -----------------------------------------------------------------------------
// Rename Modal
// -----------------------------------------------------------------------------
export interface RenameEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  currentName: string;
  onRenamed: (newName: string) => void;
}

export const RenameEngineModal: React.FC<RenameEngineModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  currentName,
  onRenamed,
}) => {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.PUT('/api/instances/{instanceId}', {
        params: { path: { instanceId } },
        body: { name: name.trim() },
      });
      if (res.data) {
        success('Engine Renamed', `Instance name updated to "${name.trim()}".`);
        onRenamed(name.trim());
        onClose();
      } else {
        error('Rename Failed', 'Could not update instance name.');
      }
    } catch {
      error('Rename Failed', 'Error communicating with control plane.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} title="Rename Engine Instance" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>Renaming provides human-readable identification in telemetry feeds and routing tables.</span>
        </div>

        <div>
          <label className="block text-xs font-mono text-zinc-300 mb-1">Instance Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            placeholder="e.g. Production Alpha CME"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Save Name
          </Button>
        </div>
      </form>
    </ModalSheet>
  );
};

// -----------------------------------------------------------------------------
// Rotate Key Modal
// -----------------------------------------------------------------------------
export interface RotateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  onKeyRotated: (newKey: string) => void;
}

export const RotateKeyModal: React.FC<RotateKeyModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  onKeyRotated,
}) => {
  const [loading, setLoading] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { success, error } = useToast();

  const handleRotate = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.POST('/api/instances/{instanceId}/rotate-key', {
        params: { path: { instanceId } },
      });
      if (res.data) {
        if (typeof window !== 'undefined' && res.data.apiKey) {
          try {
            localStorage.setItem(`engine_key_${instanceId}`, res.data.apiKey);
          } catch {
            // Ignore localStorage errors
          }
        }
        setIssuedKey(res.data.apiKey);
        onKeyRotated(res.data.apiKey);
        success('Key Rotated', 'New engine API key generated.');
      } else {
        error('Rotation Failed', 'Could not rotate API key.');
      }
    } catch {
      error('Rotation Failed', 'Error communicating with control plane.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (issuedKey) {
      navigator.clipboard.writeText(issuedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} title="Rotate Engine API Key" maxWidth="md">
      <div className="space-y-4 text-xs font-mono">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Rotating the API key immediately invalidates the previous key. Any running engine daemon using the old key will be disconnected until reconfigured.
          </span>
        </div>

        {issuedKey ? (
          <div className="space-y-3">
            <span className="text-zinc-400 block">New Secret API Key:</span>
            <div className="flex items-center gap-2 p-2 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-emerald-400 font-bold truncate select-all">{issuedKey}</span>
              <button onClick={handleCopy} className="p-1.5 rounded bg-zinc-800 text-zinc-300">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRotate} isLoading={loading}>
              Confirm Rotation
            </Button>
          </div>
        )}
      </div>
    </ModalSheet>
  );
};

// -----------------------------------------------------------------------------
// Revoke Key Modal
// -----------------------------------------------------------------------------
export interface RevokeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  onRevoked: () => void;
}

export const RevokeKeyModal: React.FC<RevokeKeyModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  onRevoked,
}) => {
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleRevoke = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.POST('/api/instances/{instanceId}/revoke', {
        params: { path: { instanceId } },
      });
      if (res.response.ok) {
        success('Key Revoked', 'API key revoked. Engine connection blocked.');
        onRevoked();
        onClose();
      } else {
        error('Revocation Failed', 'Failed to revoke API key.');
      }
    } catch {
      error('Revocation Failed', 'Error communicating with control plane.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} title="Revoke Engine Credentials" maxWidth="md">
      <div className="space-y-4 text-xs font-mono">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>
            Revoking engine credentials wipes the stored hash. The instance will be immediately disconnected and prevented from reconnecting.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleRevoke} isLoading={loading}>
            Revoke Access
          </Button>
        </div>
      </div>
    </ModalSheet>
  );
};

// -----------------------------------------------------------------------------
// Delete Engine Modal
// -----------------------------------------------------------------------------
export interface DeleteEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  onDeleted: () => void;
}

export const DeleteEngineModal: React.FC<DeleteEngineModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.DELETE('/api/instances/{instanceId}', {
        params: { path: { instanceId } },
      });
      if (res.response.ok) {
        success('Engine Decommissioned', 'Instance record removed from fleet.');
        onDeleted();
        onClose();
      } else {
        error('Delete Failed', 'Could not delete instance.');
      }
    } catch {
      error('Delete Failed', 'Error communicating with control plane.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} title="Decommission Engine Instance" maxWidth="md">
      <div className="space-y-4 text-xs font-mono">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
          <Trash2 className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>
            Permanently decommissions this engine instance and removes its active socket registrations and command history.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} isLoading={loading}>
            Confirm Decommission
          </Button>
        </div>
      </div>
    </ModalSheet>
  );
};

// -----------------------------------------------------------------------------
// Combined Action Modals Container
// -----------------------------------------------------------------------------
export interface InstanceActionModalsProps {
  instanceId: string;
  instanceName?: string;
  renameOpen: boolean;
  setRenameOpen: (open: boolean) => void;
  rotateOpen: boolean;
  setRotateOpen: (open: boolean) => void;
  revokeOpen: boolean;
  setRevokeOpen: (open: boolean) => void;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  onRenamed: (name: string) => void;
  onReload: () => void;
}

export const InstanceActionModals: React.FC<InstanceActionModalsProps> = ({
  instanceId,
  instanceName = '',
  renameOpen,
  setRenameOpen,
  rotateOpen,
  setRotateOpen,
  revokeOpen,
  setRevokeOpen,
  deleteOpen,
  setDeleteOpen,
  onRenamed,
  onReload,
}) => {
  return (
    <>
      <RenameEngineModal
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        instanceId={instanceId}
        currentName={instanceName}
        onRenamed={onRenamed}
      />
      <RotateKeyModal
        isOpen={rotateOpen}
        onClose={() => setRotateOpen(false)}
        instanceId={instanceId}
        onKeyRotated={onReload}
      />
      <RevokeKeyModal
        isOpen={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        instanceId={instanceId}
        onRevoked={onReload}
      />
      <DeleteEngineModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        instanceId={instanceId}
        onDeleted={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/instances';
          }
        }}
      />
    </>
  );
};

