import React from 'react';
import apiClient, { API_BASE } from '../../services/apiClient';
import { ScreenId, UserProfile, Question } from '../../types';
import { QuantaAction } from '../QuantaMarkdownRenderer';
import { ChatAttachment, ChatMessage } from './types';

export const buildCopilotRequestBody = (params: {
  text: string;
  messages: ChatMessage[];
  attachments: ChatAttachment[];
  currentScreen: ScreenId;
  screenLabel: string;
  userName: string;
  currentUser: UserProfile | null;
  activeBook: any;
  uploadedBooks: any[];
  effectiveActiveQuestion: Question | null;
}): string => {
  const {
    text,
    messages,
    attachments,
    currentScreen,
    screenLabel,
    userName,
    currentUser,
    activeBook,
    uploadedBooks,
    effectiveActiveQuestion,
  } = params;

  return JSON.stringify({
    message: text,
    history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    context: {
      currentScreen,
      screenLabel,
      userName,
      userEmail: currentUser?.email || null,
      academicTitle: currentUser?.academicTitle || null,
      documentId: activeBook?.id || null,
      documentName: activeBook?.name || null,
      documentPages: activeBook?.totalPages || null,
      allDocuments: uploadedBooks.map((b: any) => ({
        id: b.id,
        name: b.name,
        totalPages: b.totalPages,
        chaptersCount: b.chaptersCount,
      })),
      activeQuestion: effectiveActiveQuestion
        ? {
            id: effectiveActiveQuestion.id,
            question: effectiveActiveQuestion.question,
            bloomLevel: effectiveActiveQuestion.bloomLevel,
            correctAnswerId: effectiveActiveQuestion.correctAnswerId,
            explanation: effectiveActiveQuestion.explanation,
            options: effectiveActiveQuestion.options,
          }
        : null,
    },
    attachments: attachments.map((a) => ({
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
      data: a.data,
      textContent: a.textContent,
    })),
  });
};

export const readChatFiles = async (
  fileList: FileList | File[],
  existingCount: number,
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void
): Promise<ChatAttachment[]> => {
  const filesArr = Array.from(fileList);
  const nextAttachments: ChatAttachment[] = [];

  for (const file of filesArr) {
    if (existingCount + nextAttachments.length >= 5) {
      onShowToast?.('warning', 'Giới hạn tệp đính kèm', 'Chỉ có thể đính kèm tối đa 5 tệp mỗi lượt gửi.');
      break;
    }

    const mime = file.type || '';
    const isImage = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isText =
      mime.startsWith('text/') ||
      /\.(txt|md|csv|json|py|ts|tsx|js|jsx|html|css|xml|yaml|yml)$/i.test(file.name);

    if (!isImage && !isPdf && !isText) {
      onShowToast?.('warning', 'Định dạng chưa hỗ trợ', `Tệp "${file.name}" không thuộc nhóm Ảnh, PDF hoặc Văn bản.`);
      continue;
    }

    const maxBytes = isPdf ? 10 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      onShowToast?.('warning', 'Tệp quá lớn', `Tệp "${file.name}" vượt quá giới hạn ${isPdf ? '10MB' : '8MB'}.`);
      continue;
    }

    if (isText) {
      const textContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsText(file);
      });
      nextAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        mimeType: mime || 'text/plain',
        size: file.size,
        textContent,
      });
    } else {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      nextAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        mimeType: isPdf ? 'application/pdf' : mime,
        size: file.size,
        data: dataUrl,
      });
    }
  }

  return nextAttachments;
};

interface StreamReplyParams {
  requestBody: string;
  signal: AbortSignal;
  botMsgId: string;
  setStreamStatus: (status: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export interface StreamReplyResult {
  replyContent: string;
  suggestions: string[];
  structuredActions: QuantaAction[];
  ragSources: any[];
  streamedSuccessfully: boolean;
}

export const streamCopilotReply = async ({
  requestBody,
  signal,
  botMsgId,
  setStreamStatus,
  setMessages,
}: StreamReplyParams): Promise<StreamReplyResult> => {
  let replyContent = '';
  let suggestions: string[] = [];
  let structuredActions: QuantaAction[] = [];
  let ragSources: any[] = [];
  let streamedSuccessfully = false;

  const streamRes = await apiClient.fetch(`${API_BASE}/ai/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody,
    signal,
  });

  if (!streamRes.ok || !streamRes.body) {
    return { replyContent, suggestions, structuredActions, ragSources, streamedSuccessfully };
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let botBubbleCreated = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      try {
        const ev = JSON.parse(jsonStr);
        if (ev.type === 'status') {
          setStreamStatus(ev.message || 'Quanta đang xử lý...');
        } else if (ev.type === 'chunk') {
          replyContent += ev.text || '';
          if (!botBubbleCreated) {
            botBubbleCreated = true;
            setMessages((prev) => [
              ...prev,
              {
                id: botMsgId,
                role: 'assistant',
                content: replyContent,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === botMsgId ? { ...m, content: replyContent } : m))
            );
          }
        } else if (ev.type === 'done') {
          replyContent = ev.reply || replyContent;
          structuredActions = Array.isArray(ev.actions) ? ev.actions : [];
          suggestions = Array.isArray(ev.suggestedActions) ? ev.suggestedActions : [];
          ragSources = Array.isArray(ev.ragSources) ? ev.ragSources : [];
          streamedSuccessfully = true;

          if (!botBubbleCreated) {
            botBubbleCreated = true;
            setMessages((prev) => [
              ...prev,
              {
                id: botMsgId,
                role: 'assistant',
                content: replyContent,
                actions: structuredActions,
                suggestedActions: suggestions,
                ragSources,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId
                  ? { ...m, content: replyContent, actions: structuredActions, suggestedActions: suggestions, ragSources }
                  : m
              )
            );
          }
        }
      } catch {}
    }
  }

  return { replyContent, suggestions, structuredActions, ragSources, streamedSuccessfully };
};

export const buildCopilotErrorMessage = (userText: string): ChatMessage => {
  const isSupportQuery = /thanh toán|nạp tiền|lỗi|support|hỗ trợ|liên hệ|hotline|zalo|gói|tiền/i.test(userText);
  const errorContent = isSupportQuery
    ? `Dạ Thầy/Cô đang gặp sự cố thanh toán hoặc cần hỗ trợ kỹ thuật? Quanta đã kích hoạt kênh tiếp nhận khẩn cấp:\n\n` +
      `• **Hotline / Zalo hỗ trợ kỹ thuật:** **0364591363**\n` +
      `• **Email đối soát:** quizgen.ai.team@gmail.com\n\n` +
      `\`\`\`action:support_ticket\n{\n  "title": "Yêu cầu hỗ trợ kỹ thuật & đối soát",\n  "category": "payment",\n  "description": "Người dùng gửi yêu cầu hỗ trợ sự cố từ khung chat Quanta Copilot."\n}\n\`\`\`\n\n` +
      `*Thầy/Cô có thể bấm 'Gửi Ticket' ở thẻ trên hoặc nhắn trực tiếp qua Zalo 0364591363 để được xử lý ngay trong 5-15 phút ạ!*`
    : 'Không thể kết nối tới máy chủ AI Copilot. Vui lòng kiểm tra lại dịch vụ hoặc thử các tùy chọn bên dưới.';

  return {
    id: `bot-${Date.now()}`,
    role: 'assistant',
    content: errorContent,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    suggestedActions: isSupportQuery
      ? ['📞 Zalo: 0364591363', '📧 quizgen.ai.team@gmail.com', '💳 Đối soát chuyển khoản']
      : ['💡 Thử lại', '📊 Tư vấn ma trận Bloom', '🖨️ Xuất đề thi'],
  };
};
