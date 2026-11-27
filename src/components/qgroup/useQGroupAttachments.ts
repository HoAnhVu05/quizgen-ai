import { useState } from 'react';
import apiClient, { API_BASE } from '../../services/apiClient';
import { compressImageFile } from '../../utils/imageCompressor';
import type { UserSubscriptionInfo } from '../../types';

export interface SelectedAttachmentItem {
  type: 'textbook' | 'file' | 'image' | 'video' | 'audio';
  id: string;
  name: string;
  size: string;
  fileUrl?: string;
  fileType?: string;
  totalPages?: number;
  authorName?: string;
  duration?: number;
}

interface UseQGroupAttachmentsParams {
  subscriptionInfo?: UserSubscriptionInfo | null;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupAttachments({
  subscriptionInfo,
  onShowToast,
}: UseQGroupAttachmentsParams) {
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachmentItem[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const userPlanCode = (subscriptionInfo?.plan_code || 'FREE').toUpperCase();
  const isProUser = userPlanCode.includes('PRO') || userPlanCode.includes('VIP') || userPlanCode.includes('PLUS');
  const isEnterpriseUser = userPlanCode.includes('DEPT') || userPlanCode.includes('ENTERPRISE') || userPlanCode.includes('SCHOOL');

  const MAX_ATTACHMENTS_COUNT = 5;
  const MAX_SINGLE_FILE_SIZE_MB = isEnterpriseUser ? 100 : isProUser ? 50 : 25;
  const MAX_SINGLE_FILE_SIZE = MAX_SINGLE_FILE_SIZE_MB * 1024 * 1024;
  const MAX_TOTAL_BATCH_SIZE_MB = isEnterpriseUser ? 200 : isProUser ? 100 : 50;
  const MAX_TOTAL_BATCH_SIZE = MAX_TOTAL_BATCH_SIZE_MB * 1024 * 1024;

  const handleFilesSelect = async (rawFiles: File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const files: File[] = [];
    for (const f of rawFiles) {
      if (f.type.startsWith('image/')) {
        try {
          const compressed = await compressImageFile(f);
          files.push(compressed);
        } catch {
          files.push(f);
        }
      } else {
        files.push(f);
      }
    }

    if (selectedAttachments.length + files.length > MAX_ATTACHMENTS_COUNT) {
      onShowToast(
        'warning',
        'Quá số lượng tệp cho phép',
        `Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS_COUNT} tệp trong 1 tin nhắn. Hiện tại bạn đã chọn ${selectedAttachments.length} tệp.`
      );
      return;
    }

    for (const f of files) {
      if (f.size > MAX_SINGLE_FILE_SIZE) {
        const mb = (f.size / (1024 * 1024)).toFixed(1);
        onShowToast(
          'error',
          `Tệp vượt quá giới hạn ${MAX_SINGLE_FILE_SIZE_MB}MB`,
          `Tệp "${f.name}" (${mb}MB) vượt quá dung lượng tối đa cho phép là ${MAX_SINGLE_FILE_SIZE_MB}MB của gói ${userPlanCode}.`
        );
        return;
      }
    }

    const totalNewSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalNewSize > MAX_TOTAL_BATCH_SIZE) {
      const mbTotal = (totalNewSize / (1024 * 1024)).toFixed(1);
      onShowToast(
        'error',
        'Tổng dung lượng quá lớn',
        `Tổng dung lượng các tệp tải lên là ${mbTotal}MB, vượt quá mức tối đa ${MAX_TOTAL_BATCH_SIZE_MB}MB mỗi đợt của gói ${userPlanCode}.`
      );
      return;
    }

    setIsUploadingAttachment(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        const type = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

        const formattedSize =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        setUploadProgressText(`Đang tải (${i + 1}/${files.length}): ${file.name} (${formattedSize})...`);

        const formData = new FormData();
        formData.append('file', file);
        const resp = await apiClient.fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
          method: 'POST',
          body: formData,
        });

        let res: any = null;
        try {
          res = await resp.json();
        } catch {
          const rawText = await resp.text().catch(() => '');
          throw new Error(
            resp.status === 413
              ? `Tệp "${file.name}" vượt quá dung lượng cho phép của máy chủ.`
              : `Máy chủ phản hồi mã ${resp.status}: ${rawText.slice(0, 80) || 'Lỗi tải tệp'}`
          );
        }

        if (!resp.ok) {
          throw new Error(res?.detail || `Lỗi tải tệp ${file.name} (Mã ${resp.status})`);
        }

        if (res && res.fileUrl) {
          const newAtt: SelectedAttachmentItem = {
            type: (res.type || type) as 'textbook' | 'file' | 'image' | 'video' | 'audio',
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: res.name || file.name,
            size: res.size || formattedSize,
            fileUrl: res.fileUrl,
            fileType: res.fileType || file.type,
          };
          setSelectedAttachments((prev) => [...prev, newAtt]);
          successCount++;
        } else {
          throw new Error(res?.detail || `Không thể tải lên tệp ${file.name}`);
        }
      }

      onShowToast(
        'success',
        'Đã tải tệp lên thành công',
        files.length === 1
          ? `${files[0].name}`
          : `Đã gắn thành công ${successCount}/${files.length} tệp vào tin nhắn.`
      );
    } catch (err: any) {
      onShowToast('error', 'Lỗi tải tệp', err?.message || 'Không thể tải tệp lên máy chủ.');
    } finally {
      setIsUploadingAttachment(false);
      setUploadProgressText('');
    }
  };

  const handleFileSelect = async (file: File) => {
    return handleFilesSelect([file]);
  };

  const handleComposerPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const file = new File(
            [blob],
            `screenshot-${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-')}.png`,
            { type: blob.type }
          );
          void handleFileSelect(file);
          onShowToast('info', 'Đã dán ảnh', 'Ảnh chụp màn hình đã được đính kèm.');
          break;
        }
      }
    }
  };

  return {
    selectedAttachments,
    setSelectedAttachments,
    selectedAttachment: selectedAttachments[0] || null,
    isUploadingAttachment,
    uploadProgressText,
    handleFilesSelect,
    handleFileSelect,
    handleComposerPaste,
  };
}
