import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const FormattedMessageText: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Phân tách khối code: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  const renderInlineSpans = (str: string) => {
    // 1: URL, 2: Bold, 3: Italic, 4: Inline Code, 5: @Mention
    const tokenRegex =
      /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(@(?:all|everyone|kênh|[a-zA-Z0-9_\.\u00C0-\u1EF9]+(?:\s+[A-Z\u00C0-\u1EF9][a-zA-Z0-9_\u00C0-\u1EF9]*)*))/g;
    const tokens: React.ReactNode[] = [];
    let cur = 0;
    let m: RegExpExecArray | null;

    while ((m = tokenRegex.exec(str)) !== null) {
      if (m.index > cur) {
        tokens.push(str.slice(cur, m.index));
      }
      const val = m[0];
      if (m[1]) {
        // Link web
        tokens.push(
          <a
            key={m.index}
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-teal-600 hover:text-teal-700 underline underline-offset-2 break-all font-semibold transition-colors inline-flex items-center gap-0.5"
            title={`Mở liên kết: ${val}`}
          >
            <span>{val}</span>
          </a>
        );
      } else if (m[2]) {
        // In đậm: **text**
        tokens.push(
          <strong key={m.index} className="font-bold text-slate-900">
            {val.slice(2, -2)}
          </strong>
        );
      } else if (m[3]) {
        // In nghiêng: *text*
        tokens.push(
          <em key={m.index} className="italic text-slate-800">
            {val.slice(1, -1)}
          </em>
        );
      } else if (m[4]) {
        // Inline code: `code`
        tokens.push(
          <code
            key={m.index}
            className="px-1.5 py-0.5 rounded text-[11.5px] font-mono bg-slate-100 text-rose-600 border border-slate-200"
          >
            {val.slice(1, -1)}
          </code>
        );
      } else if (m[5]) {
        // Tag / @mention thành viên
        const isBroadcast =
          val.toLowerCase() === '@all' ||
          val.toLowerCase() === '@everyone' ||
          val.toLowerCase() === '@kênh';
        tokens.push(
          <span
            key={m.index}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-xs transition-colors cursor-pointer select-text ${
              isBroadcast
                ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300 font-bold'
                : 'bg-teal-100/90 text-teal-800 ring-1 ring-teal-300 hover:bg-teal-200 shadow-2xs'
            }`}
          >
            {val}
          </span>
        );
      }
      cur = m.index + val.length;
    }
    if (cur < str.length) {
      tokens.push(str.slice(cur));
    }
    return tokens.length > 0 ? tokens : str;
  };

  const renderLines = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      if (line.startsWith('> ')) {
        // Trích dẫn
        return (
          <div
            key={lIdx}
            className="my-1.5 pl-3 py-1 border-l-4 border-teal-500 bg-teal-50/40 rounded-r-lg text-slate-700 italic text-[12.5px]"
          >
            {renderInlineSpans(line.slice(2))}
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        // Gạch đầu dòng
        return (
          <div key={lIdx} className="flex items-start gap-2 my-0.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <span className="text-[13px] text-slate-800">{renderInlineSpans(line.slice(2))}</span>
          </div>
        );
      }
      return (
        <span key={lIdx} className="block min-h-[1.2em]">
          {renderInlineSpans(line)}
        </span>
      );
    });
  };

  return (
    <div className="text-[13px] text-slate-800 leading-relaxed font-normal break-words space-y-1">
      {parts.map((p, idx) => {
        if (p.type === 'code') {
          return (
            <div
              key={idx}
              className="my-2 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 shadow-xs"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-[11px] font-mono">
                <span className="uppercase font-semibold tracking-wider text-teal-400">
                  {p.language || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(p.content);
                    setCopiedIdx(idx);
                    setTimeout(() => setCopiedIdx(null), 2000);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-slate-300"
                  title="Sao chép mã"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-300 whitespace-pre leading-5">
                <code>{p.content}</code>
              </pre>
            </div>
          );
        }
        return <div key={idx}>{renderLines(p.content)}</div>;
      })}
    </div>
  );
};
