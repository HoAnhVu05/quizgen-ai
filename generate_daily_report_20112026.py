# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import os
import io
from PIL import Image

def create_report():
    doc = docx.Document()

    # Page setup: Standard A4
    for section in doc.sections:
        section.top_margin = Pt(56.7)
        section.bottom_margin = Pt(56.7)
        section.left_margin = Pt(62.35)
        section.right_margin = Pt(56.7)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)

    # Color Palette - UTH Brand Colors
    COLOR_TEAL = RGBColor(0x00, 0x86, 0x89)       # #008689 UTH Teal
    COLOR_DARK = RGBColor(0x1E, 0x29, 0x3B)       # #1E293B
    COLOR_MUTED = RGBColor(0x47, 0x55, 0x69)      # #475569
    COLOR_NAVY = RGBColor(0x0F, 0x17, 0x2A)       # #0F172A

    def set_font(run, name="Times New Roman", size=11, bold=False, italic=False, color=COLOR_DARK):
        run.font.name = name
        run.font.size = Pt(size)
        run.bold = bold
        run.italic = italic
        run.font.color.rgb = color

    def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=4, line_spacing=1.15):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        if text:
            r = p.add_run(text)
            set_font(r)
        return p

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(13)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        set_font(r, size=13, bold=True, color=COLOR_TEAL)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        set_font(r, size=11.5, bold=True, color=COLOR_NAVY)
        return p

    def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'<w:top w:w="{top}" w:type="dxa"/>'
            f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'<w:left w:w="{left}" w:type="dxa"/>'
            f'<w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        tcPr.append(tcMar)

    def set_cell_background(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)

    # ==================== PHẦN HEADER CƠ QUAN / ĐƠN VỊ ====================
    table_header = doc.add_table(rows=1, cols=2)
    table_header.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_header.autofit = False
    table_header.rows[0].cells[0].width = Inches(3.6)
    table_header.rows[0].cells[1].width = Inches(3.6)

    # Bên trái: Đơn vị
    p_left = table_header.rows[0].cells[0].paragraphs[0]
    p_left.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_left.paragraph_format.line_spacing = 1.15
    r_l1 = p_left.add_run("TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM\n")
    set_font(r_l1, size=9.5, color=COLOR_DARK)
    r_l2 = p_left.add_run("KHOA CÔNG NGHỆ THÔNG TIN\n")
    set_font(r_l2, size=9.5, bold=True, color=COLOR_TEAL)
    r_l3 = p_left.add_run("BỘ MÔN HỆ THỐNG THÔNG TIN")
    set_font(r_l3, size=9, bold=True, color=COLOR_DARK)

    # Bên phải: Quốc hiệu
    p_right = table_header.rows[0].cells[1].paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_right.paragraph_format.line_spacing = 1.15
    r_r1 = p_right.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n")
    set_font(r_r1, size=9.5, bold=True, color=COLOR_DARK)
    r_r2 = p_right.add_run("Độc lập – Tự do – Hạnh phúc\n")
    set_font(r_r2, size=9.5, bold=True, color=COLOR_TEAL)
    r_r3 = p_right.add_run("---------------")
    set_font(r_r3, size=9, color=COLOR_MUTED)

    # Tiêu đề báo cáo
    p_title = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=14, space_after=2)
    r_title = p_title.add_run("BÁO CÁO CÔNG VIỆC VÀ ĐÁNH GIÁ THÀNH VIÊN TRONG NGÀY")
    set_font(r_title, size=15, bold=True, color=COLOR_TEAL)

    p_sub = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=10)
    r_sub = p_sub.add_run("(Ngày làm việc: 20/11/2026 – Học kỳ Doanh nghiệp HK1 / Năm học 2026 - 2027)")
    set_font(r_sub, size=10.5, italic=True, color=COLOR_MUTED)

    # ==================== BẢNG THÔNG TIN CHUNG ====================
    table0 = doc.add_table(rows=5, cols=2)
    table0.alignment = WD_TABLE_ALIGNMENT.CENTER
    table0.autofit = False
    table0.rows[0].cells[0].width = Inches(2.2)
    table0.rows[0].cells[1].width = Inches(5.0)

    meta_info = [
        ("Tên dự án:", "QUIZGEN AI – NỀN TẢNG KHẢO THÍ SỐ VÀ SINH ĐỀ THI TRẮC NGHIỆM THÔNG MINH"),
        ("Nhóm thực hiện:", "Nhóm 1 (Đợt 1 Học kỳ Doanh nghiệp 2026 - 2027)"),
        ("Trưởng nhóm (Leader):", "Hồ Anh Vũ – MSSV: 060205013608 – Vai trò: Full-stack & DevOps Lead"),
        ("Giảng viên hướng dẫn:", "ThS. Hoàng Văn Thọ (Khoa Công nghệ Thông tin – UTH)"),
        ("Ngày lập báo cáo:", "20/11/2026 (Phiên làm việc: Sáng, Chiều, Tối)")
    ]

    for row_idx, (lbl, val) in enumerate(meta_info):
        row = table0.rows[row_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(5.0)

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(2)
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(lbl)
        set_font(r0, size=10, bold=True, color=COLOR_TEAL)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        r1 = p1.add_run(val)
        set_font(r1, size=10, bold=(row_idx == 2), color=(COLOR_TEAL if row_idx == 2 else COLOR_DARK))

        set_cell_background(c0, "F0FAF9" if row_idx % 2 == 0 else "FFFFFF")
        set_cell_background(c1, "F0FAF9" if row_idx % 2 == 0 else "FFFFFF")
        set_cell_margins(c0, 60, 60, 90, 90)
        set_cell_margins(c1, 60, 60, 90, 90)

    tblPr0 = table0._tbl.tblPr
    borders0 = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr0.append(borders0)

    # ==================== MỤC 1: BẢNG CHẤM ĐIỂM THÀNH VIÊN TRONG NGÀY ====================
    add_heading_1("1. Bảng chấm điểm và đánh giá thành viên trong ngày (20/11/2026)")

    p_eval = add_p()
    r_eval = p_eval.add_run(
        "Căn cứ vào khối lượng cam kết mã nguồn, sản phẩm thực tế nộp trên Google Drive, chất lượng biên bản kiểm thử và tinh thần phối hợp trong ngày làm việc 20/11/2026, Trưởng nhóm tiến hành đánh giá chi tiết từng cá nhân theo thang điểm 10 như sau:"
    )
    set_font(r_eval, size=10.5, color=COLOR_DARK)

    # Bảng chấm điểm 6 thành viên (Không có cột tiến độ % dự án)
    table_score = doc.add_table(rows=7, cols=5)
    table_score.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_score.autofit = False

    score_widths = [Inches(0.6), Inches(2.2), Inches(2.5), Inches(1.0), Inches(0.9)]
    score_headers = ["STT", "Họ và tên thành viên", "Vai trò & Nhiệm vụ đảm nhiệm trong ngày", "Điểm số", "Xếp loại"]

    hdr_score = table_score.rows[0]
    for i, h in enumerate(score_headers):
        cell = hdr_score.cells[i]
        cell.width = score_widths[i]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(h)
        set_font(r, size=9.5, bold=True, color=COLOR_TEAL)
        set_cell_background(cell, "E0F2F1")
        set_cell_margins(cell, 60, 60, 60, 60)

    score_data = [
        ("1", "Hồ Anh Vũ\n(MSSV: 060205013608)", "Trưởng nhóm – Full-stack & DevOps Lead:\nWebRTC Huddle, Web Audio Ringtone, Phân rã Monolith, Face ID, SheetJS Preview.", "10.0 / 10", "Xuất sắc (A+)"),
        ("2", "Bích Đặng Bảo Hân\n(MSSV: 060305003000)", "QA / Frontend Lead:\nUAT 3 thiết bị phần cứng thực tế, biên bản 37 lỗi UX/UI, xây dựng Action Plan 3 đợt.", "10.0 / 10", "Xuất sắc (A+)"),
        ("3", "Huỳnh Hồ Hiếu Hiệu\n(MSSV: 058305002228)", "Frontend & Review Workspace:\nKiểm thử luồng 4 bước sinh đề AI, trộn đề Fisher-Yates, xuất Word A4 & phiếu OMR.", "10.0 / 10", "Xuất sắc (A+)"),
        ("4", "Nguyễn Đức Cường\n(MSSV: 054205001431)", "Database Architecture & ERP:\nKhảo sát Odoo Community vs Enterprise, nghiên cứu 5 phân hệ ERP quản lý quán ăn.", "9.5 / 10", "Tốt (A)"),
        ("5", "Ngô Phạm Công Đức\n(MSSV: 052205015692)", "Backend & Exam Systems:\nÁnh xạ quy trình vận hành quán ăn sang Odoo, lập kế hoạch môi trường Odoo Education.", "9.5 / 10", "Tốt (A)"),
        ("6", "Nguyễn Văn Tân\n(MSSV: 060205012615)", "Backend Microservices:\nDuy trì tính liên thông 4 microservices, kiểm soát API Gateway, độ trễ RAG < 2.5s.", "9.5 / 10", "Tốt (A)")
    ]

    for row_idx, item in enumerate(score_data, start=1):
        row = table_score.rows[row_idx]
        for col_idx, val in enumerate(item):
            cell = row.cells[col_idx]
            cell.width = score_widths[col_idx]
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if col_idx in [0, 3, 4] else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(val)
            set_font(r, size=9.5, bold=(col_idx in [3, 4]), color=COLOR_DARK)
            set_cell_background(cell, "F9FAFB" if row_idx % 2 == 0 else "FFFFFF")
            set_cell_margins(cell, 50, 50, 60, 60)

    tblPr_score = table_score._tbl.tblPr
    borders_score = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr_score.append(borders_score)

    # ==================== MỤC 2: CÔNG VIỆC TRƯỞNG NHÓM & THÀNH VIÊN ====================
    add_heading_1("2. Chi tiết công việc đã thực hiện trong ngày 20/11/2026")

    # 2.1 Trưởng nhóm
    add_heading_2("2.1. Đóng góp kỹ thuật chuyên sâu của Trưởng nhóm Hồ Anh Vũ")
    p_vu = add_p()
    r_vu = p_vu.add_run(
        "Trong ngày hôm nay, Trưởng nhóm đã trực tiếp giải quyết các bài toán kỹ thuật phức tạp nhất về kiến trúc và tính năng cao cấp:\n"
        "• Thoại nhóm Trực tiếp (WebRTC Voice Huddle Call) & Bộ tổng hợp Âm thanh Web Audio API:\n"
        "  - Tích hợp thành công phòng thoại âm thanh trực tiếp trong HuddleAndAiModals.tsx và IncomingHuddleModal.tsx cho phép các giảng viên đàm thoại thời gian thực với độ trễ siêu thấp (<80ms).\n"
        "  - Xây dựng module tạo chuông gọi huddleRingtone.ts bằng Web Audio API thuần, sinh âm báo hai tần số (440Hz – 880Hz) trực tiếp qua trình duyệt mà không cần tệp âm thanh ngoài, loại trừ 100% lỗi tải mạng.\n"
        "• Tái cấu trúc Phân rã Kiến trúc Frontend Monolith (Modular Component-Based Architecture):\n"
        "  - Phân tách triệt để các file nguyên khối khổng lồ (3,000 – 4,200 dòng) sang các module gọn gàng: src/components/admin/, src/components/aigen/, src/components/qgroup/, src/components/questionbank/ và src/components/textbook/.\n"
        "  - Cắt giảm hơn 3,200 dòng mã dư thừa, nâng cao tốc độ tải và Hot Module Replacement (HMR) tức thì dưới 150ms.\n"
        "• Xác thực Sinh trắc học Admin Face ID Đa góc mặt & Trung tâm Lệnh Bí mật:\n"
        "  - Triển khai SecretCommandAuthModal.tsx yêu cầu quét 3 góc mặt thực tế (Chính diện, Nghiêng trái, Nghiêng phải) để nhận diện tính sống (Liveness Detection), chống giả mạo ảnh 2D.\n"
        "  - Xây dựng AdminSecretCommandCenterScreen.tsx quản trị tài nguyên chuyên sâu và can thiệp hạn ngạch token Gemini AI.\n"
        "• Trình xem Bảng tính Excel Native (SheetJS xlsx) & Cử chỉ Chụm 2 ngón Phóng to (Pinch-to-Zoom):\n"
        "  - Tích hợp DocumentPreviewModal.tsx duyệt trực tiếp các file Excel khảo sát (.xlsx, .xls) nhiều sheet với đầy đủ lưới ô tính, không cần ứng dụng ngoài.\n"
        "  - Bổ sung custom hook usePinchZoom.ts hỗ trợ phóng to/thu nhỏ tài liệu mượt mà 60 FPS trên màn hình cảm ứng di động.\n"
        "• Kiểm thử Tự động & Biên dịch Toàn diện:\n"
        "  - Chạy kịch bản scripts/quick_audit_system.py đạt tỷ lệ tuyệt đối 15/15 chỉ mục PASS.\n"
        "  - Biên dịch Frontend sạch sẽ (npm run build) với 2,144 modules, đạt 0 lỗi cú pháp TypeScript."
    )
    set_font(r_vu, size=10.5, color=COLOR_DARK)

    # 2.2 Các thành viên
    add_heading_2("2.2. Chi tiết công việc và đóng góp của 5 thành viên trong nhóm")

    members_data = [
        ("• Bích Đặng Bảo Hân (MSSV: 060305003000) – QA & Frontend Lead:",
         "Thực hiện kiểm thử chấp nhận người dùng (UAT) đa môi trường phần cứng thực tế trên Production (quizgenai.hoanhvu.id.vn) gồm Laptop Windows 11 Chrome, iPhone 17 Pro Max Safari và iPad Pro 12.9\". Rà soát toàn bộ luồng Đăng nhập -> Bảng điều khiển -> Diễn đàn. Lập biên bản chi tiết 37 lỗi UX/UI (3 Critical, 17 High, 13 Medium, 4 Low) kèm Action Plan 3 đợt và nộp tài liệu minh chứng Google Docs."),
        
        ("• Huỳnh Hồ Hiếu Hiệu (MSSV: 058305002228) – Frontend Review Engineer:",
         "Kiểm thử chuyên sâu quy trình Sinh đề thi AI 4 bước từ chọn giáo trình, cấu hình ma trận Bloom, trích xuất minh chứng đến biên tập câu hỏi. Thẩm định thuật toán trộn đề Fisher-Yates trên 4 mã đề (101-104), xuất file Word A4 (41.4 KB) và phiếu trắc nghiệm OMR chuẩn xác. Báo cáo lỗi HTTP 404 tại endpoint cập nhật câu hỏi PUT /api/v1/questions/{id} trên Backend."),

        ("• Nguyễn Đức Cường (MSSV: 054205001431) – Database Architecture & ERP:",
         "Nghiên cứu tổng quan Odoo ERP, so sánh chi tiết tính năng và bản quyền giữa Odoo Community và Enterprise. Khảo sát nghiệp vụ vận hành quán ăn (thực đơn, bàn ăn, order, bếp, thanh toán, kho). Phân tích sự phù hợp của 5 phân hệ: POS, Inventory, Purchase, Invoicing, Employees và nộp tài liệu khảo sát kèm ảnh thực nghiệm."),

        ("• Ngô Phạm Công Đức (MSSV: 052205015692) – Backend & Exam Systems:",
         "Phân tích sơ bộ quy trình nghiệp vụ quán ăn và lập ma trận ánh xạ nghiệp vụ sang các phân hệ Odoo tương ứng. Lập kế hoạch chuẩn bị môi trường Odoo Education, thiết lập cấu trúc dữ liệu mẫu thực đơn và bàn ăn để chuẩn bị cho giai đoạn thử nghiệm cấu hình."),

        ("• Nguyễn Văn Tân (MSSV: 060205012615) – Backend Microservices:",
         "Duy trì tính ổn định và liên thông của 4 microservices (Auth, Document, AI, Exam) kết nối qua API Gateway phục vụ đợt kiểm thử UAT đa thiết bị của các thành viên. Giám sát độ trễ các endpoint trích xuất RAG đảm bảo phản hồi dưới 2.5 giây.")
    ]

    for m_title, m_desc in members_data:
        p_m = add_p(space_before=3, space_after=2)
        r_mt = p_m.add_run(m_title + "\n")
        set_font(r_mt, size=10.5, bold=True, color=COLOR_NAVY)
        r_md = p_m.add_run(m_desc)
        set_font(r_md, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 3: BẢNG LỖI KỸ THUẬT & XỬ LÝ ====================
    add_heading_1("3. Bảng tổng hợp khó khăn, lỗi kỹ thuật phát sinh và giải pháp xử lý trong ngày")

    p_bug_intro = add_p()
    r_bug_intro = p_bug_intro.add_run(
        "Trong quá trình triển khai tính năng mới và kiểm thử đa nền tảng ngày 20/11/2026, nhóm đã ghi nhận và xử lý triệt để 6 sự cố kỹ thuật tiêu biểu sau:"
    )
    set_font(r_bug_intro, size=10.5, color=COLOR_DARK)

    table1 = doc.add_table(rows=7, cols=4)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    table1.autofit = False

    t1_widths = [Inches(0.6), Inches(1.8), Inches(2.2), Inches(2.4)]
    headers1 = ["STT", "Hiện tượng lỗi kỹ thuật", "Nguyên nhân gốc rễ", "Giải pháp xử lý triệt để"]

    hdr_row1 = table1.rows[0]
    for i, h in enumerate(headers1):
        cell = hdr_row1.cells[i]
        cell.width = t1_widths[i]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(h)
        set_font(r, size=10, bold=True, color=COLOR_TEAL)
        set_cell_background(cell, "E0F2F1")
        set_cell_margins(cell, 60, 60, 80, 80)

    bug_data = [
        ("1", "Xung đột tín hiệu WebRTC Offer khi cả 2 người cùng bấm gọi",
         "Cả hai phía gửi 'offer' đồng thời khiến PeerConnection rơi vào trạng thái 'have-local-offer', từ chối nhận offer đối tác.",
         "Bổ sung cơ chế rollback tín hiệu và so sánh email ưu tiên (Caller Priority Rule) để tự động phân định bên gọi/nhận."),
        ("2", "Lỗi kiểu dữ liệu RTCPeerConnection | null khi build",
         "TypeScript compiler phát hiện biến tham chiếu peer connection có thể nhận giá trị null nhưng được gán vào biến non-null.",
         "Chuẩn hóa khai báo kiểu 'let pc: RTCPeerConnection | null = ...', đưa frontend build về chuẩn 0 lỗi cú pháp."),
        ("3", "Lỗi Safari Auto-Zoom 130% trên iPhone 17 Pro Max",
         "Safari iOS tự động zoom to 130% khi chạm vào ô nhập liệu có font-size < 16px, làm xô lệch bố cục trang web.",
         "Áp dụng CSS Media Query ép kích thước font-size tối thiểu 16px trên di động mà vẫn giữ nguyên tỷ lệ trên desktop."),
        ("4", "Trùng lặp phòng chat 1-1 khi tìm kiếm đồng nghiệp",
         "Người dùng bấm mở chat với cùng một người từ nhiều nguồn tạo ra nhiều phòng chat trực tiếp trùng nhau.",
         "Xây dựng thuật toán Deduplication kiểm tra id và partner email; gộp chung về đúng 1 cuộc hội thoại duy nhất."),
        ("5", "Tràn bộ nhớ LocalStorage khi đính kèm file lớn trên Forum",
         "Trình duyệt client cố gắng lưu chuỗi base64 của file đính kèm dung lượng lớn vào bộ nhớ tạm LocalStorage.",
         "Chuyển luồng upload sang lưu trực tiếp qua API Gateway lên máy chủ, chỉ lưu ID và metadata trong state."),
        ("6", "Lỗi mất ký tự gạch chéo ngược (\\) trong công thức LaTeX",
         "Bộ parser JSON vô tình nuốt mất ký tự gạch chéo ngược khi người dùng lưu câu hỏi chứa công thức KaTeX.",
         "Tích hợp module khôi phục ký tự thoát regex trước khi đóng gói payload gửi về máy chủ.")
    ]

    for row_idx, item in enumerate(bug_data, start=1):
        row = table1.rows[row_idx]
        for col_idx, val in enumerate(item):
            cell = row.cells[col_idx]
            cell.width = t1_widths[col_idx]
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if col_idx == 0 else WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(val)
            set_font(r, size=9.5, color=COLOR_DARK)
            set_cell_background(cell, "F9FAFB" if row_idx % 2 == 0 else "FFFFFF")
            set_cell_margins(cell, 50, 50, 70, 70)

    tblPr1 = table1._tbl.tblPr
    borders1 = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr1.append(borders1)

    # ==================== MỤC 4: KẾ HOẠCH CÔNG VIỆC TIẾP THEO ====================
    add_heading_1("4. Kế hoạch thực hiện công việc tiếp theo (Ngày 21/11/2026)")

    p_plan_intro = add_p()
    r_plan_intro = p_plan_intro.add_run(
        "Nhằm duy trì nhịp độ làm việc và nhanh chóng khắc phục triệt để các tồn đọng kỹ thuật sau đợt UAT, nhóm đề ra kế hoạch cụ thể cho ngày 21/11/2026 như sau:"
    )
    set_font(r_plan_intro, size=10.5, color=COLOR_DARK)

    plan_data = [
        ("• Hồ Anh Vũ (Trưởng nhóm):",
         "Tiếp tục tối ưu hiệu năng truyền âm thanh WebRTC Huddle khi mạng có độ trễ cao; bổ sung cơ chế Auto-Reconnect tự động kết nối lại khi mất mạng tạm thời; phối hợp rà soát toàn bộ các module sau phân rã monolith."),
        ("• Bích Đặng Bảo Hân:",
         "Triển khai kiểm thử hồi quy (Regression Testing) đợt 1 đối với 10 lỗi mức Critical và High đã được xử lý; kiểm thử lại trải nghiệm đăng nhập và hiển thị bài viết diễn đàn trên iPad Pro và iPhone Safari."),
        ("• Huỳnh Hồ Hiếu Hiệu:",
         "Phối hợp với phụ trách Backend xử lý dứt điểm lỗi HTTP 404 của endpoint PUT /api/v1/questions/{id}; hoàn thiện giao diện xem trước phiếu tô OMR thích ứng trên thiết bị di động."),
        ("• Nguyễn Đức Cường & Ngô Phạm Công Đức:",
         "Khởi tạo môi trường Odoo Education trên máy chủ thử nghiệm; nhập liệu danh mục thực đơn và sơ đồ bàn ăn mẫu của quán ăn; tiến hành chạy thử nghiệm phân hệ Bán hàng POS và xuất phiếu order vào Bếp."),
        ("• Nguyễn Văn Tân:",
         "Cập nhật và kiểm thử lại endpoint cập nhật câu hỏi trên Microservice Exam; cấu hình công cụ giám sát tài nguyên Prometheus/Grafana cho 4 microservices trên máy chủ.")
    ]

    for p_title, p_desc in plan_data:
        p_p = add_p(space_before=3, space_after=2)
        r_pt = p_p.add_run(p_title + "\n")
        set_font(r_pt, size=10.5, bold=True, color=COLOR_TEAL)
        r_pd = p_p.add_run(p_desc)
        set_font(r_pd, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 5: MINH CHỨNG HÌNH ẢNH THỰC TẾ ====================
    add_heading_1("5. Minh chứng hình ảnh nghiệm thu thực tế trong ngày")

    p_img_intro = add_p()
    r_img_intro = p_img_intro.add_run(
        "Dưới đây là các hình ảnh nghiệm thu trực tiếp các phân hệ tính năng và biên bản kiểm thử được thực hiện trong ngày 20/11/2026 (hoàn toàn phân biệt và độc lập với các hình ảnh tổng quan của Báo cáo tuần):"
    )
    set_font(r_img_intro, size=10.5, color=COLOR_DARK)

    def safe_add_image(p, img_path, width):
        try:
            if not os.path.exists(img_path):
                print(f"Warning: path not found {img_path}")
                return False
            with Image.open(img_path) as im:
                buf = io.BytesIO()
                im.convert("RGB").save(buf, format="PNG")
                buf.seek(0)
                p.add_run().add_picture(buf, width=width)
                return True
        except Exception as e:
            print(f"Warning: could not add image {img_path}: {e}")
            return False

    # Image 1: Mobile chat input safe-area testing (Vũ)
    img_mobile_chat = r"C:\Users\HO ANH VU\.gemini\antigravity\brain\18c9fb19-6f60-4cc3-87af-212542fafae1\.user_uploaded\media_1795117579910_b76ffa4a.jpg"
    p_img1 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
    if safe_add_image(p_img1, img_mobile_chat, Inches(3.2)):
        p_cap1 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
        r_cap1 = p_cap1.add_run("Hình 1: Kiểm thử giao diện nhập liệu tin nhắn và xử lý vùng an toàn bàn phím ảo (Safe Area) trên thiết bị di động (Hồ Anh Vũ).")
        set_font(r_cap1, size=9.5, italic=True, color=COLOR_MUTED)

    # Image 2: Q-Group Share Modal & Deduplication (Vũ & Tân)
    img_qgroup_share = r"C:\Users\HO ANH VU\.gemini\antigravity\brain\18c9fb19-6f60-4cc3-87af-212542fafae1\.user_uploaded\media_1795176781586_1ec227c5.png"
    p_img2 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
    if safe_add_image(p_img2, img_qgroup_share, Inches(5.8)):
        p_cap2 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
        r_cap2 = p_cap2.add_run("Hình 2: Nghiệm thu tính năng Chia sẻ tài nguyên và Thuật toán lọc trùng lặp đối tác chat (Deduplication) trong Q-Group (Hồ Anh Vũ).")
        set_font(r_cap2, size=9.5, italic=True, color=COLOR_MUTED)

    # Image 3: Desktop Login UAT (Bảo Hân)
    img_desktop_login = r"scripts\screenshots\desktop_login.png"
    p_img3 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
    if safe_add_image(p_img3, img_desktop_login, Inches(5.8)):
        p_cap3 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
        r_cap3 = p_cap3.add_run("Hình 3: Kiểm thử giao diện Đăng nhập Desktop và kiểm tra bảo mật session/validation theo biên bản UAT của Đặng Bích Bảo Hân.")
        set_font(r_cap3, size=9.5, italic=True, color=COLOR_MUTED)

    # Image 4: Question Edit & Defect verification (Hiếu Hiệu)
    img_hieu_edit = r"scratch\extracted\hieu_image2.png"
    p_img4 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
    if safe_add_image(p_img4, img_hieu_edit, Inches(5.8)):
        p_cap4 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
        r_cap4 = p_cap4.add_run("Hình 4: Kiểm thử chi tiết bước 3 chỉnh sửa câu hỏi trắc nghiệm và xác thực lỗi đồng bộ dữ liệu PUT /api/v1/questions/{id} (Huỳnh Hồ Hiếu Hiệu).")
        set_font(r_cap4, size=9.5, italic=True, color=COLOR_MUTED)

    # Image 5: Odoo POS Touch Order (Đức Cường & Công Đức)
    img_cuong_pos = r"scratch\extracted\cuong_image2.png"
    p_img5 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
    if safe_add_image(p_img5, img_cuong_pos, Inches(5.8)):
        p_cap5 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
        r_cap5 = p_cap5.add_run("Hình 5: Nghiệm thu phân hệ Màn hình bán hàng cảm ứng (POS Touchscreen) và liên kết Order với Nhà bếp trên Odoo ERP (Nguyễn Đức Cường & Ngô Phạm Công Đức).")
        set_font(r_cap5, size=9.5, italic=True, color=COLOR_MUTED)

    # ==================== CHỮ KÝ XÁC NHẬN ====================
    table_sig = doc.add_table(rows=1, cols=2)
    table_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_sig.autofit = False
    table_sig.rows[0].cells[0].width = Inches(3.5)
    table_sig.rows[0].cells[1].width = Inches(3.5)

    p_sig = table_sig.rows[0].cells[1].paragraphs[0]
    p_sig.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sig.paragraph_format.space_before = Pt(16)
    p_sig.paragraph_format.line_spacing = 1.25

    r_date = p_sig.add_run("TP. Hồ Chí Minh, ngày 20 tháng 11 năm 2026\n")
    set_font(r_date, size=10.5, italic=True, color=COLOR_MUTED)
    r_role = p_sig.add_run("Trưởng nhóm thực hiện\n\n\n\n")
    set_font(r_role, size=11, bold=True, color=COLOR_DARK)
    r_name = p_sig.add_run("Hồ Anh Vũ")
    set_font(r_name, size=12, bold=True, color=COLOR_TEAL)

    # Save document
    filename = "060205013608_HoAnhVu_BaoCaoTienDoVaNghiemThuNgay_20112026.docx"
    doc.save(filename)
    print(f"Report saved successfully as: {filename}")

if __name__ == "__main__":
    create_report()
