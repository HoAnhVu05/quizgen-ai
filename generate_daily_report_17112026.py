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
    r2 = p_header.add_run("KHOA CÔNG NGHỆ THÔNG TIN – BỘ MÔN KỸ THUẬT PHẦN MỀM")
    set_font(r2, size=11, bold=True, color=COLOR_TEAL)

    p_title = add_p(align=WD_ALIGN_PARAGRAPH.CENTER, space_before=10, space_after=8)
    r_t1 = p_title.add_run("BÁO CÁO CÔNG VIỆC TRONG NGÀY CỦA TRƯỞNG NHÓM (LEADER)\n")
    set_font(r_t1, size=15, bold=True, color=COLOR_TEAL)
    r_t2 = p_title.add_run("TỔNG HỢP TOÀN DIỆN TIẾN ĐỘ 3 NGÀY: THỨ BẢY (14/11), THỨ HAI (16/11) & THỨ BA (17/11/2026)\n"
                           "TÍCH HỢP HỘI NHÓM Q-GROUP, THƯ VIỆN GIÁO TRÌNH DÙNG CHUNG, NÂNG CẤP 4 BACKEND SERVICES, TỐI ƯU HÓA UX/UI & ĐỒNG BỘ SUB-SECOND\n")
    set_font(r_t2, size=11.5, bold=True, color=COLOR_DARK)
    r_t3 = p_title.add_run("(Giai đoạn: Khởi đầu Sprint 4 – Tuần 4 | Ngày báo cáo: Thứ Ba, ngày 17/11/2026)")
    set_font(r_t3, size=10.5, italic=True, color=COLOR_MUTED)

    # ==================== TABLE 0: THÔNG TIN DỰ ÁN ====================
    table0 = doc.add_table(rows=6, cols=2)
    table0.alignment = WD_TABLE_ALIGNMENT.CENTER
    table0.autofit = False

    col_widths = [Inches(2.1), Inches(4.9)]
    meta_info = [
        ("Tên nhóm:", "Nhóm 1 – Học kỳ Doanh nghiệp (HKDN HK1/2026 – 2027)"),
        ("Tên đề tài:", "QuizGen AI – Nền tảng Khởi tạo Đề thi Học thuật & Khảo thí Trực tuyến ứng dụng RAG/AI"),
        ("Họ và tên Trưởng nhóm:", "Hồ Anh Vũ (MSSV: 060205013608) – Vai trò: Team Leader & Full-stack / DevOps"),
        ("Thời gian thực hiện:", "Giai đoạn 3 ngày: Thứ Bảy (14/11), Thứ Hai (16/11) và Thứ Ba (17/11/2026)"),
        ("Phạm vi tổng hợp:", "Toàn diện tiến độ 6 thành viên trên các nhánh Git (develop, frontend, feature/exam-service, feature/database-architecture, feature/upload-from-nguyentann-20261030) với hơn 85 commits, 12 Jira issues (SCRUM-85 đến SCRUM-112)."),
        ("Trạng thái hệ thống:", "100% Microservices Healthy, TypeScript build đạt 0 lỗi (2,076 modules transformed), đồng bộ cơ sở dữ liệu và In-memory cache phản hồi sub-second (<1s).")
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

    # ==================== MỤC 1: TỔNG HỢP CÔNG VIỆC CỦA TỪNG THÀNH VIÊN ====================
    add_heading_1("1. Tổng hợp công việc của từng thành viên trong 3 ngày (14/11, 16/11 & 17/11/2026)")

    intro_p = add_p()
    intro_r = intro_p.add_run(
        "Trong đợt làm việc cao điểm liên tục 3 ngày từ Thứ Bảy (14/11/2026), Thứ Hai (16/11/2026) đến Thứ Ba (17/11/2026), "
        "toàn bộ 6 thành viên Nhóm 1 đã nỗ lực hoàn thành xuất sắc các mục tiêu chuyển giao then chốt từ cuối Sprint 3 sang Sprint 4. "
        "Hệ thống QuizGen AI đã có những bước chuyển biến vượt bậc về mặt kiến trúc phân tán Microservices, thuật toán trích xuất ngữ cảnh RAG, "
        "trải nghiệm người dùng (UX/UI tối giản, linh hoạt) và đặc biệt là phân hệ Không gian Hội nhóm Chuyên môn Q-Group cùng Thư viện Giáo trình Dùng chung. "
        "Chi tiết tiến độ và đóng góp của từng thành viên cụ thể như sau:"
    )
    set_font(intro_r, size=11, color=COLOR_DARK)

    # 1. Hồ Anh Vũ
    add_heading_2("1.1. Hồ Anh Vũ (MSSV: 060205013608) – Leader | Nhánh: develop | Jira: SCRUM-103 -> SCRUM-112")
    m1_p = add_p()
    m1_text = (
        "• Kiến trúc và Điều phối Hệ thống Không gian Hội nhóm Q-Group (SCRUM-104, SCRUM-105, SCRUM-107, SCRUM-108, SCRUM-109, SCRUM-110, SCRUM-111):\n"
        "  - Thiết kế và hiện thực hóa mô hình Box Chatroom học thuật phân quyền sâu dành cho Bộ môn/Khoa: Giảng viên có thể trao đổi chuyên môn, gửi đính kèm Giáo trình (.pdf) hoặc Đề thi đã đóng gói (kèm số câu, thời gian làm bài, cấu hình ma trận).\n"
        "  - Phát triển hệ thống quản lý phòng chuyên sâu: Chỉnh sửa tên nhóm, cấu hình chính sách duyệt thành viên (Tự do tham gia / Cần Trưởng nhóm phê duyệt), phân quyền Trưởng nhóm & Nhượng quyền quản trị, sao chép mã phòng nhanh (Quick Copy Badge), kích/xóa thành viên và giải tán nhóm.\n"
        "  - Xây dựng hệ thống Lời mời tham gia nhóm chính thức (Q-Group Formal Invitation): Tài khoản được mời sẽ nhận thông báo Banner trực tiếp trên màn hình, duyệt hoặc từ chối lời mời thời gian thực.\n"
        "  - Bổ sung tính năng Nhắn tin riêng 1-on-1 giữa các giảng viên, thả cảm xúc Emoji phản hồi tin nhắn, Ghim tin nhắn quan trọng (Pinned message) lên đầu phòng chat.\n"
        "  - Thiết kế UX/UI chatbox chuyên nghiệp, tách bạch rõ ràng cấu trúc phân vùng theo phong cách Slack / Zalo Work hiện đại.\n"
        "  - Đưa 'Hội nhóm Q-Group' ra vị trí Menu chính trên Sidebar bên cạnh Tổng quan Học thuật và Diễn đàn, tối ưu trải nghiệm truy cập 1-chạm.\n"
        "• Nâng cấp Cơ chế Đồng bộ Dữ liệu Tập trung & Tối ưu Sub-Second Sync (SCRUM-109, SCRUM-110, SCRUM-111):\n"
        "  - Xây dựng 2 endpoint RESTful tại Document Service: GET /documents/qgroups/{group_id}/messages và POST /documents/qgroups/{group_id}/messages; thiết lập bộ nhớ đệm In-Memory Cache (_CACHED_QGROUPS, _CACHED_INVITATIONS) trên backend giúp phản hồi API đạt tốc độ mili-giây.\n"
        "  - Rút ngắn chu kỳ polling từ 3000ms xuống 1000ms (1 giây), loại bỏ độ trễ tin nhắn giữa các tài khoản khác nhau.\n"
        "• Khắc phục Lỗi Logic Chọn Giáo trình Bước 2 & Bổ sung Modal Duyệt Thư viện 1-Chạm (SCRUM-111):\n"
        "  - Khắc phục triệt để lỗi tự động gán giáo trình public khi tài khoản cá nhân chưa có sách; thiết lập ưu tiên tuyệt đối Giáo trình của Tôi.\n"
        "  - Tích hợp cửa sổ Popup (Modal) Thư viện Dùng chung ngay tại Bước 2, cho phép giảng viên chọn sách chuẩn trực tiếp mà không cần quay lại Bước 1.\n"
        "• Tối ưu Hóa Bảng Điều Khiển Dashboard & Phòng ngừa Lỗi Runtime (SCRUM-106, SCRUM-110, SCRUM-112):\n"
        "  - Tích hợp API Gateway proxy /api/v1/dashboard và endpoint /dashboard/summary; thống kê chính xác số lượng giáo trình cá nhân và sách dùng chung.\n"
        "  - Xóa bỏ 100% thuật ngữ kỹ thuật mang tính nội bộ (RAG, Vector, ChromaDB, Tokens) khỏi giao diện người dùng, thay bằng ngữ nghĩa sư phạm trong sáng.\n"
        "  - Cập nhật 4 thẻ KPI Dashboard thành các thẻ điều hướng tương tác (Clickable cards); bọc toàn diện <ErrorBoundary> và cập nhật metadata TopHeader ngăn ngừa lỗi sập trắng màn hình."
    )
    r = m1_p.add_run(m1_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # 2. Ngô Phạm Công Đức
    add_heading_2("1.2. Ngô Phạm Công Đức (MSSV: 052205015692) – Exam Service & Exporter | Nhánh: feature/exam-service | Jira: SCRUM-88, SCRUM-93")
    m2_p = add_p()
    m2_text = (
        "• Tự Động Chèn Hình Vẽ & Sơ Đồ Kỹ Thuật Vào Đề Thi Xuất Bản (SCRUM-88):\n"
        "  - Nâng cấp mô-đun docx_exporter.py và pdf_omr_exporter.py: Nhận diện tự động các câu hỏi có trường has_image=true hoặc chứa imageUrl / imageCaption để tự động chèn hình ảnh minh họa sắc nét ngay dưới phần thân câu hỏi.\n"
        "  - Căn chỉnh tự động kích thước ảnh theo chuẩn khổ giấy A4, đảm bảo không bị tràn lề, không vỡ trang in ấn học thuật.\n"
        "  - Đồng bộ ma trận trắc nghiệm và phiếu trả lời trắc nghiệm OMR 50 câu khớp chính xác với từng mã đề thi hoán vị.\n"
        "• Kiểm Thử Tích Hợp Đầu - Cuối E2E Toàn Diện Hệ Thống (SCRUM-93):\n"
        "  - Phối hợp cùng Leader giải quyết xung đột hợp nhất mã nguồn giữa Exam Service và Gateway.\n"
        "  - Xây dựng bộ test case E2E mô phỏng luồng hoàn chỉnh: Từ lúc nạp tài liệu -> RAG trích xuất ngữ cảnh -> AI sinh 40 câu hỏi trắc nghiệm -> Biên tập duyệt câu hỏi -> Đóng gói trộn 4 mã đề -> Xuất file Word (.docx) và PDF OMR in ấn; xác nhận 100% kịch bản đạt chuẩn."
    )
    r = m2_p.add_run(m2_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # 3. Nguyễn Đức Cường
    add_heading_2("1.3. Nguyễn Đức Cường (MSSV: 054205001431) – Database & DevOps | Nhánh: feature/database-architecture | Jira: SCRUM-90, SCRUM-94")
    m3_p = add_p()
    m3_text = (
        "• Bổ Sung Trường Đa Phương Tiện Vào Cơ Sở Dữ Liệu Questions (SCRUM-90):\n"
        "  - Xây dựng bản Migration cập nhật bảng exam.questions: Bổ sung 3 trường dữ liệu mới (image_url TEXT, has_formula BOOLEAN DEFAULT FALSE, image_caption VARCHAR(255)) hỗ trợ lưu trữ câu hỏi chứa sơ đồ mạch điện, đồ thị giải tích và biểu đồ thuật toán.\n"
        "  - Đánh chỉ mục B-Tree idx_questions_has_image và idx_questions_has_formula phục vụ tra cứu và lọc nhanh câu hỏi nâng cao.\n"
        "• Xây Dựng SQL Views & Trigger Dọn Dẹp Dữ Liệu Cascade (SCRUM-94):\n"
        "  - Thiết kế các SQL Views phục vụ phân hệ Admin Portal và Dashboard: v_admin_system_metrics, v_user_document_stats giúp Gateway tổng hợp số liệu trực tiếp từ Postgres với thời gian thực thi < 15ms.\n"
        "  - Lập trình Database Trigger trg_cascade_delete_document_data: Tự động dọn dẹp toàn bộ dữ liệu liên đới (chunks, trích dẫn, câu hỏi nháp) khi giáo trình bị xóa, chống phân mảnh dữ liệu."
    )
    r = m3_p.add_run(m3_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # 4. Huỳnh Hồ Hiệu Hiệu
    add_heading_2("1.4. Huỳnh Hồ Hiệu Hiệu (MSSV: 058305002228) – Frontend UI/UX | Nhánh: feature/auth-multi-role-token-refresh, develop | Jira: SCRUM-85, SCRUM-87, SCRUM-95")
    m4_p = add_p()
    m4_text = (
        "• Tinh Chỉnh Hệ Thống Màu Sắc & Nhất Quán Giao Diện (SCRUM-85):\n"
        "  - Chuẩn hóa hệ thống bảng màu thương hiệu QuizGen AI: Màu xanh ngọc chủ đạo (Teal #008689) kết hợp bảng màu phụ trợ pastel nhã nhặn trên toàn bộ các thanh điều khiển (Sidebar, TopHeader, Cards).\n"
        "  - Loại bỏ các đường viền thô cứng, nâng cấp hệ thống đổ bóng shadow-xs/2xs hiện đại, tạo cảm giác thoáng đãng, thân thiện cho giảng viên.\n"
        "• Tái Thiết Kế Biểu Đồ Thang Đo Bloom Dạng Donut Chart & Smart Cards (SCRUM-87):\n"
        "  - Thay thế danh sách phẳng đơn điệu bằng biểu đồ tròn Donut Chart tương tác trực quan 4 mức độ nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích).\n"
        "  - Tích hợp 4 Smart Cards trực quan hóa số lượng và tỷ lệ phần trăm câu hỏi theo thời gian thực; hỗ trợ hover highlight đồng bộ giữa thẻ và biểu đồ.\n"
        "• Redesign Admin Portal Overview & Master-Detail Inspection (SCRUM-95):\n"
        "  - Tái cấu trúc trang Tổng quan Quản trị viên theo bố cục 2 cột Master-Detail sắc nét, bố trí các thẻ KPI giám sát dung lượng hệ thống, trạng thái dịch vụ và bảng danh sách người dùng khoa học."
    )
    r = m4_p.add_run(m4_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # 5. Nguyễn Văn Tân
    add_heading_2("1.5. Nguyễn Văn Tân (MSSV: 060205012615) – Document, RAG, Payment & Admin Service | Nhánh: feature/upload-from-nguyentann-20261030 | Jira: SCRUM-86, SCRUM-96, SCRUM-99")
    m5_p = add_p()
    m5_text = (
        "• Phát Triển Payment Service Cổng 8007 & Tích Hợp Thanh Toán VietQR Tự Động (SCRUM-86):\n"
        "  - Xây dựng hoàn chỉnh microservice thanh toán độc lập trên cổng 8007; tích hợp cổng thanh toán VietQR tự động nhận diện biến động số dư qua Webhook với cơ chế Idempotency chống nạp trùng.\n"
        "  - Thiết kế giao diện thanh toán hiệu ứng sóng nước Wave Canopy, hiển thị mã QR động lớn kèm bộ đếm thời gian 15 phút và nâng cấp tài khoản tức thì lên gói PRO khi giao dịch hoàn tất.\n"
        "• Nâng Cấp Toàn Diện 4 Backend Services (SCRUM-99):\n"
        "  - Document & RAG Service: Tích hợp LaTeX Chunker chuyên biệt phân tách chính xác các khối công thức Toán/Lý; nâng cấp thuật toán Hybrid Search kết hợp BM25 văn bản và Dense Vector Embeddings (all-MiniLM-L6-v2).\n"
        "  - Admin & Payment Service: Bổ sung bộ đệm In-Memory TTL Cache giúp giảm 70% tải truy vấn vào PostgreSQL, tăng tốc độ phản hồi danh sách người dùng và báo cáo hệ thống.\n"
        "• Hoàn Thiện Bộ Giao Diện 5 Chủ Đề Lễ Hội & Mùa Trong Năm (SCRUM-96):\n"
        "  - Thiết kế bộ giao diện đa dạng theo mùa (Mùa Hạ, Mùa Thu, Mùa Đông, Tết Nguyên Đán, Ngày 30/4 & 2/9) với các họa tiết thuần Việt (Tre xanh hòa bình, Trống đồng Đông Sơn, Hoa mai vàng), mang lại diện mạo học thuật sinh động."
    )
    r = m5_p.add_run(m5_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # 6. Bích Đặng Bảo Hân
    add_heading_2("1.6. Bích Đặng Bảo Hân (MSSV: 060305003000) – Frontend & Copilot AI | Nhánh: frontend, develop | Jira: SCRUM-90, SCRUM-97, SCRUM-100")
    m6_p = add_p()
    m6_text = (
        "• Tích Hợp KaTeX & Bộ Công Cụ Soạn Thảo Công Thức Toán - Lý Trực Quan (SCRUM-90, SCRUM-100):\n"
        "  - Nhúng thư viện KaTeX và react-katex vào toàn bộ hệ thống hiển thị câu hỏi, đáp án và lời giải chi tiết, giải quyết triệt để lỗi vỡ công thức LaTeX.\n"
        "  - Xây dựng thanh công cụ hỗ trợ gõ công thức nhanh (Toán học, Vật lý, Hóa học) tại Không gian Đối soát Bước 3, giúp giảng viên chỉnh sửa đề thi tiện lợi.\n"
        "• Mở Rộng Hồ Sơ Học Thuật Giảng Viên & Tinh Gọn Empty State (SCRUM-97):\n"
        "  - Phát triển cửa sổ UserProfileModal: Mở rộng thông tin học thuật chuyên sâu (Mã số giảng viên, Chức vụ, Bộ môn, Lab nghiên cứu, Học phần phụ trách chính, Hướng nghiên cứu chuyên sâu).\n"
        "  - Thiết kế trạng thái rỗng (Empty State) tinh gọn cho màn hình Kiểm duyệt đề thi kèm nút nạp câu hỏi mẫu thông minh.\n"
        "• Tối Ưu Hóa Bundle Splitting & Trình Xem Ảnh Lightbox (SCRUM-100):\n"
        "  - Cấu hình phân mảnh gói Vite (Vendor Chunks: vendor-react, vendor-katex, vendor-icons), giảm kích thước tệp tải trang ban đầu xuống dưới 155 kB gzip, tăng tốc độ phản hồi UI.\n"
        "  - Tích hợp modal phóng to ảnh đa phương tiện (Multimodal Lightbox) cho phép giảng viên zoom cận cảnh các sơ đồ giải tích phức tạp."
    )
    r = m6_p.add_run(m6_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 2: KẾ HOẠCH CÔNG VIỆC TIẾP THEO ====================
    add_heading_1("2. Kế hoạch công việc tiếp theo của nhóm (Ngày 18/11/2026 & Định hướng Tuần 4)")
    plan_p = add_p()
    plan_text = (
        "• 1. Hoàn thiện tính năng chia sẻ tệp trực tiếp trong Q-Group Chat: Hỗ trợ giảng viên upload file tài liệu PDF/DOCX trực tiếp từ máy tính lên phòng chat và tự động index vào kho dùng chung của nhóm.\n"
        "• 2. Triển khai thử nghiệm tải đồng thời (Load Testing): Sử dụng Locust/k6 mô phỏng 100 giảng viên cùng lúc truy cập phòng chat Q-Group và sinh câu hỏi AI để kiểm tra độ ổn định của API Gateway và PostgreSQL.\n"
        "• 3. Mở rộng bộ phân loại nhận thức Bloom đa ngôn ngữ: Huấn luyện tinh chỉnh prompt Gemini 2.5 Flash nâng cao độ chính xác phân loại câu hỏi mức độ Vận dụng cao (C4) và Đánh giá (C5) theo chuẩn khảo thí quốc tế.\n"
        "• 4. Chuẩn bị hồ sơ nghiệm thu kỹ thuật HKDN: Hoàn thiện tài liệu kiến trúc phần mềm (SAD), nhật ký kiểm toán hệ thống (Audit Trail) và video demo hoàn chỉnh toàn bộ 4 bước biên soạn đề thi."
    )
    r = plan_p.add_run(plan_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 3: KHÓ KHĂN & GIẢI PHÁP ====================
    add_heading_1("3. Khó khăn, vướng mắc phát sinh trong 3 ngày và giải pháp xử lý kỹ thuật")

    issues = [
        ("1. Trễ tin nhắn trong phòng chat Q-Group (3 - 5 giây) giữa các tài khoản khác nhau:",
         "Vấn đề: Ban đầu chu kỳ polling tin nhắn đặt ở mức 3000ms - 5000ms và mỗi lần đọc tin nhắn đều phải truy vấn I/O từ tệp SQLite/Postgres trên đĩa, dẫn đến hiện tượng trễ rõ rệt khi giảng viên trao đổi.\n"
         "Giải pháp: Leader Hồ Anh Vũ đã tái cấu trúc endpoint đọc/ghi tin nhắn tại Document Service với bộ nhớ đệm In-Memory Cache (_CACHED_QGROUPS) phản hồi siêu tốc dưới 5ms, đồng thời giảm chu kỳ polling xuống 1000ms (1 giây), giúp tin nhắn hiển thị tức thì."),

        ("2. Lỗi Bước 2 tự động chọn giáo trình dùng chung khi người dùng chưa có tài liệu cá nhân:",
         "Vấn đề: Khi tài khoản giảng viên mới đăng nhập (0 tài liệu cá nhân), màn hình Bước 2 tự động lấy phần tử đầu tiên của danh sách gộp (cuốn 'BAI GIANG Tu tuong HCM.pdf') và tự tích chọn Chương 1, gây nhầm lẫn nghiêm trọng về quyền sở hữu học liệu.\n"
         "Giải pháp: Leader đã tách biệt triệt để 2 luồng nạp (myDocuments và sharedDocuments), thiết lập cơ chế ưu tiên tuyệt đối tài liệu cá nhân. Khi tài khoản chưa có sách, hiển thị khung trạng thái rỗng chuyên nghiệp kèm nút 'Nạp giáo trình của tôi' hoặc mở Modal chọn sách dùng chung trực tiếp ngay tại Bước 2 mà không cần quay lại Bước 1."),

        ("3. Lỗi Runtime sập trắng màn hình khi truy cập phân hệ 'Hội nhóm Q-Group' từ Sidebar:",
         "Vấn đề: Sau khi đưa mục 'Hội nhóm Q-Group' ra Sidebar chính, component TopHeader bị thiếu trường hợp ánh xạ metadata (Thiếu case 'qgroup' và import icon Users trong hàm getScreenMeta), dẫn đến React ném lỗi Uncaught TypeError và làm trắng toàn bộ giao diện.\n"
         "Giải pháp: Leader đã bổ sung đầy đủ metadata cho màn hình Q-Group trong TopHeader, đồng thời bọc component <ErrorBoundary> toàn diện xung quanh Viewport chính để bắt lỗi an toàn và cung cấp nút bấm khôi phục thay vì sập ứng dụng."),

        ("4. Hiển thị thông số thống kê chưa trực quan và thiếu tương tác trên Bảng điều khiển Dashboard:",
         "Vấn đề: Giảng viên phản ánh các thẻ thống kê như 'Câu hỏi chờ đối soát' và 'Đề thi nháp đã lưu' hiển thị số 0 mà không rõ ý nghĩa, đồng thời không bấm vào để thao tác được.\n"
         "Giải pháp: Nhóm đã cập nhật logic liên kết động giữa Dashboard và dữ liệu thực tế: Đổi tên thành 'Đề thi đã lưu', hiển thị dòng chú thích giải thích rõ quy trình khi số lượng bằng 0, và biến toàn bộ 4 thẻ KPI thành các nút bấm thông minh chuyển tiếp tức thì đến các Bước 1, 2, 3, 4.")
    ]

    for title, desc in issues:
        p = add_p(space_before=4, space_after=2)
        r = p.add_run(title)
        set_font(r, size=11, bold=True, color=COLOR_DARK)
        p_desc = add_p(space_before=1, space_after=4)
        r_desc = p_desc.add_run(desc)
        set_font(r_desc, size=10.5, color=COLOR_DARK)

    # ==================== MỤC 4: MINH CHỨNG CÔNG VIỆC ====================
    add_heading_1("4. Minh chứng công việc (Liên kết Git, Jira, Google Drive & Hình ảnh thực tế)")

    add_heading_2("4.1. Danh mục liên kết kiểm chứng trực tiếp trên Git, Jira và Google Drive:")
    links_p = add_p()
    links_text = (
        "• Thư mục Google Drive Báo cáo Ngày Tuần 4: https://drive.google.com/drive/folders/1wPETECUCsMrGlxGJfY9tvbwXV9Pc_1x4\n"
        "• Kho mã nguồn chính thức QuizGen AI: https://github.com/HoAnhVu05/quizgen-ai (Nhánh chính: develop)\n"
        "• Bảng tiến độ Jira Scrum Sprint 4: Dự án QuizGen AI (Jira Cloud UTH)\n"
        "• Commit tiêu biểu của Trưởng nhóm (Leader Hồ Anh Vũ): d71e7e2, ae96e7c, fda52bd, 643d82a, c62e6da, 1f96d2c, e3a0b3b, 9c1c421, f78202a, 28ac8a1\n"
        "• Commit tiêu biểu backend & giao diện lễ hội (Nguyễn Văn Tân): fde4713, ad7c02d, ead1690, e1a3ba1, 760639c, 225499e, ee6b8e1\n"
        "• Commit tiêu biểu frontend & LaTeX (Bích Đặng Bảo Hân): 2c010c4, a9027ac, 5fb634d, 50ba35b, 398cef1\n"
        "• Commit tiêu biểu exporter sơ đồ hình vẽ (Ngô Phạm Công Đức): 7e8c0ca, 87e2bbb\n"
        "• Commit tiêu biểu database views & triggers (Nguyễn Đức Cường): 094894c, 152390a\n"
        "• Commit tiêu biểu UI Bloom Donut & Admin Portal (Huỳnh Hồ Hiệu Hiệu): 48f858d, 51c7955, 3470b27"
    )
    r = links_p.add_run(links_text)
    set_font(r, size=10, color=COLOR_DARK)

    add_heading_2("4.2. Tổng hợp hình ảnh minh chứng kết quả triển khai thực tế:")

    # Map of images
    media_dir = r"C:\Users\HO ANH VU\.gemini\antigravity\brain\25a27ff9-b740-4ff5-afa2-8c0238cd4124\.user_uploaded"
    img_list = [
        ("media_1794914457721_ec2dffd0.png", "Hình 1: Không gian Hội nhóm Chuyên môn Q-Group với giao diện Box Chat hiện đại, đính kèm Giáo trình và Đề thi chuẩn."),
        ("media_1794918028303_236b9a25.jpg", "Hình 2: Cửa sổ Quản lý Q-Group toàn diện: Thiết lập chính sách duyệt vào phòng, quản lý thành viên, nhượng quyền và kick thành viên."),
        ("media_1794918512078_bd71c2a7.jpg", "Hình 3: Giao diện Hội nhóm Q-Group được tích hợp đồng bộ vào thanh điều hướng Sidebar với badge đếm số lượng nhóm trực quan."),
        ("media_1794918510958_4651ba72.jpg", "Hình 4: Bảng điều khiển Biên soạn Học thuật Dashboard với Lối tắt Thư viện Giáo trình và 4 thẻ KPI thống kê tương tác."),
        ("media_1794919107322_40215db0.jpg", "Hình 5: Khắc phục lỗi tự động chọn giáo trình public ở Bước 2, tích hợp Modal Duyệt Thư viện Dùng chung 1-chạm thông minh."),
        ("media_1794920487462_feeb4dd2.png", "Hình 6: Hai thẻ thống kê 'Câu hỏi chờ đối soát' và 'Đề thi đã lưu' được cập nhật chú thích quy trình rõ ràng và hỗ trợ click điều hướng tức thì.")
    ]

    for img_name, caption in img_list:
        img_path = os.path.join(media_dir, img_name)
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(6)
            p_img.paragraph_format.space_after = Pt(2)
            run_img = p_img.add_run()
            try:
                im = Image.open(img_path)
                buf = io.BytesIO()
                im.save(buf, format='PNG')
                buf.seek(0)
                run_img.add_picture(buf, width=Inches(5.8))
            except Exception as e:
                print(f"Error adding picture {img_name}: {e}")

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(8)
            r_cap = p_cap.add_run(caption)
            set_font(r_cap, size=9.5, italic=True, color=COLOR_MUTED)

    # ==================== MỤC 5: ĐÁNH GIÁ VÀ CHẤM ĐIỂM THÀNH VIÊN ====================
    add_heading_1("5. Bảng Đánh giá và Chấm điểm Thành viên 3 Ngày (14/11, 16/11 & 17/11/2026)")
    eval_p = add_p()
    eval_text = (
        "Căn cứ vào khối lượng công việc, tinh thần phối hợp giải quyết sự cố kỹ thuật và tiến độ commit mã nguồn thực tế "
        "trong 3 ngày qua, Trưởng nhóm thực hiện đánh giá và chấm điểm định kỳ cho các thành viên Nhóm 1 như sau:"
    )
    r = eval_p.add_run(eval_text)
    set_font(r, size=10.5, color=COLOR_DARK)

    table1 = doc.add_table(rows=6, cols=7)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    table1.autofit = False

    t1_widths = [Inches(0.5), Inches(2.3), Inches(0.85), Inches(0.85), Inches(0.85), Inches(0.85), Inches(0.85)]
    headers1 = [
        "STT",
        "Họ và tên thành viên",
        "Tiêu chí 1\nCông việc\n(Max 7.0)",
        "Tiêu chí 2\nChuyên cần\n(Max 1.0)",
        "Tiêu chí 3\nBáo cáo\n(Max 1.0)",
        "Tiêu chí 4\nChủ động\n(Max 1.0)",
        "Tổng điểm\n\n(Max 10.0)"
    ]

    for col_idx, h_text in enumerate(headers1):
        cell = table1.cell(0, col_idx)
        cell.width = t1_widths[col_idx]
        set_cell_background(cell, "008689")
        set_cell_margins(cell, 100, 100, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(h_text)
        set_font(r, size=9.5, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))

    members_eval = [
        ("1", "Ngô Phạm Công Đức (052205015692)", "7.0", "1.0", "1.0", "1.0", "10.0"),
        ("2", "Nguyễn Đức Cường (054205001431)", "7.0", "1.0", "1.0", "1.0", "10.0"),
        ("3", "Huỳnh Hồ Hiệu Hiệu (058305002228)", "7.0", "1.0", "1.0", "1.0", "10.0"),
        ("4", "Bích Đặng Bảo Hân (060305003000)", "7.0", "1.0", "1.0", "1.0", "10.0"),
        ("5", "Nguyễn Văn Tân (060205012615)", "7.0", "1.0", "1.0", "1.0", "10.0")
    ]

    for row_idx, row_data in enumerate(members_eval, start=1):
        for col_idx, val in enumerate(row_data):
            cell = table1.cell(row_idx, col_idx)
            cell.width = t1_widths[col_idx]
            bg_hex = "F0FAF9" if row_idx % 2 == 1 else "FFFFFF"
            set_cell_background(cell, bg_hex)
            set_cell_margins(cell, 80, 80, 80, 80)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if col_idx == 1 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(val)
            is_bold = col_idx in (0, 1, 6)
            score_color = COLOR_TEAL if col_idx == 6 else COLOR_DARK
            set_font(r, size=10, bold=is_bold, color=score_color)

    # Borders for table1
    tblPr1 = table1._tbl.tblPr
    borders1 = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="008689"/>'
        f'<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        f'<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        f'</w:tblBorders>'
    )
    tblPr1.append(borders1)

    # ==================== CHỮ KÝ XÁC NHẬN ====================
    table2 = doc.add_table(rows=1, cols=2)
    table2.alignment = WD_TABLE_ALIGNMENT.CENTER
    table2.autofit = False
    table2.rows[0].cells[0].width = Inches(3.5)
    table2.rows[0].cells[1].width = Inches(3.5)

    p_sig = table2.rows[0].cells[1].paragraphs[0]
    p_sig.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sig.paragraph_format.space_before = Pt(16)
    p_sig.paragraph_format.line_spacing = 1.25

    r_date = p_sig.add_run("TP. Hồ Chí Minh, ngày 17 tháng 11 năm 2026\n")
    set_font(r_date, size=10.5, italic=True, color=COLOR_MUTED)
    r_role = p_sig.add_run("Trưởng nhóm thực hiện\n\n\n\n")
    set_font(r_role, size=11, bold=True, color=COLOR_DARK)
    r_name = p_sig.add_run("Hồ Anh Vũ")
    set_font(r_name, size=12, bold=True, color=COLOR_TEAL)

    # Save document
    filename = "060205013608_HoAnhVu_BaoCaoTienDoVaNghiemThuNgay_17112026.docx"
    doc.save(filename)
    print(f"Report saved successfully as: {filename}")

if __name__ == "__main__":
    create_report()
