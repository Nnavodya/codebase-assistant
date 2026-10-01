import Link from "next/link";

const LINKS = [
  {
    heading: "Project",
    items: [
      { label: "GitHub repository", href: "https://github.com/Nnavodya/codebase-assistant" },
      { label: "Open the app", href: "/assistant" },
    ],
  },
  {
    heading: "Built with",
    items: [
      { label: "Next.js", href: "https://nextjs.org" },
      { label: "Groq", href: "https://groq.com" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-(--border)">
            <div className="mx-auto max-w-6xl px-5 py-12">
        
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <p className="flex items-center gap-2 font-mono text-sm">
              <span className="text-(--accent)">◉</span> CodebaseAI
            </p>
            <p className="mt-2 max-w-[26ch] text-xs text-(--muted)">
              AI-powered code intelligence for exploring, explaining, and documenting real
              GitHub repositories.
            </p>
          </div>

          {LINKS.map((group) => (
            <div key={group.heading}>
              <p className="font-mono text-xs text-(--muted)">{group.heading}</p>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith("/") ? (
                      <Link
                        href={item.href}
                        className="text-xs text-(--muted) transition-colors hover:text-(--text)"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-(--muted) transition-colors hover:text-(--text)"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-(--border) pt-6 text-xs text-(--muted) sm:flex-row sm:items-center sm:justify-between">
          <p>Built by Nethmi Rajapaksha</p>
          <p className="font-mono">Next.js · TypeScript · GitHub API · RAG · Groq</p>
        </div>
      </div>
    </footer>
  );
}