-- ====================================================================
-- SEED DATA: DỮ LIỆU MẪU HỌC THUẬT ĐẠI HỌC CHO PHÁT TRIỂN & KIỂM THỬ
-- ====================================================================

-- 1. Giảng viên mẫu (Auth)
INSERT INTO auth.users (id, email, password_hash, full_name, academic_title, university, department, role, is_active)
VALUES
    (
        'lec-001',
        'lecturer@vnu.edu.vn',
        '$2b$12$e6mZ603L0zGZ7NqI3YqB6eV5tSgM8Nqv5e9Y.X5mD3M3gQ0n2Kj1u', -- hashed of 'academic123'
        'Nguyễn Văn A',
        'TS.',
        'Đại học Quốc gia',
        'Khoa Kinh tế & Quản trị',
        'lecturer',
        TRUE
    ),
    (
        'lec-002',
        'tranthib@vnu.edu.vn',
        '$2b$12$e6mZ603L0zGZ7NqI3YqB6eV5tSgM8Nqv5e9Y.X5mD3M3gQ0n2Kj1u',
        'Trần Thị B',
        'PGS.TS.',
        'Đại học Quốc gia',
        'Khoa Công nghệ Thông tin',
        'lecturer',
        TRUE
    ),
    (
        'usr-lec-001',
        'lecturer@vnu.edu.vn',
        '$2b$12$e6mZ603L0zGZ7NqI3YqB6eV5tSgM8Nqv5e9Y.X5mD3M3gQ0n2Kj1u', -- academic123
        'Nguyễn Văn An',
        'TS.',
        'Đại học Quốc gia',
        'Khoa Công nghệ Thông tin',
        'lecturer',
        TRUE
    ),
    (
        'usr-head-001',
        'truongbomon@vnu.edu.vn',
        '$2b$12$e6mZ603L0zGZ7NqI3YqB6eV5tSgM8Nqv5e9Y.X5mD3M3gQ0n2Kj1u', -- academic123
        'Trần Thị Mai',
        'PGS. TS.',
        'Đại học Quốc gia',
        'Bộ môn Hệ thống Thông tin',
        'head_of_department',
        TRUE
    ),
    (
        'usr-adm-001',
        'admin.khaothi@vnu.edu.vn',
        '$2b$12$wG383cM4iGzK7Z7fH2VveODbN0kE5cW8E1L0r3O4J1u7s1m9k2j3a', -- admin123
        'Lê Hoàng Nam',
        'ThS.',
        'Đại học Quốc gia',
        'Phòng Khảo thí & Đảm bảo Chất lượng',
        'admin',
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- 2. Giáo trình mẫu (Documents)
INSERT INTO documents.documents (id, user_id, name, file_path, file_size, total_pages, chapters_count, status, progress)
VALUES
    (
        'tb-001',
        'lec-001',
        'GiaoTrinh_KinhTeViMo_2025.pdf',
        '/storage/textbooks/GiaoTrinh_KinhTeViMo_2025.pdf',
        '14.2 MB',
        320,
        12,
        'ready',
        100
    ),
    (
        'tb-002',
        'lec-001',
        'NguyenLy_KeToan_TaiChinh.docx',
        '/storage/textbooks/NguyenLy_KeToan_TaiChinh.docx',
        '8.7 MB',
        185,
        8,
        'ready',
        100
    )
ON CONFLICT (id) DO NOTHING;

-- Chương mục mẫu
INSERT INTO documents.document_chapters (id, document_id, chapter_index, title, page_start, page_end)
VALUES
    ('ch-1', 'tb-001', 1, 'Chương 1: Khái quát về kinh tế học vi mô', 1, 35),
    ('ch-2', 'tb-001', 2, 'Chương 2: Lý thuyết hành vi người tiêu dùng', 36, 68),
    ('ch-3', 'tb-001', 3, 'Chương 3: Cung - Cầu và Giá cả thị trường', 69, 115)
ON CONFLICT (id) DO NOTHING;

-- Chunk trích dẫn mẫu
INSERT INTO documents.document_chunks (id, document_id, page_number, chapter, char_count, text_snippet)
VALUES
    (
        'chunk-1',
        'tb-001',
        42,
        'Chương 3: Cung - Cầu và Giá cả thị trường',
        342,
        'Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.'
    ),
    (
        'chunk-2',
        'tb-001',
        45,
        'Chương 3: Cung - Cầu và Giá cả thị trường',
        318,
        'Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá của mặt hàng X tăng lên, người tiêu dùng có xu hướng giảm tiêu thụ X và chuyển sang sử dụng mặt hàng thay thế Y, làm cho lượng cầu của hàng hóa Y tăng lên dù giá của Y không đổi.'
    ),
    (
        'chunk-3',
        'tb-001',
        48,
        'Chương 3: Cung - Cầu và Giá cả thị trường',
        295,
        'Hệ số co giãn của cầu theo giá (Price Elasticity of Demand - PED) đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Nếu |PED| > 1, cầu được coi là co giãn nhiều (Elastic demand), việc giảm giá sẽ làm tăng tổng doanh thu (Total Revenue) của doanh nghiệp.'
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Mẫu Ma trận Bloom Presets (AI)
INSERT INTO ai.bloom_presets (id, name, description, nhan_biet_pct, thong_hieu_pct, van_dung_pct, phan_tich_pct, is_default)
VALUES
    ('preset-giua-ky', 'Đề thi Giữa kỳ', '40% Nhận biết, 40% Thông hiểu, 20% Vận dụng', 40, 40, 20, 0, TRUE),
    ('preset-cuoi-ky', 'Đề thi Cuối kỳ', '30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Phân tích', 30, 40, 20, 10, FALSE),
    ('preset-quiz-15p', 'Kiểm tra 15 phút', '70% Nhận biết, 30% Thông hiểu', 70, 30, 0, 0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 4. Ngân hàng câu hỏi mẫu (Exams)
INSERT INTO exams.questions (
    id, document_id, source_chunk_id, textbook_name, chapter, bloom_level, question_text,
    options, correct_answer_id, explanation, confidence_score, status, created_by
)
VALUES
    (
        'q-1',
        'tb-001',
        'chunk-1',
        'GiaoTrinh_KinhTeViMo_2025.pdf',
        'Chương 3: Cung - Cầu và Giá cả thị trường',
        'Nhận biết',
        'Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?',
        '[
            {"id": "opt-a", "label": "A", "text": "Khi giá hàng hóa tăng thì lượng cầu giảm xuống"},
            {"id": "opt-b", "label": "B", "text": "Khi giá hàng hóa tăng thì lượng cầu tăng lên"},
            {"id": "opt-c", "label": "C", "text": "Giá cả và lượng cầu luôn biến thiên cùng chiều"},
            {"id": "opt-d", "label": "D", "text": "Lượng cầu không chịu sự tác động của mức giá thị trường"}
        ]'::jsonb,
        'opt-a',
        'Quy luật cầu chỉ rõ mối quan hệ tỷ lệ nghịch giữa giá và lượng cầu (giá tăng thì lượng cầu giảm và ngược lại).',
        99,
        'approved',
        'lec-001'
    ),
    (
        'q-2',
        'tb-001',
        'chunk-2',
        'GiaoTrinh_KinhTeViMo_2025.pdf',
        'Chương 3: Cung - Cầu và Giá cả thị trường',
        'Thông hiểu',
        'Nếu trà và cà phê là hai hàng hóa thay thế cho nhau, điều gì sẽ xảy ra khi giá cà phê trên thị trường tăng vọt?',
        '[
            {"id": "opt-a", "label": "A", "text": "Đường cầu của cà phê dịch chuyển sang phải"},
            {"id": "opt-b", "label": "B", "text": "Lượng cầu về trà sẽ giảm sút nghiêm trọng"},
            {"id": "opt-c", "label": "C", "text": "Cầu về mặt hàng trà sẽ có xu hướng tăng lên"},
            {"id": "opt-d", "label": "D", "text": "Giá của cả hai mặt hàng sẽ lập tức giảm về 0"}
        ]'::jsonb,
        'opt-c',
        'Vì là hàng hóa thay thế, khi giá cà phê tăng, người tiêu dùng sẽ chuyển sang dùng trà, làm tăng nhu cầu về trà.',
        95,
        'pending',
        'lec-001'
    ),
    (
        'q-3',
        'tb-001',
        'chunk-3',
        'GiaoTrinh_KinhTeViMo_2025.pdf',
        'Chương 3: Cung - Cầu và Giá cả thị trường',
        'Vận dụng',
        'Một doanh nghiệp bán sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 1.8. Để tối đa hóa tổng doanh thu, doanh nghiệp này nên áp dụng chiến lược giá nào?',
        '[
            {"id": "opt-a", "label": "A", "text": "Tăng giá bán sản phẩm"},
            {"id": "opt-b", "label": "B", "text": "Giảm nhẹ giá bán sản phẩm"},
            {"id": "opt-c", "label": "C", "text": "Giữ nguyên giá bán và cắt giảm 50% sản lượng"},
            {"id": "opt-d", "label": "D", "text": "Tăng giá bán gấp đôi kết hợp giảm chi phí"}
        ]'::jsonb,
        'opt-b',
        'Khi cầu co giãn nhiều (|PED| > 1), tỷ lệ % thay đổi của lượng cầu lớn hơn tỷ lệ % thay đổi của giá. Do đó, giảm giá sẽ kích cầu mạnh và tăng tổng doanh thu.',
        92,
        'pending',
        'lec-001'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 5. Dữ liệu Danh mục Trường & Khoa (Universities & Faculties)
-- --------------------------------------------------------------------
INSERT INTO auth.universities (id, code, name, city, website)
VALUES
    ('uni-vnu', 'VNU', 'Đại học Quốc gia', 'Hà Nội', 'https://vnu.edu.vn'),
    ('uni-hust', 'HUST', 'Đại học Bách Khoa', 'Hà Nội', 'https://hust.edu.vn')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.faculties (id, university_id, code, name, dean_name)
VALUES
    ('fac-fba', 'uni-vnu', 'FBA', 'Khoa Kinh tế & Quản trị', 'PGS.TS. Trần Văn Nam'),
    ('fac-fit', 'uni-vnu', 'FIT', 'Khoa Công nghệ Thông tin', 'GS.TS. Lê Hoài An')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 6. Danh mục Môn học & Học phần (Subjects)
-- --------------------------------------------------------------------
INSERT INTO exams.subjects (id, code, name, credits, faculty_id, description)
VALUES
    ('sub-microecon', 'ECO101', 'Kinh tế vi mô', 3, 'fac-fba', 'Nghiên cứu hành vi của các tác nhân kinh tế đơn lẻ: người tiêu dùng, doanh nghiệp và sự hình thành giá cả thị trường.'),
    ('sub-macroecon', 'ECO102', 'Kinh tế vĩ mô', 3, 'fac-fba', 'Nghiên cứu tổng thể nền kinh tế: GDP, lạm phát, thất nghiệp, chính sách tài khóa và tiền tệ.'),
    ('sub-accfin', 'ACC201', 'Nguyên lý Kế toán & Tài chính', 3, 'fac-fba', 'Hệ thống tài khoản kế toán, ghi sổ kép, báo cáo tài chính doanh nghiệp.')
ON CONFLICT (id) DO NOTHING;

-- Chuẩn đầu ra CLO mẫu
INSERT INTO exams.learning_outcomes (id, subject_id, code, description, bloom_target)
VALUES
    ('clo-eco101-1', 'sub-microecon', 'CLO1', 'Hiểu và giải thích được quy luật cung cầu và sự co giãn giá', 'Thông hiểu'),
    ('clo-eco101-2', 'sub-microecon', 'CLO2', 'Vận dụng mô hình tối đa hóa lợi nhuận của doanh nghiệp vào bài toán thực tiễn', 'Vận dụng')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 7. Đề thi mẫu & Các mã đề đảo (Exams & Exam Variants)
-- --------------------------------------------------------------------
INSERT INTO exams.exams (
    id, user_id, title, subject, faculty, university, duration_minutes, exam_codes, selected_question_ids, format
)
VALUES
    (
        'exam-2026-001',
        'lec-001',
        'ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II',
        'Kinh tế vi mô',
        'Khoa Kinh tế & Quản trị',
        'ĐẠI HỌC QUỐC GIA',
        60,
        '["101", "102", "103", "104"]'::jsonb,
        '["q-1", "q-2", "q-3"]'::jsonb,
        'docx'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO exams.exam_variants (id, exam_id, exam_code, question_sequence, answer_keys, file_path)
VALUES
    (
        'var-001-101',
        'exam-2026-001',
        '101',
        '["q-1", "q-2", "q-3"]'::jsonb,
        '{"1": "A", "2": "C", "3": "B"}'::jsonb,
        '/storage/exams/DeThi_101.docx'
    ),
    (
        'var-001-102',
        'exam-2026-001',
        '102',
        '["q-3", "q-1", "q-2"]'::jsonb,
        '{"1": "B", "2": "A", "3": "C"}'::jsonb,
        '/storage/exams/DeThi_102.docx'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 8. Nhật ký khảo thí Dashboard Timeline (System Activities)
-- --------------------------------------------------------------------
INSERT INTO exams.system_activities (id, user_id, action_type, title, detail, icon_name, badge_color)
VALUES
    (
        'act-001',
        'lec-001',
        'export_exam',
        'Xuất đề thi kết thúc học phần',
        'Kinh tế vĩ mô - Giữa kỳ (40 câu - 4 mã đề 101, 102, 103, 104) ra tệp Word .docx',
        'FileText',
        'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    ),
    (
        'act-002',
        'lec-001',
        'approve_question',
        'Phê duyệt câu hỏi tự động RAG',
        'Đã thẩm định 12 câu hỏi trắc nghiệm Chương 3: Cung - Cầu',
        'CheckCircle2',
        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    ),
    (
        'act-003',
        'lec-001',
        'extract_textbook',
        'Hoàn tất trích xuất ngữ nghĩa',
        'Giáo trình Quản trị học hiện đại.pdf (240 trang, 68 chunks vector hóa)',
        'Layers',
        'text-blue-400 bg-blue-500/10 border-blue-500/20'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 9. Hạn ngạch RAG Token Quota cho Dashboard (Usage Quotas)
-- --------------------------------------------------------------------
INSERT INTO rag.usage_quotas (id, user_id, institution_id, max_tokens, used_tokens, total_embeddings_count)
VALUES
    ('quota-lec-001', 'lec-001', 'uni-vnu', 1000000, 420000, 12450)
ON CONFLICT (user_id) DO NOTHING;

-- --------------------------------------------------------------------
-- 10. Nhật ký kiểm toán câu hỏi & đề thi (Question & Exam Audit Logs)
-- --------------------------------------------------------------------
INSERT INTO exams.question_audit_logs (
    id, question_id, lecturer_id, action,
    previous_state, new_state,
    change_summary, field_changes, edit_reason,
    ip_address, user_agent, performed_at
)
VALUES
    (
        'q-audit-001',
        'q-1',
        'lec-001',
        'approve',
        '{"status": "pending", "bloom_level": "Nhận biết"}'::jsonb,
        '{"status": "approved", "bloom_level": "Nhận biết"}'::jsonb,
        'Phê duyệt câu hỏi trắc nghiệm kiểm định đạt chuẩn',
        '{"status": {"old": "pending", "new": "approved"}}'::jsonb,
        'Câu hỏi chuẩn xác theo quy luật Cung - Cầu trong giáo trình',
        '192.168.1.10',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'q-audit-002',
        'q-1',
        'lec-001',
        'inline_edit',
        '{"question_text": "Theo quy luật cầu, điều gì xảy ra?", "bloom_level": "Nhận biết"}'::jsonb,
        '{"question_text": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?", "bloom_level": "Nhận biết"}'::jsonb,
        'Chuẩn hóa câu hỏi: Thêm điều kiện ceteris paribus (các yếu tố khác không đổi)',
        '{"question_text": {"old": "Theo quy luật cầu, điều gì xảy ra?", "new": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?"}}'::jsonb,
        'Đảm bảo tính chặt chẽ về mặt khoa học kinh tế học',
        '192.168.1.10',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        'q-audit-003',
        'q-2',
        'lec-002',
        'inline_edit',
        '{"bloom_level": "Nhận biết", "correct_answer_id": "opt-a"}'::jsonb,
        '{"bloom_level": "Thông hiểu", "correct_answer_id": "opt-c"}'::jsonb,
        'Nâng mức độ Bloom lên Thông hiểu và hiệu chỉnh đáp án đúng C',
        '{"bloom_level": {"old": "Nhận biết", "new": "Thông hiểu"}, "correct_answer_id": {"old": "opt-a", "new": "opt-c"}}'::jsonb,
        'Yêu cầu suy luận về tác động chéo của hàng hóa thay thế',
        '192.168.1.25',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
    ),
    (
        'q-audit-004',
        'q-3',
        'lec-001',
        'update_bloom',
        '{"bloom_level": "Thông hiểu"}'::jsonb,
        '{"bloom_level": "Vận dụng"}'::jsonb,
        'Chuyển mức nhận thức sang Vận dụng (tính toán co giãn cầu)',
        '{"bloom_level": {"old": "Thông hiểu", "new": "Vận dụng"}}'::jsonb,
        'Yêu cầu sinh viên vận dụng công thức tính hệ số PED để ra quyết định giá',
        '192.168.1.10',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        CURRENT_TIMESTAMP - INTERVAL '6 hours'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO exams.exam_audit_logs (id, exam_id, user_id, action, details, ip_address, user_agent)
VALUES
    (
        'ex-audit-001',
        'exam-2026-001',
        'lec-001',
        'create',
        '{"title": "ĐỀ THI KẾT THÚC HỌC PHẦN", "question_count": 3, "codes": ["101", "102"]}'::jsonb,
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    ),
    (
        'ex-audit-002',
        'exam-2026-001',
        'lec-001',
        'export_pdf',
        '{"format": "pdf", "with_answer_keys": true, "exam_codes": ["101", "102"]}'::jsonb,
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    )
ON CONFLICT (id) DO NOTHING;
