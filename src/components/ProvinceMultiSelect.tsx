"use client";

import { useState } from "react";

interface Province {
  id: number;
  name: string;
}

interface ProvinceMultiSelectProps {
  provinces: Province[];
  selected: number[];
  name: string;
}

export default function ProvinceMultiSelect({
  provinces,
  selected: initialSelected,
  name,
}: ProvinceMultiSelectProps): React.JSX.Element {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected));

  function toggle(id: number): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {provinces.map((p) => {
          const active = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left transition-all"
              style={{
                background: active ? "var(--brand)" : "var(--surface-2)",
                color: active ? "#0f172a" : "var(--text)",
                border: active ? "1px solid var(--brand-dark)" : "1px solid var(--border)",
              }}
            >
              {active ? "✓ " : ""}
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Hidden inputs for form submission */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}
