import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api, ClientProfile } from '../services/api';
import { clientNameToSlug } from '../utils/yamlTagInjector';

export interface SelectedClient {
  id: number;
  name: string;
  slug: string;
}

export interface ClientSelectorProps {
  value: SelectedClient | null;
  onChange: (client: SelectedClient | null) => void;
  disabled?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ value, onChange, disabled }) => {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    api.listClients().then((res) => {
      setClients(res.items.filter((c) => c.is_active));
    }).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    setSlugError(null);

    if (!raw) {
      onChange(null);
      return;
    }

    const id = Number(raw);
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    const slug = clientNameToSlug(client.name);
    if (!slug) {
      setSlugError(
        `El nombre "${client.name}" no contiene caracteres válidos para generar un identificador. ` +
        `Renombrá el perfil usando letras o números antes de asociarlo.`
      );
      onChange(null);
      return;
    }

    onChange({ id: client.id, name: client.name, slug });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">Cliente asociado</label>
      <div className="relative">
        <select
          value={value?.id ?? ''}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 disabled:opacity-60 ${
            slugError
              ? 'border-red-500 bg-a3sec-deeper focus:ring-red-500'
              : 'border-a3sec-muted bg-a3sec-deeper focus:ring-brand-green'
          }`}
        >
          <option value="">(Ninguno — sin asociar a cliente)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
      {slugError && (
        <p className="mt-1 text-xs text-red-400">{slugError}</p>
      )}
      {value && !slugError && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20">
          Tag: client.{value.slug}
        </span>
      )}
    </div>
  );
};
