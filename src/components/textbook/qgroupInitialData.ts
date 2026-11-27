import { QGroup, QGroupInvitation } from './types';

export const INITIAL_QGROUPS: QGroup[] = [
  {
    id: 'qg-1',
    code: 'QGRP-OS2026',
    name: 'Bộ Môn Mạng & Hệ Điều Hành',
    department: 'Khoa Công nghệ Thông tin',
    description: 'Không gian làm việc chung của giảng viên bộ môn: trao đổi ngân hàng câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi kỳ này.',
    ownerEmail: 'vuha3608@ut.edu.vn',
    ownerName: 'TS. Hồ Anh Vũ',
    joinPolicy: 'approval_required',
    memberCount: 4,
    members: ['vuha3608@ut.edu.vn', 'nguyentann0804@gmail.com', 'ducngocong@ut.edu.vn', 'lecturer@quizgen.ai'],
    pendingRequests: [
      {
        id: 'req-1',
        email: 'thanhnt@ut.edu.vn',
        name: 'ThS. Nguyễn Tiến Thành',
        title: 'Giảng viên',
        requestedAt: '17/11/2026 10:15'
      }
    ],
    messages: [
      {
        id: 'msg-1',
        senderEmail: 'vuha3608@ut.edu.vn',
        senderName: 'TS. Hồ Anh Vũ',
        senderTitle: 'Trưởng bộ môn',
        avatarColor: 'bg-teal-600',
        text: 'Chào quý Thầy/Cô! Kỳ này bộ môn chúng ta thống nhất dùng chung giáo trình Chuẩn Operating System Concepts 10th để sinh đề thi trắc nghiệm nhé.',
        timestamp: '09:15',
        attachment: {
          type: 'textbook',
          id: 'tb-002',
          name: '2018-Operating System Concepts-10th.pdf',
          size: '29.7 MB',
          totalPages: 1278,
          authorName: 'TS. Hồ Anh Vũ'
        }
      },
      {
        id: 'msg-2',
        senderEmail: 'nguyentann0804@gmail.com',
        senderName: 'ThS. Nguyễn Tấn',
        senderTitle: 'Giảng viên',
        avatarColor: 'bg-blue-600',
        text: 'Em đã dùng AI sinh xong bộ 40 câu hỏi trắc nghiệm chương 3 & 4 (Deadlock & Memory Management) đạt chuẩn Bloom C3-C4, em gửi lên nhóm cho thầy cô thẩm định và dùng chung ạ!',
        timestamp: '09:40',
        attachment: {
          type: 'exam',
          id: 'exam-os-midterm-40q',
          name: 'Đề Thi Giữa Kỳ Môn Hệ Điều Hành - 40 Câu Chuẩn',
          subject: 'Hệ Điều Hành & Mạng',
          questionCount: 40,
          durationMinutes: 60,
          authorName: 'ThS. Nguyễn Tấn'
        }
      },
      {
        id: 'msg-3',
        senderEmail: 'system',
        senderName: 'Hệ Thống Q-Group',
        isSystem: true,
        text: 'ThS. Nguyễn Tấn vừa chia sẻ Bộ đề thi vào không gian chung của nhóm.',
        timestamp: '09:40'
      }
    ]
  },
  {
    id: 'qg-2',
    code: 'QGRP-AI2026',
    name: 'Tổ Bộ Môn Trí Tuệ Nhân Tạo',
    department: 'Khoa Công nghệ Thông tin',
    description: 'Trao đổi ngân hàng câu hỏi môn Trí tuệ nhân tạo, Học máy & Xử lý ngôn ngữ tự nhiên.',
    ownerEmail: 'lecturer@quizgen.ai',
    ownerName: 'ThS. Lê Hoàng Nam',
    joinPolicy: 'open',
    memberCount: 3,
    members: ['lecturer@quizgen.ai', 'vuha3608@ut.edu.vn', 'ducngocong@ut.edu.vn'],
    pendingRequests: [],
    messages: [
      {
        id: 'msg-ai-1',
        senderEmail: 'lecturer@quizgen.ai',
        senderName: 'ThS. Lê Hoàng Nam',
        senderTitle: 'Giảng viên',
        avatarColor: 'bg-purple-600',
        text: 'Kính gửi quý Thầy Cô ma trận 50 câu trắc nghiệm Deep Learning và Transformer chuẩn bị cho kỳ kiểm tra giữa kỳ sắp tới.',
        timestamp: 'Hôm qua 16:30'
      }
    ]
  }
];

export const INITIAL_GROUP_INVITATIONS: QGroupInvitation[] = [
  {
    id: 'inv-init-1',
    groupId: 'qg-1',
    groupName: 'Bộ Môn Mạng & Hệ Điều Hành',
    groupCode: 'QGRP-OS2026',
    department: 'Khoa Công nghệ Thông tin',
    inviterName: 'TS. Hồ Anh Vũ',
    inviterEmail: 'vuha3608@ut.edu.vn',
    targetEmail: 'lecturer@quizgen.ai',
    invitedAt: '18/11/2026 08:30',
    status: 'pending'
  }
];
