import { useState } from "react";

export function JsonTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || typeof value !== "object") {
    return <span className="json-leaf">{JSON.stringify(value)}</span>;
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);
  return <JsonBranch entries={entries} depth={depth} array={Array.isArray(value)} />;
}

function JsonBranch({
  entries,
  depth,
  array,
}: {
  entries: readonly (readonly [string, unknown])[];
  depth: number;
  array: boolean;
}) {
  const [open, setOpen] = useState(depth < 2);
  return (
    <div className="json-tree">
      <button type="button" className="json-toggle" onClick={() => setOpen((current) => !current)}>
        {open ? "▾" : "▸"} {array ? `Array(${entries.length})` : `Object(${entries.length})`}
      </button>
      {open ? (
        <div className="json-children">
          {entries.map(([key, child]) => (
            <div key={key}>
              <span className="json-key">{key}</span>: <JsonTree value={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
