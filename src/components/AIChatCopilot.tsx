import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { AIChatCopilotProps, SCREEN_LABELS, getUserHonorific } from './copilot/types';
import { useDraggableFab } from './copilot/useDraggableFab';
import { useCopilotDocuments } from './copilot/useCopilotDocuments';
import { useCopilotChat } from './copilot/useCopilotChat';
import { useCopilotActions } from './copilot/useCopilotActions';
import { CopilotFab } from './copilot/CopilotFab';
import { CopilotHeader } from './copilot/CopilotHeader';
import { CopilotMessageList } from './copilot/CopilotMessageList';
import { CopilotInputBar } from './copilot/CopilotInputBar';

export type { ChatAttachment } from './copilot/types';

export const AIChatCopilot: React.FC<AIChatCopilotProps> = ({
  currentScreen,
  currentUser,
  activeQuestion,
  onNavigate,
  onGenerateSuccess,
  onUpdateQuestion,
  onShowToast,
}) => {
  const { activeThemeId } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissedQuestionId, setDismissedQuestionId] = useState<string | null>(null);

  const effectiveActiveQuestion =
    activeQuestion && activeQuestion.id !== dismissedQuestionId ? activeQuestion : null;

  const screenLabel = SCREEN_LABELS[currentScreen] || 'Không gian làm việc';
  const userName = currentUser?.academicTitle
    ? `${currentUser.academicTitle} ${currentUser.fullName}`
    : currentUser?.fullName || 'Thầy/Cô';
  const userHonorific = getUserHonorific(currentUser);

  const { fabElementRef, snapSide, isCurrentlyDragging, fabStyle, handlePointerDown } =
    useDraggableFab({
      onOpenChat: () => {
        setIsOpen(true);
        setIsMinimized(false);
      },
    });

  const { uploadedBooks, activeBook } = useCopilotDocuments(isOpen, currentScreen);

  const {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isLoading,
    streamStatus,
    pendingAttachments,
    setPendingAttachments,
    academicMemory,
    textareaRef,
    loadAcademicMemory,
    handleResetAcademicMemory,
    handleAddChatFiles,
    handleStopStreaming,
    handleSendMessage,
    handleClearHistory,
  } = useCopilotChat({
    isOpen,
    isMinimized,
    currentScreen,
    screenLabel,
    currentUser,
    userHonorific,
    userName,
    activeBook,
    uploadedBooks,
    effectiveActiveQuestion,
    onShowToast,
  });

  const {
    handleSubmitSupportTicket,
    handlePatchQuestion,
    handleImportExam,
    handleAutoGenerateExam,
    processStructuredOrFallbackActions,
  } = useCopilotActions({
    currentScreen,
    screenLabel,
    currentUser,
    userHonorific,
    activeBook,
    activeQuestion,
    messages,
    setMessages,
    onNavigate,
    onGenerateSuccess,
    onUpdateQuestion,
    onShowToast,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUpRef.current = distanceFromBottom > 120;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      isUserScrolledUpRef.current = false;
      const instantScroll = () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      };

      instantScroll();
      const raf = requestAnimationFrame(instantScroll);
      const t1 = setTimeout(instantScroll, 40);
      const t2 = setTimeout(instantScroll, 120);
      const t3 = setTimeout(instantScroll, 320);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') {
      isUserScrolledUpRef.current = false;
      const raf = requestAnimationFrame(() => scrollToBottom('auto'));
      return () => cancelAnimationFrame(raf);
    }
    if (!isUserScrolledUpRef.current) {
      const timer = setTimeout(() => scrollToBottom('smooth'), 40);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, isOpen, isMinimized, scrollToBottom]);

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <CopilotFab
        fabElementRef={fabElementRef}
        fabStyle={fabStyle}
        snapSide={snapSide}
        isCurrentlyDragging={isCurrentlyDragging}
        isOpen={isOpen}
        activeThemeId={activeThemeId}
        onPointerDown={handlePointerDown}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDraggingFile) setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDraggingFile(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void handleAddChatFiles(e.dataTransfer.files);
          }
        }}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (isOpen && !isMinimized) {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
          }
        }}
        className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 ${
          isWide ? 'sm:w-[540px]' : 'sm:w-96'
        } ${
          snapSide === 'left'
            ? 'sm:left-6 sm:right-auto origin-bottom-left'
            : 'sm:right-6 sm:left-auto origin-bottom-right'
        } ${
          isMinimized ? 'h-14 sm:h-16' : 'h-[540px] max-h-[82vh] sm:max-h-[85vh]'
        } ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto translate-y-0' : 'scale-0 opacity-0 pointer-events-none translate-y-4'
        }`}
      >
        <CopilotHeader
          screenLabel={screenLabel}
          isMinimized={isMinimized}
          isWide={isWide}
          showMemoryPanel={showMemoryPanel}
          academicMemory={academicMemory}
          isDraggingFile={isDraggingFile}
          effectiveActiveQuestion={effectiveActiveQuestion}
          onToggleMemoryPanel={() => {
            const next = !showMemoryPanel;
            setShowMemoryPanel(next);
            if (next) void loadAcademicMemory();
          }}
          onResetMemory={() => void handleResetAcademicMemory()}
          onToggleWide={() => setIsWide((prev) => !prev)}
          onClearHistory={() => void handleClearHistory()}
          onToggleMinimize={() => setIsMinimized((prev) => !prev)}
          onClose={() => setIsOpen(false)}
          onDismissQuestion={(id) => setDismissedQuestionId(id)}
        />

        {!isMinimized && (
          <>
            <CopilotMessageList
              chatContainerRef={chatContainerRef}
              messagesEndRef={messagesEndRef}
              messages={messages}
              isLoading={isLoading}
              streamStatus={streamStatus}
              copiedId={copiedId}
              onScroll={handleChatScroll}
              onMediaLoad={() => {
                if (!isUserScrolledUpRef.current) scrollToBottom('auto');
              }}
              onCopy={handleCopy}
              onSelectSuggestion={(action) => {
                isUserScrolledUpRef.current = false;
                void handleSendMessage(processStructuredOrFallbackActions, action);
              }}
              onNavigate={onNavigate}
              onSubmitTicket={handleSubmitSupportTicket}
              onAutoGenerateExam={handleAutoGenerateExam}
              onPatchQuestion={handlePatchQuestion}
              onImportExam={handleImportExam}
            />

            <CopilotInputBar
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              pendingAttachments={pendingAttachments}
              onRemoveAttachment={(id) => setPendingAttachments((prev) => prev.filter((p) => p.id !== id))}
              onAddFiles={(files) => void handleAddChatFiles(files)}
              isLoading={isLoading}
              textareaRef={textareaRef}
              onSend={() => {
                isUserScrolledUpRef.current = false;
                void handleSendMessage(processStructuredOrFallbackActions);
              }}
              onStopStreaming={handleStopStreaming}
            />
          </>
        )}
      </div>
    </>
  );
};
