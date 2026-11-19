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

    # Color Palette
    COLOR_TEAL = RGBColor(0x00, 0x86, 0x89)       # #008689
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
        p.paragraph_format.space_before = Pt(12)
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
        set_font(r, size=11.5, bold=True, color=COLOR_DARK)
        return p

    def set_cell_background(cell, hex_color):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    # ==================== HEADER ====================
    p_header = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    r1 = p_header.add_run("TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)\n")
    set_font(r1, size=12, bold=True, color=COLOR_DARK)
    r2 = p_header.add_run("KHOA CÔNG NGHỆ THÔNG TIN – BỘ MÔN MẠNG & HỆ ĐIỀU HÀNH")
    set_font(r2, size=11, bold=True, color=COLOR_TEAL)

    p_title = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=10, space_after=8)
    r_t1 = p_title.add_run("BÁO CÁO CÔNG VIỆC TRONG NGÀY CỦA TRƯỞNG NHÓM (LEADER)\n")
    set_font(r_t1, size=15, bold=True, color=COLOR_TEAL)
    r_t2 = p_title.add_run("TỔNG HỢP TOÀN DIỆN TIẾN ĐỘ NGÀY 19/11/2026 & ĐỐI SOÁT 2 NGÀY (18/11 – 19/11/2026)\n"
                           "GIẢI CỨU BỘ NHỚ CSDL (GIẢM 99.95%), NÂNG CẤP ĐA PHƯƠNG TIỆN Q-GROUP (VOICE PCM WAVEFORM, QUICKLOOK MODAL, SLACK EMOJI, @MENTION) & KHỬ NGHẼN BACKEND\n")
    set_font(r_t2, size=11.5, bold=True, color=COLOR_DARK)
    r_t3 = p_title.add_run("(Giai đoạn: Nước rút Sprint 4 – Tuần 4 | Ngày báo cáo: Thứ Năm, ngày 19/11/2026)")
    set_font(r_t3, size=10.5, italic=True, color=COLOR_MUTED)

    # ==================== TABLE 0: THÔNG TIN DỰ ÁN ====================
    table0 = doc.add_table(rows=6, cols=2)
    table0.alignment = WD_TABLE_ALIGNMENT.CENTER
    table0.autofit = False

    col_widths = [Inches(2.1), Inches(4.9)]
    meta_info = [
        ("Tên nhóm:", "Nhóm 1 – Học kỳ Doanh nghiệp (HKDN HK1/2026 – 2027)"),
        ("Tên đề tài:", "QuizGen AI – Nền tảng Biên soạn & Quản lý Đề thi Thông minh theo Chuẩn đầu ra (RAG/AI)"),
        ("Họ và tên Trưởng nhóm:", "Hồ Anh Vũ (MSSV: 060205013608) – Vai trò: Team Leader & Full-stack / DevOps Lead"),
        ("Thời gian thực hiện:", "Ngày làm việc: 19/11/2026 (Tổng hợp đối soát 2 ngày liên tục 18/11 – 19/11/2026)"),
        ("Phạm vi tổng hợp:", "Toàn diện tiến độ 6 thành viên trên các nhánh Git với 47 commits hợp nhất, 12 commits chính hôm nay; kiểm thử 8 microservices (8000–8007) và cổng API Gateway."),
        ("Trạng thái hệ thống:", "100% Microservices Healthy (Độ trễ 5.7ms), TypeScript build 0 lỗi (2,073 modules), CSDL Q-Group tối ưu từ 66MB xuống 34KB, nạp chat di động chỉ 0.18s.")
    ]

    for row_idx, (label, val) in enumerate(meta_info):
        row = table0.rows[row_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_widths[0], col_widths[1]

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(2)
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(label)
        set_font(r0, size=10.5, bold=True, color=COLOR_DARK)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        r1 = p1.add_run(val)
        set_font(r1, size=10.5, color=COLOR_DARK)

        set_cell_background(c0, "F0FAF9" if row_idx % 2 == 0 else "FFFFFF")
        set_cell_background(c1, "F0FAF9" if row_idx % 2 == 0 else "FFFFFF")
        set_cell_margins(c0, 80, 80, 120, 120)
        set_cell_margins(c1, 80, 80, 120, 120)

    # Set borders for table0
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

    # ==================== MỤC 1: CÔNG VIỆC TRƯỞNG NHÓM ====================
    add_heading_1("1. Chi tiết công việc của Trưởng nhóm (Leader) Hồ Anh Vũ trong ngày 19/11/2026")

    intro_p = add_p()
    intro_r = intro_p.add_run(
        "Trong ngày hôm nay (19/11/2026), Trưởng nhóm Hồ Anh Vũ đã trực tiếp xử lý các nút thắt kỹ thuật nghiêm trọng nhất "
        "ảnh hưởng trực tiếp tới trải nghiệm người dùng và tính toàn vẹn của nền tảng, bao gồm việc giải cứu bộ nhớ cơ sở dữ liệu, "
        "tích hợp hệ sinh thái đa phương tiện hiện đại và chuẩn hóa không gian học thuật Q-Group theo tiêu chuẩn Slack/Teams:"
    )
    set_font(intro_r, size=11, color=COLOR_DARK)

    # 1.1 Tối ưu CSDL
    add_heading_2("1.1. Giải cứu bộ nhớ CSDL & Chống lag/nóng máy (Tối ưu hóa qgroups.json từ 66MB xuống 34KB)")
    p_db = add_p()
    r_db = p_db.add_run(
        "• Điều tra và xử lý dứt điểm nguyên nhân máy tính nóng và điện thoại bị đơ lag khi truy cập Q-Group:\n"
        "  - Phát hiện CSDL qgroups.json bị phình to lên mức báo động 66.4 MB do lưu trữ trực tiếp chuỗi base64 của các file bảng tính Excel (21.3 MB) và tài liệu Word (2.0 MB) khảo sát WiFi CS3.\n"
        "  - Tái cấu trúc cơ chế lưu trữ: Bóc tách toàn bộ dữ liệu nhị phân của tệp đính kèm sang thư mục đĩa vật lý an toàn (data/uploads/qgroup_attachments/), CSDL chỉ lưu trữ đường dẫn tương đối và metadata.\n"
        "  - Kết quả vượt bậc: Dung lượng CSDL giảm 99.95% (từ 66.4 MB còn 34.2 KB); thời gian tải phòng chat trên điện thoại giảm từ >15 giây (hoặc timeout) xuống chỉ còn 0.18 giây."
    )
    set_font(r_db, size=10.5, color=COLOR_DARK)

    # 1.2 Fix bug Document Service
    add_heading_2("1.2. Khắc phục lỗi thiếu thư viện UUID trong Document Service & Chuẩn hóa MIME âm thanh")
    p_uuid = add_p()
    r_uuid = p_uuid.add_run(
        "• Sửa lỗi nghiêm trọng 'name uuid is not defined': Bổ sung khai báo 'import uuid' trong services/document-service/src/main.py, khôi phục 100% khả năng upload tệp đính kèm và hình ảnh qua cổng API Gateway.\n"
        "• Xây dựng bảng ánh xạ định dạng âm thanh AUDIO_EXT_MAP (.webm -> audio/webm, .mp4 -> audio/mp4, .mp3 -> audio/mpeg), giải quyết triệt để lỗi Safari iOS và Chrome Android từ chối phát lại luồng âm thanh do sai Content-Type."
    )
    set_font(r_uuid, size=10.5, color=COLOR_DARK)

    # 1.3 Voice Message
    add_heading_2("1.3. Tích hợp Tin nhắn Thoại (Voice Message) với Phân tích Sóng âm Thực tế (PCM Web Audio API)")
    p_voice = add_p()
    r_voice = p_voice.add_run(
        "• Xây dựng component mới AudioMessagePlayer.tsx ứng dụng công nghệ Web Audio API (AudioContext.decodeAudioData):\n"
        "  - Giải mã trực tiếp luồng âm thanh nhị phân thành mảng biên độ PCM gồm 32 vạch sóng âm, phản ánh chuẩn xác độ cao trầm và cường độ giọng nói thực tế của người phát biểu.\n"
        "  - Hiệu ứng đổi màu sóng âm Teal #008689 động theo thời gian thực kèm đếm thời lượng mm:ss.\n"
        "  - Tích hợp bộ thu âm micrô trực tiếp trên thanh công cụ chat bằng MediaRecorder và AnalyserNode, có hiệu ứng sóng âm nhảy sống động trong lúc đang nói."
    )
    set_font(r_voice, size=10.5, color=COLOR_DARK)

    # 1.4 Slack Emoji Picker & @Mention
    add_heading_2("1.4. Bộ chọn Biểu cảm Slack Emoji Picker 9 chuyên mục & Hệ thống Nhắc tên (@Mention)")
    p_emoji = add_p()
    r_emoji = p_emoji.add_run(
        "• Phát triển component SlackEmojiPicker.tsx độc lập với 9 chuyên mục phân loại trực quan (Thường dùng, Mặt cười, Cử chỉ, Trái tim, Đồ vật, Đồ ăn, Hoạt động, v.v.), tích hợp tìm kiếm tức thì theo từ khóa song ngữ Anh - Việt.\n"
        "• Tính năng nhắc tên thành viên: Gõ ký tự @ tự động hiển thị danh sách đồng nghiệp trong phòng ban; bổ sung tính năng broadcast khẩn cấp @all và @kênh gửi thông báo tức thì tới tất cả giảng viên."
    )
    set_font(r_emoji, size=10.5, color=COLOR_DARK)

    # 1.5 QuickLook Modal
    add_heading_2("1.5. Tái thiết kế Modal Xem trước Tài liệu QuickLook Glassmorphic & Thanh công cụ Lightbox")
    p_ql = add_p()
    r_ql = p_ql.add_run(
        "• Nâng cấp DocumentPreviewModal.tsx sang ngôn ngữ thiết kế Apple QuickLook kính mờ (Glassmorphism) thanh thoát, gỡ bỏ khung đen cồng kềnh cũ.\n"
        "• Phân tách rành mạch hai thao tác: Bấm vào file sẽ mở cửa sổ xem trước; chỉ khi bấm nút tải xuống (icon nhỏ gọn) mới thực hiện tải về máy.\n"
        "• Hỗ trợ tùy chọn 'Xem trực tuyến' nhúng Google Docs Viewer an toàn cho tệp Word/Excel mà không cần cài đặt phần mềm Office.\n"
        "• Tích hợp thanh công cụ Lightbox ảnh đa năng: Phóng to (Zoom In), Thu nhỏ (Zoom Out), Xoay 90 độ (Rotate) và Tải về trực tiếp."
    )
    set_font(r_ql, size=10.5, color=COLOR_DARK)

    # 1.6 Pinned features & Menu fix
    add_heading_2("1.6. Chế độ Ghim Hội thoại, Sticky Pinned Message Bar & Chuẩn hóa Menu 3 Chấm")
    p_pin = add_p()
    r_pin = p_pin.add_run(
        "• Ghim hội thoại (Pin Channel/DM): Bổ sung biểu tượng 📌 màu vàng và tự động sắp xếp kênh được ghim lên đầu danh sách Sidebar.\n"
        "• Thanh ghim tin nhắn (Sticky Pinned Message Bar): Gắn cố định ngay dưới header chat, hỗ trợ click tự cuộn mượt (smooth scroll) đến vị trí tin nhắn ghim kèm hiệu ứng phát sáng viền.\n"
        "• Chuẩn hóa Menu ngữ cảnh: Sửa lỗi bấm 'Chuyển quyền Trưởng nhóm' bị gọi nhầm sang hàm xóa đoạn chat; đổi từ ngữ sang 'Chuyển quyền Trưởng nhóm' chuẩn mực sư phạm; phân tách rành mạch menu Kênh và menu DM."
    )
    set_font(r_pin, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 2: CÔNG VIỆC CÁC THÀNH VIÊN ====================
    add_heading_1("2. Tổng hợp công việc và đóng góp của 5 thành viên trong nhóm")

    members_data = [
        ("2.1. Nguyễn Văn Tấn (MSSV: 060205012615) – Backend Engineer (Document, RAG, Admin, Payment)",
         "• Giám sát và đo lường tải đồng thời trên Document Service sau khi bóc tách attachment ra ổ đĩa, đảm bảo thời gian trích xuất giáo trình PDF/DOCX đạt dưới 2.5s.\n"
         "• Xác thực tính năng Deduplication bằng mã SHA-256: Khi giảng viên tải giáo trình trùng lặp, hệ thống nhận diện tức thì và tái sử dụng vector có sẵn.\n"
         "• Lũy kế 18/11: Hoàn thành nhiệm vụ SCRUM-106 (Diễn đàn học thuật, lưu CSDL thật, hiển thị ảnh nguyên tỉ lệ) và SCRUM-99 (Bảo toàn công thức LaTeX & bảng biểu trong chunker.py, Webhook Idempotency, In-Memory TTL Cache)."),
        
        ("2.2. Ngô Phạm Công Đức (MSSV: 052205015692) – Backend Exam Service & Khảo thí",
         "• Thẩm định tính tương thích của Phiếu trả lời trắc nghiệm OMR 50 câu A4 xuất ra từ Exam Service với máy chấm quang học chuyên dụng của trường UTH.\n"
         "• Rà soát độ ổn định của thuật toán đảo 4 mã đề Fisher-Yates (101, 102, 103, 104) kèm ma trận đối soát đáp án chéo chuẩn xác 100%.\n"
         "• Kiểm tra tính hợp lệ của gói xuất bản IMS QTI 2.1 phục vụ import trực tiếp vào LMS Canvas / Moodle của nhà trường.\n"
         "• Lũy kế 18/11: Hoàn thành SCRUM-105 biên soạn tài liệu Đặc tả Yêu cầu Phần mềm (SRS) chuẩn quốc tế IEEE 830 dài hơn 1,200 dòng."),

        ("2.3. Nguyễn Đức Cường – Database Architecture & Backend Engineer",
         "• Tối ưu hóa cấu trúc cơ sở dữ liệu SQLite trong môi trường phát triển: Giám sát chế độ WAL Mode và cấu hình busy_timeout 60 giây.\n"
         "• Kiểm toán tính toàn vẹn khóa ngoại (FK) giữa cơ sở dữ liệu xác thực auth.db và danh sách thành viên kênh Q-Group.\n"
         "• Kiểm tra tính sẵn sàng của script backup_restore_db.py đảm bảo khả năng sao lưu và phục hồi dữ liệu tự động khi có sự cố.\n"
         "• Lũy kế 18/11: Cấu hình chỉ số hiệu năng và views thống kê trên Admin Portal [SCRUM-94]."),

        ("2.4. Huỳnh Hồ Hiệu Hiệu – Frontend UI/UX & Review Workspace Engineer",
         "• Kiểm thử toàn diện giao diện di động (Mobile Responsive) trên điện thoại thông qua kết nối Cloudflare Tunnel, khắc phục lỗi tràn khung chat.\n"
         "• Góp ý tinh gọn giao diện thanh tải tệp: Chuyển nút tải chữ cồng kềnh sang biểu tượng mũi tên tải xuống nhỏ gọn, tinh tế.\n"
         "• Rà soát card hiển thị tài liệu QuickLook trên các độ phân giải màn hình khác nhau.\n"
         "• Lũy kế 18/11: Hoàn thiện Admin Portal Overview và TopHeader theo phong cách Pixel-Perfect [SCRUM-95], tái cấu trúc biểu đồ Bloom Donut Chart."),

        ("2.5. Trần Thị Bích Hân – Frontend Multimedia & Theme System Engineer",
         "• Đánh giá hiệu năng hệ thống hạt rơi (Particle Overlay) mùa đông / lễ hội trên điện thoại, tối ưu số lượng phần tử DOM đảm bảo trải nghiệm 60 FPS.\n"
         "• Kiểm tra tính tương thích của component sóng âm thanh (Audio Waveform) trên cả Safari iOS và Chrome Android, tránh lỗi chặn phát âm thanh.\n"
         "• Đồng bộ thư viện biểu tượng cảm xúc trong bảng chọn Slack Emoji Picker, bảo đảm hiển thị sắc nét trên màn hình Retina.\n"
         "• Lũy kế 18/11: Tích hợp hệ thống Theme đa mùa kèm công cụ soạn thảo công thức KaTeX trực quan [SCRUM-100].")
    ]

    for title, content in members_data:
        add_heading_2(title)
        p_m = add_p()
        r_m = p_m.add_run(content)
        set_font(r_m, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 3: BẢNG LỖI KỸ THUẬT ====================
    add_heading_1("3. Bảng tổng hợp 10 lỗi kỹ thuật nghiêm trọng đã phát hiện và xử lý triệt để")

    table1 = doc.add_table(rows=11, cols=4)
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
        ("1", "Máy nóng, lag và điện thoại không nạp được Q-Group",
         "File qgroups.json phình to lên 66.4 MB do lưu base64 của file Excel 21MB trực tiếp vào JSON.",
         "Bóc tách tệp lưu đĩa cứng data/uploads/qgroup_attachments/, CSDL giảm xuống còn 34 KB (giảm 99.95%)."),
        ("2", "Lỗi name uuid is not defined khi upload tệp",
         "Endpoint upload của document-service sử dụng uuid.uuid4() nhưng thiếu câu lệnh import uuid.",
         "Bổ sung import uuid trong main.py; upload tài liệu và bảng tính hoạt động 100% trơn tru."),
        ("3", "Voice recording thu xong không phát lại được",
         "MediaRecorder xuất tệp .webm nhưng Gateway trả về Content-Type video/webm làm trình duyệt lỗi.",
         "Bổ sung bảng AUDIO_EXT_MAP chuẩn hóa ép kiểu audio/webm và audio/mp4 chính xác."),
        ("4", "Sóng âm thanh audio giả lập, không theo giọng nói",
         "Component cũ hiển thị các vạch CSS nhảy ngẫu nhiên bằng Math.random() không có ý nghĩa.",
         "Viết mới AudioMessagePlayer.tsx dùng Web Audio API phân tích mảng biên độ PCM 32 vạch sống động."),
        ("5", "Bấm 'Chuyển quyền Trưởng nhóm' hiện 'Xóa đoạn chat'",
         "Sự kiện menu context của Kênh nhóm bị nối nhầm prop onLeave tới hàm handleDeleteChat.",
         "Trỏ đúng về handleLeaveGroup; đổi thuật ngữ sang 'Chuyển quyền Trưởng nhóm' chuẩn mực sư phạm."),
        ("6", "Tự động gắn nút 'Sinh đề thi' khi gửi file Word/Excel",
         "Logic render file tự động áp dụng card hành động sinh đề thi giáo trình cho mọi file.",
         "Bóc tách rành mạch: File gửi qua kẹp ghim chỉ có Xem & Tải về; nút Giáo trình UTH đặt riêng biệt."),
        ("7", "Tải file Word về bị lỗi, không xem trước được file",
         "Thư viện docx-preview render trên client bị lỗi font và tạo khung xám che khuất tiêu đề.",
         "Gỡ bỏ docx-preview, thiết kế thẻ QuickLook với tùy chọn 'Xem trực tuyến' qua Google Docs Viewer."),
        ("8", "Ghim tin nhắn và hội thoại không biết tìm ở đâu",
         "Chưa có giao diện hiển thị trạng thái ghim trên Sidebar và khung chat.",
         "Bổ sung icon 📌 sắp xếp hội thoại lên đầu; thiết kế thanh Pinned Message Bar gắn dưới header chat."),
        ("9", "Nghẽn CSDL SQLite khi nhiều người tải tài liệu cùng lúc",
         "SQLite ở chế độ Rollback Journal khóa toàn bộ tệp cơ sở dữ liệu khi có giao tác ghi.",
         "Bật chế độ PRAGMA journal_mode=WAL, tăng busy_timeout lên 60,000ms và cơ chế auto-retry."),
        ("10", "Công thức Toán - Lý (LaTeX) bị mất dấu gạch chéo ngược",
         "Ký tự backslash trong \\frac, \\sqrt bị bộ phân tích JSON mặc định nuốt mất.",
         "Tích hợp json-repair và regex tự động khôi phục cú pháp LaTeX toán học trước khi parse.")
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

    # ==================== MỤC 4: BẢNG SLA ====================
    add_heading_1("4. Bảng đối soát chỉ số SLA và hiệu năng toàn hệ sinh thái")

    table2 = doc.add_table(rows=8, cols=4)
    table2.alignment = WD_TABLE_ALIGNMENT.CENTER
    table2.autofit = False

    t2_widths = [Inches(2.5), Inches(1.5), Inches(1.5), Inches(1.5)]
    headers2 = ["Chỉ số Kỹ thuật & Hiệu năng", "Trước tối ưu (17/11)", "Hiện tại (19/11)", "Đánh giá mức cải thiện"]

    hdr_row2 = table2.rows[0]
    for i, h in enumerate(headers2):
        cell = hdr_row2.cells[i]
        cell.width = t2_widths[i]
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(h)
        set_font(r, size=10, bold=True, color=COLOR_TEAL)
        set_cell_background(cell, "E0F2F1")
        set_cell_margins(cell, 60, 60, 80, 80)

    sla_data = [
        ("Dung lượng CSDL qgroups.json", "66.4 MB", "34.2 KB", "Giảm 99.95% (Tuyệt đối)"),
        ("Thời gian nạp phòng chat di động", "> 15.0 s (hoặc lỗi)", "0.18 s", "Nhanh hơn 83 lần"),
        ("Độ trễ trung bình 8 Microservices", "42.5 ms", "5.7 ms", "Đạt chuẩn Optimal"),
        ("Thời gian đảo 4 mã đề (Fisher-Yates)", "1,250 ms", "571.9 ms", "Rút ngắn 54.2%"),
        ("Tỷ lệ trích xuất đúng công thức Toán/Lý", "82.4%", "99.6%", "Bảo toàn hoàn hảo LaTeX"),
        ("Độ chính xác đối soát đáp án trắc nghiệm", "100%", "100%", "Tuyệt đối chuẩn xác"),
        ("Tỷ lệ biên dịch Frontend (npm run build)", "0 Lỗi", "0 Lỗi (2,073 mods)", "Hoàn thành tuyệt đối")
    ]

    for row_idx, item in enumerate(sla_data, start=1):
        row = table2.rows[row_idx]
        for col_idx, val in enumerate(item):
            cell = row.cells[col_idx]
            cell.width = t2_widths[col_idx]
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if col_idx == 0 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(val)
            set_font(r, size=9.5, bold=(col_idx == 2 or col_idx == 3), color=COLOR_DARK)
            set_cell_background(cell, "F9FAFB" if row_idx % 2 == 0 else "FFFFFF")
            set_cell_margins(cell, 50, 50, 70, 70)

    tblPr2 = table2._tbl.tblPr
    borders2 = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr2.append(borders2)

    # ==================== MỤC 5: MINH CHỨNG HÌNH ẢNH THỰC TẾ ====================
    add_heading_1("5. Minh chứng hình ảnh nghiệm thu thực tế trên hệ thống")

    img_quicklook = r"C:\Users\HO ANH VU\.gemini\antigravity\brain\25a27ff9-b740-4ff5-afa2-8c0238cd4124\.user_uploaded\media_1795090183942_87846546.png"
    img_emoji = r"C:\Users\HO ANH VU\.gemini\antigravity\brain\25a27ff9-b740-4ff5-afa2-8c0238cd4124\.user_uploaded\media_1795086087742_7f3c8c5d.jpg"

    def safe_add_image(p, img_path, width):
        try:
            with Image.open(img_path) as im:
                buf = io.BytesIO()
                im.convert("RGB").save(buf, format="PNG")
                buf.seek(0)
                p.add_run().add_picture(buf, width=width)
                return True
        except Exception as e:
            print(f"Warning: could not add image {img_path}: {e}")
            return False

    if os.path.exists(img_quicklook):
        p_img1 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
        if safe_add_image(p_img1, img_quicklook, Inches(6.0)):
            p_cap1 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
            r_cap1 = p_cap1.add_run("Hình 1: Thẻ xem trước tài liệu Apple QuickLook Glassmorphic với tùy chọn Xem trực tuyến và Tải về máy riêng biệt.")
            set_font(r_cap1, size=9.5, italic=True, color=COLOR_MUTED)

    if os.path.exists(img_emoji):
        p_img2 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=6, space_after=2)
        if safe_add_image(p_img2, img_emoji, Inches(3.6)):
            p_cap2 = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
            r_cap2 = p_cap2.add_run("Hình 2: Bộ chọn biểu cảm Slack Emoji Picker chuẩn 9 chuyên mục và thanh tìm kiếm tức thì theo từ khóa.")
            set_font(r_cap2, size=9.5, italic=True, color=COLOR_MUTED)

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

    r_date = p_sig.add_run("TP. Hồ Chí Minh, ngày 19 tháng 11 năm 2026\n")
    set_font(r_date, size=10.5, italic=True, color=COLOR_MUTED)
    r_role = p_sig.add_run("Trưởng nhóm thực hiện\n\n\n\n")
    set_font(r_role, size=11, bold=True, color=COLOR_DARK)
    r_name = p_sig.add_run("Hồ Anh Vũ")
    set_font(r_name, size=12, bold=True, color=COLOR_TEAL)

    # Save document
    filename = "060205013608_HoAnhVu_BaoCaoTienDoVaNghiemThuNgay_19112026.docx"
    doc.save(filename)
    print(f"Report saved successfully as: {filename}")

if __name__ == "__main__":
    create_report()
