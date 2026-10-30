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
