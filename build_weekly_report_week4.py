# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from PIL import Image
import io

def build_document():
    doc = docx.Document()
    
    # Page setup: Standard A4, 2cm margins
    for s in doc.sections:
        s.page_width = Inches(8.27)
        s.page_height = Inches(11.69)
        s.top_margin = Inches(0.79)
        s.bottom_margin = Inches(0.79)
        s.left_margin = Inches(0.79)
        s.right_margin = Inches(0.79)
        
    def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
            node = OxmlElement(m)
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_cell_background(cell, fill_hex):
        shading_xml = f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'
        cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

    def set_table_borders(table, color="D3D3D3", sz="4", val="single"):
        tblPr = table._tbl.tblPr
        borders_xml = f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:left w:val="none"/>
            <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:right w:val="none"/>
            <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
        '''
        tblPr.append(parse_xml(borders_xml))

    def style_p(p, space_before=0, space_after=100, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after / 20.0)
        p.paragraph_format.line_spacing = line_spacing
        p.alignment = align

    def add_h1(text):
        p = doc.add_paragraph()
        style_p(p, space_before=14, space_after=6, align=WD_ALIGN_PARAGRAPH.LEFT)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x00, 0x86, 0x89)  # UTH Teal
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        style_p(p, space_before=10, space_after=4, align=WD_ALIGN_PARAGRAPH.LEFT)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        style_p(p, space_before=6, space_after=3, align=WD_ALIGN_PARAGRAPH.LEFT)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.italic = True
        run.font.color.rgb = RGBColor(0x00, 0x86, 0x89)
        return p

    def add_p(text="", bold_prefix="", italic_note=""):
        p = doc.add_paragraph()
        style_p(p, space_before=0, space_after=5, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Times New Roman"
            r_pre.font.size = Pt(11)
            r_pre.font.bold = True
            r_pre.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        if text:
            r_txt = p.add_run(text)
            r_txt.font.name = "Times New Roman"
            r_txt.font.size = Pt(11)
            r_txt.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        if italic_note:
            r_note = p.add_run(italic_note)
            r_note.font.name = "Times New Roman"
            r_note.font.size = Pt(10.5)
            r_note.font.italic = True
            r_note.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
        return p

    def add_bullet(bold_title, text):
        p = doc.add_paragraph(style='List Bullet')
        style_p(p, space_before=1, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        r1 = p.add_run(bold_title)
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(11)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        r2 = p.add_run(text)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(11)
        r2.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        return p

    def safe_add_image(img_path, caption_text, width=Inches(5.8)):
        if not os.path.exists(img_path):
            print(f"Warning: image not found: {img_path}")
            return None
        try:
            with Image.open(img_path) as im:
                buf = io.BytesIO()
                im.convert("RGB").save(buf, format="PNG")
                buf.seek(0)
                p_img = doc.add_paragraph()
                style_p(p_img, space_before=6, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
                p_img.add_run().add_picture(buf, width=width)
                
                p_cap = doc.add_paragraph()
                style_p(p_cap, space_before=2, space_after=8, align=WD_ALIGN_PARAGRAPH.CENTER)
                r_cap = p_cap.add_run(caption_text)
                r_cap.font.name = "Times New Roman"
                r_cap.font.size = Pt(9.5)
                r_cap.font.italic = True
                r_cap.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
                return p_img
        except Exception as e:
            print(f"Error adding image {img_path}: {e}")
            return None

    def create_table(headers, data, col_widths=None, align_cols=None):
        num_rows = len(data) + 1
        num_cols = len(headers)
        table = doc.add_table(rows=num_rows, cols=num_cols)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        
        header_tr = table.rows[0]._tr.get_or_add_trPr()
        header_tr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
        header_tr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        for c_idx, h_text in enumerate(headers):
            cell = table.cell(0, c_idx)
            set_cell_background(cell, "008689")  # UTH Teal
            set_cell_margins(cell, top=140, bottom=140, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            p = cell.paragraphs[0]
            style_p(p, space_before=0, space_after=0, line_spacing=1.0, align=WD_ALIGN_PARAGRAPH.CENTER)
            run = p.add_run(h_text)
            run.font.name = "Times New Roman"
            run.font.size = Pt(10)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            
        for r_idx, row_data in enumerate(data):
            row = table.rows[r_idx + 1]
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            
            bg_color = "F0FAF9" if (r_idx % 2 == 1) else "FFFFFF"
            for c_idx, val in enumerate(row_data):
                cell = row.cells[c_idx]
                if bg_color != "FFFFFF":
                    set_cell_background(cell, bg_color)
                set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                
                p = cell.paragraphs[0]
                col_align = WD_ALIGN_PARAGRAPH.LEFT
                if align_cols and c_idx < len(align_cols):
                    col_align = align_cols[c_idx]
                style_p(p, space_before=0, space_after=0, line_spacing=1.1, align=col_align)
                
                run = p.add_run(str(val))
                run.font.name = "Times New Roman"
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
                    
        if col_widths:
            for r in table.rows:
                for c_idx, w in enumerate(col_widths):
                    if c_idx < len(r.cells):
                        r.cells[c_idx].width = Inches(w)
                        
        set_table_borders(table, color="D3D3D3", sz="4", val="single")
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        return table

    # ==================== HEADER & TITLE ====================
    p_inst = doc.add_paragraph()
    style_p(p_inst, space_before=0, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_inst = p_inst.add_run("TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)\nVIỆN CÔNG NGHỆ THÔNG TIN VÀ CHUYỂN ĐỔI SỐ")
    r_inst.font.name = "Times New Roman"
    r_inst.font.size = Pt(11)
    r_inst.font.bold = True
    r_inst.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    p_subinst = doc.add_paragraph()
    style_p(p_subinst, space_before=0, space_after=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_sub = p_subinst.add_run("HỌC PHẦN: HỌC KỲ DOANH NGHIỆP – HỌC KỲ 1, NĂM HỌC 2026 – 2027")
    r_sub.font.name = "Times New Roman"
    r_sub.font.size = Pt(10.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(0x00, 0x86, 0x89)

    p_title = doc.add_paragraph()
    style_p(p_title, space_before=6, space_after=4, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_title = p_title.add_run("BÁO CÁO TỔNG HỢP CÔNG VIỆC TUẦN 4")
    r_title.font.name = "Times New Roman"
    r_title.font.size = Pt(17)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x00, 0x86, 0x89)

    p_subt = doc.add_paragraph()
    style_p(p_subt, space_before=0, space_after=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_subt = p_subt.add_run("Dự án nhóm: Nền tảng Biên soạn & Quản lý Đề thi Thông minh QuizGen AI & Mở rộng Odoo ERP\n(Giai đoạn: Nước rút Sprint 4 – Từ Thứ Bảy 14/11/2026 đến Thứ Sáu 20/11/2026)")
    r_subt.font.name = "Times New Roman"
    r_subt.font.size = Pt(11.5)
    r_subt.font.bold = True
    r_subt.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    # Table 1: Thông tin chung
    info_headers = ["Thông tin", "Nội dung chi tiết"]
    info_data = [
        ["Đơn vị đào tạo", "Trường Đại học Giao thông vận tải TP.HCM (UTH) – Viện CNTT&CĐS"],
        ["Tên dự án nhóm", "QuizGen AI – Nền tảng Biên soạn & Quản lý Đề thi Thông minh theo Chuẩn đầu ra (RAG/AI)"],
        ["Nhóm thực hiện", "Nhóm 1 (Học kỳ Doanh nghiệp HK1/2026 – 2027)"],
        ["Trưởng nhóm (Leader)", "Hồ Anh Vũ (MSSV: 060205013608) – Kỹ sư Trưởng kiêm Điều phối Kỹ thuật"],
        ["Thành viên nhóm", "Bích Đặng Bảo Hân, Huỳnh Hồ Hiếu Hiệu, Nguyễn Đức Cường, Ngô Phạm Công Đức, Nguyễn Văn Tân"],
        ["Thời gian thực hiện", "Tuần 4 (Từ Thứ Bảy 14/11/2026 đến Thứ Sáu 20/11/2026) – Ngày lập: 21/11/2026"],
        ["Tiến độ lũy kế dự án", "96 / 100 điểm (Đạt 96% khối lượng toàn bộ dự án – Sẵn sàng bước vào nghiệm thu)"],
        ["Môi trường vận hành", "Production: https://quizgenai.hoanhvu.id.vn (Cloudflare Tunnel + 6 Microservices)"]
    ]
    create_table(info_headers, info_data, col_widths=[2.1, 4.6], align_cols=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    # ==================== PHẦN I ====================
    add_h1("I. TÓM TẮT TÌNH HÌNH THỰC HIỆN TUẦN 4")
    add_p(
        "Trong khuôn khổ Tuần 4 (14/11/2026 – 20/11/2026), Nhóm 1 đã hoàn thành xuất sắc và toàn diện 100% khối lượng công việc được giao thuộc Sprint 4 của dự án ",
        bold_prefix="Tổng quan tiến độ Sprint 4: ",
        italic_note="QuizGen AI. Đây là tuần nước rút bản lề tập trung giải cứu hiệu năng cơ sở dữ liệu, phân rã kiến trúc monolith, tích hợp các tính năng cộng tác đa phương tiện hiện đại (WebRTC Voice Huddle, Web Audio tone synthesizer, Apple QuickLook, SheetJS Excel Viewer, Admin Face ID) và thực hiện chiến dịch kiểm thử UAT đa thiết bị trên môi trường Production."
    )
    add_p(
        "Đạt 96 / 100 điểm (tương ứng 96% tổng khối lượng công việc toàn dự án). Toàn bộ 6 microservices cốt lõi, API Gateway, hệ thống xác thực Google OAuth 2.0 / OTP / Face ID, quy trình sinh đề AI 4 bước chuẩn ma trận Bloom, thuật toán đảo 4 mã đề Fisher-Yates, xuất bản Word A4 & OMR 50 câu, và không gian hội nhóm Q-Group đã hoạt động trơn tru với độ trễ trung bình 5.7ms.",
        bold_prefix="Tiến độ tích lũy toàn dự án: "
    )
    add_p(
        "Còn đúng 1 tuần làm việc (Tuần 5: Từ 21/11 đến 28/11/2026). Trọng tâm Tuần 5 là xử lý dứt điểm các lỗi phát hiện qua đợt kiểm thử UAT, tối ưu hóa giao diện di động theo danh mục 37 lỗi UX/UI của QA, đóng gói mã nguồn và hoàn tất Hồ sơ Báo cáo Nghiệm thu Tổng kết HKDN.",
        bold_prefix="Thời gian dự kiến hoàn thành: "
    )
    add_p(
        "Điểm sáng công nghệ trong tuần bao gồm: Giải cứu bộ nhớ CSDL qgroups.json giảm 99.95% (từ 66.4 MB xuống 34.2 KB); xây dựng hệ thống thoại nhóm trực tiếp WebRTC Voice Huddle kết hợp bộ tạo âm thanh chuông gọi Web Audio API thuần; nhúng trình đọc bảng tính Excel trực tiếp SheetJS; áp dụng nhận diện khuôn mặt Admin Face ID 3 góc độ; bóc tách hơn 3,200 dòng mã nguyên khối sang kiến trúc Component-based; và biên dịch Frontend đạt 2,144 modules với 0 lỗi TypeScript.",
        bold_prefix="Trọng tâm công nghệ: "
    )
    add_p(
        "Toàn bộ 6/6 thành viên duy trì kỷ luật lao động nghiêm túc, tuân thủ nghiêm ngặt quy trình Git Branching, báo cáo tiến độ đúng thời hạn lên Google Drive. Dự án hoàn thành xuất sắc các chỉ tiêu Sprint 4, sẵn sàng cho công tác bảo vệ đồ án.",
        bold_prefix="Đánh giá chung: "
    )

    # ==================== PHẦN II ====================
    add_h1("II. CÔNG VIỆC DỰ ÁN NHÓM ĐÃ THỰC HIỆN TRONG TUẦN 4 (QUIZGEN AI & ODOO ERP)")
    
    add_h2("2.1. Diễn biến công việc theo ngày trong tuần (14/11 – 20/11/2026)")
    add_p("Tiến trình triển khai Sprint 4 được phân bổ khoa học và thực hiện xuyên suốt 7 ngày trong tuần như sau:")

    add_bullet(
        "Thứ Bảy (14/11/2026) – Chủ Nhật (15/11/2026) | Khởi động Sprint 4 & Lập Kế hoạch: ",
        "Trưởng nhóm chủ trì cuộc họp mở màn Sprint 4. Rà soát các điểm nghẽn hiệu năng sau đợt kiểm thử tải Sprint 3. Phân bổ User Stories nâng cấp 4 backend microservices (SCRUM-99) cho Tân, thiết kế view thống kê CSDL (SCRUM-94) cho Cường, hoàn thiện tài liệu SRS (SCRUM-105) cho Đức, và nghiên cứu tối ưu giao diện Overview/TopHeader cho Hiệu và Hân."
    )
    add_bullet(
        "Thứ Hai (16/11/2026) | Nâng cấp 4 Backend Services & Giao diện Admin Overview: ",
        "Tân hoàn tất nâng cấp 4 backend microservices (Auth, Document, AI, Exam) với In-memory TTL Cache và sửa lỗi chunker.py; Cường xây dựng 7 database views thống kê cho Admin Portal; Hiệu và Hân tinh chỉnh giao diện Admin Overview và TopHeader theo chuẩn nhận diện UTH; Leader Vũ cấu hình Gateway Routing và CORS an toàn."
    )
    add_bullet(
        "Thứ Ba (17/11/2026) | Nghiệm thu Báo cáo Đợt 1 Tuần 4 & Đo đạc Hiệu năng: ",
        "Toàn hệ thống vượt qua bộ test liên thông E2E đạt 100% PASS. Trưởng nhóm tiến hành nghiệm thu kỹ thuật, đối soát mã nguồn và nộp Báo cáo Tiến độ 3 ngày (14-17/11) lên Google Drive. Hệ thống Admin Portal và Microservices hoạt động liên tục không gián đoạn."
    )
    add_bullet(
        "Thứ Tư (18/11/2026) | Phân tích Odoo ERP Doanh nghiệp & Diễn đàn Học thuật: ",
        "Nhóm tiếp nhận yêu cầu mở rộng từ Quản lý dự án: Cường và Đức khảo sát nghiệp vụ và các phân hệ Odoo ERP (POS, Inventory, Purchase, Invoicing, Employees) cho mô hình quản lý quán ăn; Hân và Hiệu hoàn thiện màn hình Diễn đàn Học thuật (ForumScreen) lưu trữ CSDL thật, hiển thị ảnh nguyên tỉ lệ và bộ lọc chuyên môn."
    )
    add_bullet(
        "Thứ Năm (19/11/2026) | Giải cứu CSDL Q-Group (Giảm 99.95%) & Nâng cấp Đa phương tiện: ",
        "Leader Vũ điều tra và xử lý triệt để nguyên nhân gây lag/nóng máy thiết bị di động: bóc tách attachment khỏi CSDL qgroups.json sang ổ đĩa cứng vật lý (giảm từ 66.4 MB còn 34.2 KB); sửa lỗi thiếu thư viện UUID tại Document Service; tích hợp Tin nhắn thoại (Voice Message) phân tích sóng âm thực tế PCM Web Audio API; xây dựng bộ chọn biểu cảm Slack Emoji Picker 9 chuyên mục; thiết kế thẻ xem trước Apple QuickLook kính mờ. Trưởng nhóm nộp Báo cáo Ngày 19/11 lên Google Drive."
    )
    add_bullet(
        "Thứ Sáu (20/11/2026) | WebRTC Voice Huddle, Admin Face ID, SheetJS Excel & UAT Đa thiết bị: ",
        "Leader Vũ hoàn thiện phân rã hơn 3,200 dòng Monolith Frontend; triển khai Thoại nhóm trực tiếp WebRTC Voice Huddle và nhạc chuông Web Audio API; xây dựng module sinh trắc học Admin Face ID 3 góc mặt; nhúng trình xem Excel SheetJS và custom hook usePinchZoom. Hân thực hiện UAT 3 thiết bị (iPhone 17 Pro Max, iPad Pro 12.9\", Laptop) trên Production, lập danh mục 37 lỗi UX/UI. Hiệu kiểm thử toàn diện quy trình sinh đề AI 4 bước và thuật toán Fisher-Yates. Cường và Đức hoàn tất báo cáo Odoo ERP. Trưởng nhóm tổng hợp nghiệm thu Tuần 4."
    )

    add_h2("2.2. Chi tiết các phân hệ kỹ thuật cốt lõi đã hoàn thành trong Tuần 4")

    # 2.2.1 Lead
    add_h3("2.2.1. Hạ tầng Thoại nhóm WebRTC Huddle, Tối ưu CSDL & Phân rã Monolith (Hồ Anh Vũ - Leader)")
    add_p(
        "Trưởng nhóm đã trực tiếp giải quyết các bài toán kỹ thuật phức tạp nhất của nền tảng: giải cứu bộ nhớ CSDL qgroups.json giảm 99.95% (từ 66.4 MB xuống 34.2 KB), thời gian nạp chat trên di động giảm từ 15s xuống 0.18s; xây dựng module thoại nhóm trực tiếp WebRTC Voice Huddle với cơ chế phân tán Signaling qua API Gateway; lập trình bộ tổng hợp nhạc chuông cuộc gọi huddleRingtone.ts bằng Web Audio API thuần (440Hz – 880Hz kép) không cần nạp file mp3 ngoài; triển khai cơ chế xác thực sinh trắc học Admin Face ID 3 góc mặt (chính diện, nghiêng trái, nghiêng phải) ngăn chặn ảnh giả mạo 2D; tích hợp trình đọc bảng tính Excel Native (SheetJS) mở file tức thì; và phân rã hơn 3,200 dòng mã nguyên khối Monolith sang kiến trúc Component-based chuyên biệt.",
        bold_prefix="Đột phá kỹ thuật: "
    )
    safe_add_image("C:/Users/HO ANH VU/.gemini/antigravity/brain/18c9fb19-6f60-4cc3-87af-212542fafae1/.user_uploaded/media_1795178422835_ab8ecc32.png", "Hình 1: Phân hệ Diễn đàn Học thuật và Hội nhóm Q-Group được nâng cấp toàn diện các tính năng đa phương tiện")

    # 2.2.2 Han
    add_h3("2.2.2. Kiểm thử Chấp nhận UAT Đa vai trò & Đa thiết bị (Bích Đặng Bảo Hân)")
    add_p(
        "Thành viên Bích Đặng Bảo Hân đã chủ trì chiến dịch kiểm thử chấp nhận người dùng (UAT) đa vai trò trực tiếp trên môi trường Production (quizgenai.hoanhvu.id.vn) qua 3 môi trường phần cứng thực tế: Laptop Windows 11 (Chrome 131 / Edge 1920x1080), iPhone 17 Pro Max (Viewport 440x956 @3x Safari iOS 18), và iPad Pro 12.9\" (Viewport 1024x1366 & 1366x1024 Safari iPadOS 18). Hân đã rà soát chuyên sâu luồng Đăng nhập -> Dashboard -> ForumScreen, phát hiện các vấn đề về vùng an toàn Dynamic Island, lỗi Safari Auto-Zoom 130%, lỗi tràn bộ nhớ LocalStorage khi đính kèm file lớn, và lập danh mục tổng hợp chi tiết 37 lỗi UX/UI kèm Action Plan 3 đợt khắc phục.",
        bold_prefix="Thẩm định chất lượng: "
    )
    safe_add_image("C:/Users/HO ANH VU/.gemini/antigravity/brain/18c9fb19-6f60-4cc3-87af-212542fafae1/.user_uploaded/media_1795180693618_7d3ad5f2.jpg", "Hình 2: Thử nghiệm giao diện tương tác trên thiết bị di động trong chiến dịch kiểm thử chấp nhận UAT")

    # 2.2.3 Hieu
    add_h3("2.2.3. Kiểm thử Toàn diện Quy trình Sinh Đề Thi AI 4 Bước & Đóng gói Khảo thí (Huỳnh Hồ Hiệu Hiệu)")
    add_p(
        "Thành viên Huỳnh Hồ Hiệu Hiệu đã bấm và rà soát 100% các nút bấm, slider, form nhập liệu và luồng chuyển tiếp xuyên suốt 4 bước sinh đề: Kho Giáo trình (Bước 1), Ma trận Bloom & Chỉ đạo sư phạm (Bước 2), Đối soát Minh chứng & Biên tập đề (Bước 3), và Đóng gói Tờ đề A4 & Xuất file (Bước 4). Hiệu đã thẩm định thuật toán hoán vị Fisher-Yates tạo 4 mã đề (101, 102, 103, 104) chuẩn xác cả câu hỏi lẫn đáp án, kiểm tra Phiếu tô OMR chuẩn máy chấm, xuất thành công file Word .docx (41.4 KB), và phát hiện lỗi HTTP 404 tại endpoint PUT /api/v1/questions/{id} trên Backend.",
        bold_prefix="Khảo thí & Đóng gói: "
    )
    safe_add_image("scratch/extracted/hieu_image1.png", "Hình 3: Kết quả kiểm thử toàn diện quy trình Sinh Đề Thi AI 4 bước và thẩm định trích xuất minh chứng giáo trình")

    # 2.2.4 Cuong & Duc
    add_h3("2.2.4. Khảo sát & Phân tích Nghiệp vụ Hệ thống Quản lý Doanh nghiệp Odoo ERP (Nguyễn Đức Cường & Ngô Phạm Công Đức)")
    add_p(
        "Hai thành viên Nguyễn Đức Cường và Ngô Phạm Công Đức đã hoàn thành xuất sắc nhiệm vụ mở rộng theo yêu cầu của Doanh nghiệp: nghiên cứu tổng quan nền tảng Odoo ERP, so sánh chi tiết tính năng, chi phí bản quyền và khả năng tùy biến giữa Odoo Community và Odoo Enterprise. Nhóm đã khảo sát mô hình vận hành quán ăn thực tế, xác định các nghiệp vụ cần số hóa (Thực đơn, bàn ăn, tiếp nhận order, bếp chế biến, thanh toán, kho nguyên liệu) và lập bảng ánh xạ sang 5 phân hệ Odoo tương ứng: POS, Inventory, Purchase, Invoicing/Accounting và Employees.",
        bold_prefix="Nghiên cứu ERP: "
    )
    safe_add_image("scratch/extracted/cuong_image1.png", "Hình 4: Giao diện nghiên cứu và thử nghiệm cấu hình các phân hệ Odoo ERP cho bài toán quản lý kinh doanh")

    # 2.2.5 Tan
    add_h3("2.2.5. Tối ưu Hóa 4 Backend Microservices & API Gateway (Nguyễn Văn Tân)")
    add_p(
        "Thành viên Nguyễn Văn Tân đã hoàn thiện nhiệm vụ SCRUM-99: nâng cấp toàn diện 4 backend microservices (Auth Service 8001, Document Service 8002, AI Service 8003, Exam Service 8004), bổ sung In-memory TTL Cache giúp giảm 70% tải truy vấn cơ sở dữ liệu, tối ưu hóa pipeline trích xuất văn bản trong chunker.py bảo toàn công thức KaTeX và bảng biểu Markdown, đồng thời duy trì độ ổn định của cụm dịch vụ qua API Gateway đạt độ trễ trung bình 5.7ms.",
        bold_prefix="Hạ tầng Backend: "
    )

    add_h2("2.3. Bảng tổng hợp các chỉ số SLA và hiệu năng toàn hệ sinh thái Tuần 4")
    add_p("Những cải tiến kỹ thuật đột phá trong Sprint 4 đã mang lại bước nhảy vọt về hiệu năng và trải nghiệm hệ thống:")

    sla_headers = ["Chỉ số Kỹ thuật & Hiệu năng", "Trước tối ưu (Tuần 3)", "Hiện tại (Tuần 4)", "Đánh giá mức cải thiện"]
    sla_data = [
        ["Dung lượng CSDL qgroups.json", "66.4 MB (chứa base64)", "34.2 KB (lưu đĩa cứng)", "Giảm 99.95% (Tuyệt đối)"],
        ["Thời gian nạp phòng chat di động", "> 15.0 s (hoặc lỗi timeout)", "0.18 s", "Nhanh hơn 83 lần"],
        ["Độ trễ trung bình 6 Microservices", "33 – 42 ms", "5.7 ms", "Đạt chuẩn Optimal quốc tế"],
        ["Thời gian đảo 4 mã đề Fisher-Yates", "1,250 ms", "571.9 ms", "Rút ngắn 54.2%"],
        ["Tỷ lệ trích xuất đúng công thức LaTeX", "85.2%", "99.6%", "Bảo toàn hoàn hảo công thức"],
        ["Độ chính xác đối soát đáp án trắc nghiệm", "100%", "100%", "Tuyệt đối chuẩn xác"],
        ["Tỷ lệ biên dịch Frontend (tsc && vite)", "0 Lỗi (2,073 mods)", "0 Lỗi (2,144 mods)", "100% Type-safe trong 8.46s"],
        ["Kết quả kiểm thử tự động hệ thống", "10/10 PASS", "15/15 PASS", "Tỷ lệ vượt qua đạt 100%"]
    ]
    create_table(sla_headers, sla_data, col_widths=[2.4, 1.5, 1.5, 1.3], align_cols=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER])

    # ==================== PHẦN III ====================
    add_h1("III. NHIỆM VỤ MỞ RỘNG THEO YÊU CẦU DOANH NGHIỆP: NGHIÊN CỨU & TRIỂN KHAI ODOO ERP DOANH NGHIỆP")
    add_p("Thực hiện chỉ đạo của Quản lý dự án (PM) về việc khảo sát công nghệ ERP tiêu chuẩn phục vụ nhu cầu chuyển đổi số doanh nghiệp, Nhóm 1 đã hoàn thành nghiên cứu chuyên sâu về nền tảng Odoo ERP:")

    add_h2("3.1. So sánh hai phiên bản Odoo Community và Odoo Enterprise")
    add_p("Nhóm đã phân tích đa chiều giữa hai phiên bản mã nguồn mở và thương mại của Odoo:")

    odoo_headers = ["Tiêu chí so sánh", "Odoo Community (Mã nguồn mở)", "Odoo Enterprise (Thương mại trả phí)", "Đánh giá lựa chọn cho dự án"]
    odoo_data = [
        ["Chi phí bản quyền", "Miễn phí 100% mã nguồn mở LGPLv3", "Tính phí theo người dùng/tháng ($12 – $24/user)", "Community phù hợp trường học & quán ăn nhỏ"],
        ["Khả năng tùy biến", "Toàn quyền truy cập và sửa mã nguồn Python", "Hạn chế, phụ thuộc vào Odoo Studio", "Community cho phép can thiệp sâu kiến trúc"],
        ["Phân hệ Bán hàng (POS)", "Đầy đủ nghiệp vụ bán hàng, order, in hóa đơn", "Tích hợp thêm tính năng chuỗi và khách hàng thân thiết", "Community đáp ứng 100% nhu cầu quán ăn"],
        ["Quản lý Kho & Mua hàng", "Đầy đủ nhập/xuất/tồn, kiểm kê, đơn mua NCC", "Bổ sung dự báo tồn kho tự động nâng cao", "Community hoàn toàn đáp ứng tốt"],
        ["Ứng dụng Di động (Mobile App)", "Truy cập giao diện web responsive", "Có sẵn ứng dụng Mobile Native iOS/Android", "Web Responsive chạy mượt trên mọi thiết bị"],
        ["Triển khai Hạ tầng", "Tự triển khai trên VPS Linux / Docker", "Chạy trên đám mây Odoo.sh hoặc On-Premise", "Community chạy tối ưu trên Docker nội bộ"]
    ]
    create_table(odoo_headers, odoo_data, col_widths=[1.5, 1.8, 1.8, 1.6], align_cols=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    add_h2("3.2. Mô hình chuyển đổi số quy trình quản lý quán ăn")
    add_p("Quy trình nghiệp vụ thực tế của quán ăn được ánh xạ chuẩn xác vào 5 phân hệ Odoo:")
    add_bullet("1. Tiếp nhận và Phục vụ (POS): ", "Khách hàng chọn bàn hoặc mang đi; nhân viên phục vụ ghi nhận món trên màn hình cảm ứng POS; tự động chuyển lệnh vào bếp.")
    add_bullet("2. Chế biến Bếp (Kitchen Order): ", "Màn hình bếp hiển thị danh sách món cần làm theo thời gian thực; xác nhận hoàn thành món để nhân viên bưng bê.")
    add_bullet("3. Thanh toán & Hóa đơn (POS & Invoicing): ", "Thu ngân áp dụng giảm giá, in hóa đơn tạm tính và quyết toán tiền mặt/chuyển khoản ngân hàng.")
    add_bullet("4. Quản lý Nguyên liệu & Mua hàng (Inventory & Purchase): ", "Hệ thống tự động trừ kho nguyên liệu theo định mức món ăn (BOM); cảnh báo khi nguyên liệu chạm ngưỡng tối thiểu để tạo đơn mua hàng gửi NCC.")
    add_bullet("5. Báo cáo Doanh thu & Nhân sự (Accounting & Employees): ", "Tổng hợp doanh thu theo ca/ngày/tháng; quản lý ca làm việc và phân quyền bảo mật cho nhân viên.")

    # ==================== PHẦN IV ====================
    add_h1("IV. PHÂN CÔNG VÀ ĐÁNH GIÁ THÀNH VIÊN TUẦN 4")
    add_p(
        "Quy chế đánh giá thành viên Tuần 4 được thực hiện theo nguyên tắc khách quan, công bằng và bám sát sản phẩm thực tế trên GitHub và Google Drive. Điểm tổng kết tuần của mỗi thành viên được tính bằng ",
        bold_prefix="Nguyên tắc chấm điểm: ",
        italic_note="trung bình cộng số học của 3 đợt đánh giá tiến độ trong tuần: Đợt 1 (Ngày 14 - 17/11/2026), Đợt 2 (Ngày 18 - 19/11/2026) và Đợt 3 (Ngày 20/11/2026)."
    )

    eval_headers = ["STT", "Thành viên (MSSV)", "Nhiệm vụ trọng tâm Tuần 4", "Đợt 1 (14-17/11)", "Đợt 2 (18-19/11)", "Đợt 3 (20/11)", "Điểm TB Tuần 4", "Xếp loại"]
    eval_data = [
        [
            "1",
            "Hồ Anh Vũ\n(060205013608)",
            "Trưởng nhóm: Thoại nhóm WebRTC Voice Huddle, nhạc chuông Web Audio API, Admin Face ID 3 góc, SheetJS Excel Viewer, bóc tách 3,200 dòng Monolith, tối ưu CSDL giảm 99.95%, điều phối toàn dự án.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "2",
            "Bích Đặng Bảo Hân\n(060305003000)",
            "QA / Frontend: Thực thi UAT 3 thiết bị (iPhone 17 Pro Max, iPad Pro 12.9\", Laptop Windows 11) trên Production; rà soát Auth/Dashboard/Forum; lập danh mục chi tiết 37 lỗi UX/UI kèm Action Plan.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "3",
            "Huỳnh Hồ Hiệu Hiệu\n(058305002228)",
            "Frontend: Kiểm thử toàn diện quy trình 4 bước Sinh đề AI; thẩm định Fisher-Yates (mã đề 101-104); xuất Word in ấn và Phiếu tô OMR 50 câu; báo cáo lỗi endpoint PUT /api/v1/questions/{id}.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "4",
            "Nguyễn Đức Cường\n(054205001431)",
            "Database & ERP: Xây dựng 7 views thống kê Admin CSDL [SCRUM-94]; nghiên cứu Odoo ERP Community vs Enterprise; khảo sát 5 phân hệ POS, Kho, Mua hàng, Kế toán, Nhân sự cho bài toán quán ăn.",
            "9.5",
            "9.5",
            "10.0",
            "9.7 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "5",
            "Ngô Phạm Công Đức\n(052205015692)",
            "Backend & Exam: Hoàn thiện tài liệu SRS IEEE 830 [SCRUM-105]; lập bảng ánh xạ quy trình nghiệp vụ quán ăn sang các phân hệ Odoo tương ứng; chuẩn bị dữ liệu mẫu thực đơn & bàn ăn.",
            "9.5",
            "9.5",
            "10.0",
            "9.7 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "6",
            "Nguyễn Văn Tân\n(060205012615)",
            "Backend Services: Hoàn thành SCRUM-99 nâng cấp 4 microservices (Auth, Document, AI, Exam) với TTL Cache; tối ưu chunker.py; bảo đảm cụm dịch vụ hoạt động ổn định với độ trễ 5.7ms.",
            "10.0",
            "9.5",
            "9.5",
            "9.7 / 10",
            "Xuất sắc\n(A+)"
        ]
    ]
    create_table(eval_headers, eval_data, col_widths=[0.4, 1.4, 2.3, 0.6, 0.6, 0.6, 0.8, 0.7], align_cols=[WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER])

    # ==================== PHẦN V ====================
    add_h1("V. KHÓ KHĂN, TỒN ĐỌNG VÀ HƯỚNG XỬ LÝ KỸ THUẬT")
    add_p("Trong quá trình triển khai Sprint 4, nhóm đã ghi nhận một số thách thức kỹ thuật lớn và đã phối hợp xử lý dứt điểm:")

    add_bullet(
        "1. Hiện tượng treo trình duyệt di động do CSDL phình to 66.4 MB: ",
        "Nguyên nhân do file qgroups.json lưu trực tiếp chuỗi base64 của file Excel 21MB khảo sát WiFi CS3. Nhóm đã bóc tách toàn bộ attachment sang thư mục đĩa cứng vật lý data/uploads/qgroup_attachments/, giúp CSDL giảm 99.95% dung lượng (còn 34.2 KB) và tốc độ nạp chat đạt 0.18 giây."
    )
    add_bullet(
        "2. Xung đột kết nối WebRTC Offer khi hai người cùng bấm gọi Huddle: ",
        "Khi cả hai giảng viên cùng bấm đàm thoại, cả hai bên đều gửi 'offer' khiến RTCPeerConnection rơi vào trạng thái 'have-local-offer'. Nhóm đã bổ sung cơ chế rollback tín hiệu tự động và quy tắc ưu tiên chuỗi email người dùng (Caller Priority Rule)."
    )
    add_bullet(
        "3. Lỗi Safari Auto-Zoom 130% trên iPhone 17 Pro Max: ",
        "Safari iOS tự động ép zoom 130% khi người dùng chạm vào ô input có cỡ chữ nhỏ hơn 16px, làm vỡ bố cục giao diện sau khi đóng bàn phím ảo. Nhóm đã áp dụng CSS Media Query ép cỡ chữ tối thiểu 16px trên di động mà vẫn giữ nguyên tỷ lệ trên desktop."
    )
    add_bullet(
        "4. Nhân bản phòng chat trực tiếp 1-1 khi tìm kiếm đồng nghiệp: ",
        "Hành động bấm nhắn tin từ danh sách tìm kiếm đồng nghiệp vô tình khởi tạo nhiều phòng chat mới với cùng một đối tác. Nhóm đã viết lại thuật toán Deduplication kiểm tra id và email đối tác, gộp chung về đúng 1 cuộc trò chuyện duy nhất."
    )
    add_bullet(
        "5. Lỗi HTTP 404 tại endpoint cập nhật câu hỏi PUT /api/v1/questions/{id}: ",
        "Phát hiện qua bài kiểm thử của Huỳnh Hồ Hiệu Hiệu khi giảng viên chỉnh sửa câu hỏi ở Bước 3. Nhóm đã lên kế hoạch vá ngay trong ngày đầu Tuần 5 để đảm bảo dữ liệu sửa đổi được lưu vĩnh viễn vào CSDL máy chủ."
    )

    # ==================== PHẦN VI ====================
    add_h1("VI. ĐÁNH GIÁ TIẾN ĐỘ VÀ KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 5 – TỔNG KẾT & BẢO VỆ)")
    add_p(
        "Đạt 96 / 100 điểm (96% khối lượng toàn bộ dự án). Toàn bộ các yêu cầu nghiệp vụ theo Đề cương Học kỳ Doanh nghiệp đã được hoàn thành trọn vẹn và kiểm chứng trên môi trường thực tế.",
        bold_prefix="Đánh giá tiến độ lũy kế: "
    )
    add_p("Kế hoạch chi tiết cho Tuần 5 (Giai đoạn hoàn tất nghiệm thu và bảo vệ đồ án HKDN vào ngày 28/11/2026):")
    add_bullet("1. Xử lý triệt để danh mục 37 lỗi UX/UI: ", "Tập trung vá dứt điểm 3 lỗi Critical và 17 lỗi High theo phản hồi kiểm thử UAT của Bích Đặng Bảo Hân.")
    add_bullet("2. Hoàn thiện endpoint cập nhật câu hỏi: ", "Vá lỗi PUT /api/v1/questions/{id} trên Exam Service đảm bảo tính toàn vẹn dữ liệu khi giảng viên biên tập câu hỏi.")
    add_bullet("3. Đóng gói mã nguồn & Docker: ", "Gắn tag phiên bản Release v1.0.0 trên GitHub, dọn dẹp các nhánh phụ và hợp nhất trọn vẹn vào nhánh main.")
    add_bullet("4. Hoàn thiện Hồ sơ Nghiệm thu Tổng kết HKDN: ", "Biên soạn Báo cáo Tổng kết Học kỳ Doanh nghiệp, slide thuyết trình bảo vệ và video demo hoàn chỉnh toàn bộ các tính năng của nền tảng QuizGen AI.")

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

    r_date = p_sig.add_run("TP. Hồ Chí Minh, ngày 21 tháng 11 năm 2026\n")
    r_date.font.name = "Times New Roman"
    r_date.font.size = Pt(10.5)
    r_date.font.italic = True
    r_date.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    r_role = p_sig.add_run("Trưởng nhóm thực hiện\n\n\n\n")
    r_role.font.name = "Times New Roman"
    r_role.font.size = Pt(11)
    r_role.font.bold = True
    r_role.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    r_name = p_sig.add_run("Hồ Anh Vũ")
    r_name.font.name = "Times New Roman"
    r_name.font.size = Pt(12)
    r_name.font.bold = True
    r_name.font.color.rgb = RGBColor(0x00, 0x86, 0x89)

    # Save document
    filename = "060205013608_HoAnhVu_BaoCaoTongHopTuan4_Nhom1.docx"
    doc.save(filename)
    print(f"Weekly Report saved successfully as: {filename}")

if __name__ == "__main__":
    build_document()
