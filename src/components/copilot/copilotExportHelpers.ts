import apiClient, { API_BASE } from '../../services/apiClient';
import { RawQuestionPayload } from '../QuantaMarkdownRenderer';

export async function downloadQuestionsAsDocx(
  title: string,
  questions: RawQuestionPayload[],
  preGeneratedUrl?: string
): Promise<boolean> {
  if (!questions || questions.length === 0) return false;

  // Nếu backend tool `export_questions_docx` đã tạo sẵn file trên disk
  if (preGeneratedUrl) {
    try {
      const targetUrl = preGeneratedUrl.startsWith('http')
        ? preGeneratedUrl
        : preGeneratedUrl.startsWith('/api/v1')
        ? `${API_BASE.replace(/\/api\/v1$/, '')}${preGeneratedUrl}`
        : `${API_BASE}${preGeneratedUrl}`;
      const res = await apiClient.fetch(targetUrl, { method: 'GET' });
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, `${sanitizeFilename(title)}.docx`);
        return true;
      }
    } catch {}
  }

  // Gọi trực tiếp endpoint /ai/chat/export-docx
  try {
    const res = await apiClient.fetch(`${API_BASE}/ai/chat/export-docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, questions }),
    });
    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${sanitizeFilename(title)}.docx`);
      return true;
    }
  } catch (err) {
    console.warn('Export docx API fallback:', err);
  }

  // Fallback client-side Word-compatible HTML (.doc) nếu server đang ngoại tuyến
  const html = buildPrintableHtml(title, questions);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  triggerBlobDownload(blob, `${sanitizeFilename(title)}.doc`);
  return true;
}

export function quickPrintQuestions(title: string, questions: RawQuestionPayload[]): void {
  if (!questions || questions.length === 0) return;
  const win = window.open('', '_blank', 'width=850,height=900');
  if (!win) return;
  win.document.write(buildPrintableHtml(title, questions));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function sanitizeFilename(name: string): string {
  return (name || 'quanta_exam').replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]+/g, '_').slice(0, 60) || 'quanta_exam';
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPrintableHtml(title: string, questions: RawQuestionPayload[]): string {
  const rows = questions
    .map((q, idx) => {
      const opts = (q.options || [])
        .map((o, i) => {
          const lbl = typeof o === 'string' ? String.fromCharCode(65 + i) : o.label || o.id || String.fromCharCode(65 + i);
          const txt = typeof o === 'string' ? o : o.text || '';
          return `<div style="margin-left:18px;"><b>${escapeHtml(lbl)}.</b> ${escapeHtml(txt)}</div>`;
        })
        .join('');
      return `<div style="margin-bottom:14px;">
        <div><b>Câu ${idx + 1}</b>${q.bloomLevel ? ` <i>[${escapeHtml(q.bloomLevel)}]</i>` : ''}: ${escapeHtml(q.question)}</div>
        ${opts}
      </div>`;
    })
    .join('');

  const answers = questions
    .map((q, idx) => `<div><b>Câu ${idx + 1}:</b> Đáp án <b>${escapeHtml(q.correctAnswerId || '')}</b>${q.explanation ? ` — ${escapeHtml(q.explanation)}` : ''}</div>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>body{font-family:'Times New Roman',serif;font-size:13pt;line-height:1.45;padding:24px;color:#111;}h1{text-align:center;font-size:16pt;}hr{margin:20px 0;}</style>
    </head><body><h1>${escapeHtml(title)}</h1>${rows}<hr/><h3>ĐÁP ÁN &amp; GIẢI THÍCH</h3>${answers}</body></html>`;
}
