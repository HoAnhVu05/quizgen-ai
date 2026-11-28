import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

export interface MathRendererProps {
  content?: string | null;
  className?: string;
  inline?: boolean;
}

export interface MathSegment {
  type: 'text' | 'inline' | 'block';
  value: string;
}

/**
 * Phân tích chuỗi văn bản chứa công thức Toán/Lý thành các phân đoạn:
 * - Block math: $$...$$ hoặc \[...\]
 * - Inline math: $...$ hoặc \(...\)
 * - Văn bản thông thường
 */
export const parseMathSegments = (rawText: string): MathSegment[] => {
  if (!rawText) return [];

  // Regex nhận diện Block Math ($$...$$ hoặc \[...\]) và Inline Math ($...$ hoặc \(...\))
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$(?:\\\$|[^\$\n])+\$|\\\([\s\S]+?\\\))/g;
  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: rawText.substring(lastIndex, match.index),
      });
    }

    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      segments.push({
        type: 'block',
        value: token.slice(2, -2).trim(),
      });
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      segments.push({
        type: 'block',
        value: token.slice(2, -2).trim(),
      });
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const inner = token.slice(1, -1).trim();
      const vnRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
      if (vnRegex.test(inner)) {
        // Phân đoạn bị lỗi do LLM/AI để hở dấu $ bọc cả văn bản tiếng Việt (tránh bị KaTeX ép liền chữ)
        const subRegex = /((?:[a-zA-Z0-9_\^\{\}\(\)]+\s*)?(?:\\neq|\\le|\\ge|\\in|\\notin|=|≠|≤|≥|<|>)\s*(?:[a-zA-Z0-9_\^\{\}\(\)]+)?|\\[a-zA-Z]+(?:\{[^{}]*\}|_[a-zA-Z0-9{}]+|\^[a-zA-Z0-9{}]+)*(?:\s+[a-zA-Z0-9\(\)]+)*)/g;
        let subLast = 0;
        let subMatch: RegExpExecArray | null;
        while ((subMatch = subRegex.exec(inner)) !== null) {
          if (subMatch.index > subLast) {
            const prose = inner.substring(subLast, subMatch.index);
            if (prose) {
              segments.push({ type: 'text', value: prose });
            }
          }
          segments.push({ type: 'inline', value: subMatch[0].trim() });
          subLast = subRegex.lastIndex;
        }
        if (subLast < inner.length) {
          const prose = inner.substring(subLast);
          if (prose) {
            segments.push({ type: 'text', value: prose });
          }
        }
      } else {
        segments.push({
          type: 'inline',
          value: inner,
        });
      }
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      segments.push({
        type: 'inline',
        value: token.slice(2, -2).trim(),
      });
    }

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    segments.push({
      type: 'text',
      value: rawText.substring(lastIndex),
    });
  }

  return segments;
};

/**
 * Component hiển thị công thức Toán học, Vật lý và Kỹ thuật chuẩn KaTeX siêu sắc nét:
 * - Tự động tách text và công thức $...$ / $$...$$
 * - Chống tràn layout với thanh cuộn mượt cho công thức dài
 * - Xử lý fallback an toàn nếu cú pháp LaTeX bị lỗi
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  inline = false,
}) => {
  if (!content) return null;

  // Fast-path: Nếu chuỗi không chứa dấu công thức, render text thuần để đạt hiệu năng tối đa
  if (!content.includes('$') && !content.includes('\\(') && !content.includes('\\[')) {
    return <span className={className}>{content}</span>;
  }

  const segments = useMemo(() => parseMathSegments(content), [content]);

  const renderedContent = segments.map((seg, idx) => {
    if (seg.type === 'text') {
      return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
    }

    if (seg.type === 'block') {
      return (
        <span
          key={idx}
          className="block my-2 overflow-x-auto overflow-y-hidden max-w-full text-center py-1 math-block-scroll"
        >
          <BlockMath
            math={seg.value}
            renderError={(error: any) => (
              <span
                className="text-rose-500 font-mono text-xs px-1.5 py-0.5 bg-rose-50 rounded border border-rose-200"
                title={error.message}
              >
                {seg.value}
              </span>
            )}
          />
        </span>
      );
    }

    // Inline math: căn chỉnh line-height và lề sắc nét với văn bản tiếng Việt
    return (
      <span key={idx} className="inline-math-wrapper mx-0.5 inline-block align-baseline">
        <InlineMath
          math={seg.value}
          renderError={(error: any) => (
            <span
              className="text-rose-500 font-mono text-xs px-1 py-0.5 bg-rose-50 rounded border border-rose-200"
              title={error.message}
            >
              {seg.value}
            </span>
          )}
        />
      </span>
    );
  });

  const Wrapper = inline ? 'span' : 'span';

  return (
    <Wrapper className={`math-renderer select-text ${inline ? 'inline' : 'inline-block'} ${className}`}>
      {renderedContent}
    </Wrapper>
  );
};

export default MathRenderer;
