import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/apiClient';
import { ScreenId } from '../../types';

/**
 * Synchronizes personal & shared textbooks and tracks the currently active book for Quanta context.
 */
export function useCopilotDocuments(isOpen: boolean, currentScreen: ScreenId) {
  const [uploadedBooks, setUploadedBooks] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
    } catch {
      return [];
    }
  });

  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    return localStorage.getItem('quizgen_selected_book_id') || '';
  });

  useEffect(() => {
    const handleBookSelected = (e: any) => {
      const doc = e.detail;
      if (doc && doc.id) {
        setSelectedBookId(doc.id);
        setUploadedBooks((prev) => {
          if (prev.some((b: any) => b.id === doc.id)) {
            return prev.map((b: any) =>
              b.id === doc.id
                ? { ...b, name: doc.name || b.name, totalPages: doc.totalPages || b.totalPages }
                : b
            );
          }
          return [
            {
              id: doc.id,
              name: doc.name || 'Tài liệu giáo trình',
              totalPages: doc.totalPages || 120,
              chaptersCount: 4,
              isShared: false,
            },
            ...prev,
          ];
        });
      }
    };
    window.addEventListener('quizgen_book_selected', handleBookSelected);
    return () => window.removeEventListener('quizgen_book_selected', handleBookSelected);
  }, []);

  useEffect(() => {
    const applySelection = (list: any[]) => {
      const selId = localStorage.getItem('quizgen_selected_book_id');
      const selName = localStorage.getItem('quizgen_selected_book_name');

      if (selId && list.some((b) => b.id === selId)) {
        setSelectedBookId(selId);
      } else if (selName && list.some((b) => b.name === selName)) {
        const found = list.find((b) => b.name === selName);
        if (found) setSelectedBookId(found.id);
      } else if (selId) {
        setSelectedBookId(selId);
      } else if (list.length > 0) {
        setSelectedBookId(list[0].id);
      }
    };

    const syncRealDocuments = async () => {
      try {
        const [myRes, sharedRes] = await Promise.all([
          apiClient.get<any[]>('/documents/documents?scope=my').catch(() =>
            apiClient.get<any[]>('/documents?scope=my').catch(() => [])
          ),
          apiClient.get<any[]>('/documents/documents?scope=shared').catch(() =>
            apiClient.get<any[]>('/documents?scope=shared').catch(() => [])
          ),
        ]);

        const rawList = [
          ...(Array.isArray(myRes) ? myRes : []),
          ...(Array.isArray(sharedRes) ? sharedRes : []),
        ];

        if (rawList.length > 0) {
          const normalized = rawList
            .filter(Boolean)
            .map((b: any) => ({
              id: String(b.id),
              name: String(b.name || b.title || 'Tài liệu giáo trình'),
              totalPages: Number(b.totalPages || b.total_pages || 120),
              chaptersCount: Number(b.chaptersCount || b.chapters_count || 4),
              isShared: Boolean(b.isShared || b.is_shared),
            }));

          const unique = normalized.filter(
            (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
          );

          setUploadedBooks(unique);
          try {
            localStorage.setItem('quizgen_uploaded_documents', JSON.stringify(unique));
          } catch {}

          applySelection(unique);
          return;
        }
      } catch {}

      try {
        const books = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
        if (Array.isArray(books) && books.length > 0) {
          setUploadedBooks(books);
          applySelection(books);
        }
      } catch {}
    };

    syncRealDocuments();
  }, [isOpen, currentScreen]);

  const activeBook = useMemo(() => {
    if (selectedBookId) {
      const match = uploadedBooks.find((b: any) => b.id === selectedBookId || b.name === selectedBookId);
      if (match) return match;
    }

    const savedId = localStorage.getItem('quizgen_selected_book_id');
    const savedName = localStorage.getItem('quizgen_selected_book_name');
    const savedPages = localStorage.getItem('quizgen_selected_book_pages');

    if (savedName || savedId) {
      const matchSaved = uploadedBooks.find(
        (b: any) => (savedId && b.id === savedId) || (savedName && b.name === savedName)
      );
      if (matchSaved) return matchSaved;
      return {
        id: savedId || 'doc-active',
        name: savedName || 'Giáo trình đã chọn',
        totalPages: Number(savedPages) || 120,
      };
    }

    return uploadedBooks.length > 0 ? uploadedBooks[0] : null;
  }, [uploadedBooks, selectedBookId]);

  return { uploadedBooks, activeBook };
}
