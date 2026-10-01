"use client";

import { useState } from "react";
import { type TreeNode } from "@/lib/tree";

function Folder({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selected: string;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  if (node.isFile) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`flex w-full items-center gap-1.5 rounded-sm py-1 text-left font-mono text-xs transition-colors ${
          selected === node.path
            ? "bg-[var(--accent)]/15 text-[var(--accent)]"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
      >
        <span className="opacity-60">·</span>
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className="flex w-full items-center gap-1.5 rounded-sm py-1 text-left font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
      >
        <span className="w-3 shrink-0 opacity-60">{open ? "▾" : "▸"}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {open &&
        node.children.map((child) => (
          <Folder key={child.path} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
        ))}
    </div>
  );
}

export default function FileTree({
  tree,
  selected,
  onSelect,
}: {
  tree: TreeNode[];
  selected: string;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <Folder key={node.path} node={node} depth={0} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  );
}