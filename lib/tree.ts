export type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
};

// Turn a flat list of file paths into a nested folder/file tree
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let node = root;

    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);

      if (!child) {
        child = { name: part, path, isFile, children: [] };
        node.children.push(child);
      }
      node = child;
    });
  }

  // Folders first, then files, both alphabetically
  const sortNode = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortNode);
  };
  sortNode(root);

  return root.children;
}