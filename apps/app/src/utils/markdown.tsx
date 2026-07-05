import React from 'react';

const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-slate-100 text-rose-600 px-1 py-0.5 font-mono text-[10px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

export const renderMarkdown = (text: string) => {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const lang = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <pre
          key={idx}
          className="bg-slate-800 text-slate-100 p-2.5 my-2 overflow-x-auto text-[10px] font-mono leading-normal rounded-none"
        >
          {lang && <div className="text-[8px] text-slate-400 uppercase mb-1 font-sans">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
    }

    const lines = part.split('\n');

    // Check if this block contains a table (pipe syntax)
    const tableLines = lines.filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
    if (tableLines.length >= 3 && lines.some((l) => /^\|[\s:-]+\|/.test(l.trim()))) {
      const headerLine = lines.find((l) => l.trim().startsWith('|'));
      const separatorLine = lines.find((l) => /^\|[\s:-]+\|/.test(l.trim()));
      const bodyLines = lines.filter(
        (l) => l.trim().startsWith('|') && l !== separatorLine && l !== headerLine,
      );

      if (headerLine && separatorLine) {
        const headers = headerLine
          .trim()
          .split('|')
          .map((h) => h.trim())
          .filter(Boolean);
        const rows = bodyLines.map((l) =>
          l
            .trim()
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean),
        );

        return (
          <div key={`table-${idx}`} className="my-2 overflow-x-auto">
            <table className="w-full text-[11px] font-sans border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="border border-slate-300 px-3 py-1.5 text-left font-bold text-slate-700"
                    >
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-slate-300 px-3 py-1 text-slate-700">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    return lines.map((line, lIdx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={lIdx} className="text-xs font-mono font-bold text-slate-900 mt-2 mb-1">
            {parseInline(trimmed.slice(2))}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={lIdx} className="text-[11px] font-mono font-bold text-slate-900 mt-2 mb-1">
            {parseInline(trimmed.slice(3))}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={lIdx} className="text-[10px] font-mono font-bold text-slate-800 mt-1.5 mb-0.5">
            {parseInline(trimmed.slice(4))}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <ul key={lIdx} className="list-disc pl-4 text-[11px] text-slate-700 my-0.5">
            <li>{parseInline(trimmed.slice(2))}</li>
          </ul>
        );
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <ol key={lIdx} className="list-decimal pl-4 text-[11px] text-slate-700 my-0.5">
            <li>{parseInline(numMatch[2])}</li>
          </ol>
        );
      }

      if (!trimmed) {
        return <div key={lIdx} className="h-1.5" />;
      }

      return (
        <p key={lIdx} className="my-0.5 text-[11px] text-slate-850 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    });
  });
};
