# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def build_document():
    doc = docx.Document()
    
    # Page setup: Standard A4, 2cm margins
    sections = doc.sections
    for s in sections:
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

    def add_hyperlink(paragraph, url, text, color="1155CC", underline=True, bold=False):
        part = paragraph.part
        r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
        hyperlink = parse_xml(f'<w:hyperlink {nsdecls("w")} r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>')
        new_run = parse_xml(f'<w:r {nsdecls("w")}/>')
        rPr = parse_xml(f'<w:rPr {nsdecls("w")}/>')
        if color:
            c = parse_xml(f'<w:color {nsdecls("w")} w:val="{color}"/>')
            rPr.append(c)
        if underline:
            u = parse_xml(f'<w:u {nsdecls("w")} w:val="single"/>')
            rPr.append(u)
        if bold:
            b = parse_xml(f'<w:b {nsdecls("w")}/>')
            rPr.append(b)
        font = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>')
        rPr.append(font)
        new_run.append(rPr)
        new_run_text = parse_xml(f'<w:t {nsdecls("w")}>{text}</w:t>')
        new_run.append(new_run_text)
        hyperlink.append(new_run)
        paragraph._p.append(hyperlink)

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
        run.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        style_p(p, space_before=10, space_after=4, align=WD_ALIGN_PARAGRAPH.LEFT)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        style_p(p, space_before=6, space_after=3, align=WD_ALIGN_PARAGRAPH.LEFT)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.italic = True
        run.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        return p

    def add_p(text="", bold_prefix="", italic_note=""):
        p = doc.add_paragraph()
        style_p(p, space_before=0, space_after=5, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Times New Roman"
            r_pre.font.size = Pt(11)
            r_pre.font.bold = True
            r_pre.font.color.rgb = RGBColor(0x22, 0x22, 0x22)
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
        r1.font.color.rgb = RGBColor(0x22, 0x22, 0x22)
        r2 = p.add_run(text)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(11)
        r2.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        return p

    def add_img(img_path, caption_text, width=Inches(5.8)):
        if not os.path.exists(img_path):
            print(f"Warning: image path not found: {img_path}")
            return None
        p_img = doc.add_paragraph()
        style_p(p_img, space_before=6, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=width)
        
        p_cap = doc.add_paragraph()
        style_p(p_cap, space_before=2, space_after=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        r_cap = p_cap.add_run(caption_text)
        r_cap.font.name = "Times New Roman"
        r_cap.font.size = Pt(10)
        r_cap.font.italic = True
        r_cap.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
        return p_img

    def add_img_pair(img1_path, cap1, img2_path, cap2, overall_cap):
        if not os.path.exists(img1_path) or not os.path.exists(img2_path):
            print(f"Warning: side-by-side missing: {img1_path}, {img2_path}")
            return None
        table = doc.add_table(rows=2, cols=2)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        
        for r in table.rows:
            r.cells[0].width = Inches(3.2)
            r.cells[1].width = Inches(3.2)
            
        p1 = table.rows[0].cells[0].paragraphs[0]
        style_p(p1, space_before=2, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
        p1.add_run().add_picture(img1_path, width=Inches(3.1))
        
        p2 = table.rows[0].cells[1].paragraphs[0]
        style_p(p2, space_before=2, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
        p2.add_run().add_picture(img2_path, width=Inches(3.1))
        
        c1 = table.rows[1].cells[0].paragraphs[0]
        style_p(c1, space_before=1, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
        rc1 = c1.add_run(cap1)
        rc1.font.name = "Times New Roman"
        rc1.font.size = Pt(9.5)
        rc1.font.italic = True
        
        c2 = table.rows[1].cells[1].paragraphs[0]
        style_p(c2, space_before=1, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
        rc2 = c2.add_run(cap2)
        rc2.font.name = "Times New Roman"
        rc2.font.size = Pt(9.5)
        rc2.font.italic = True
        
        p_ovr = doc.add_paragraph()
        style_p(p_ovr, space_before=2, space_after=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        rc_ovr = p_ovr.add_run(overall_cap)
        rc_ovr.font.name = "Times New Roman"
        rc_ovr.font.size = Pt(10)
        rc_ovr.font.bold = True
        rc_ovr.font.italic = True
        rc_ovr.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

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
            set_cell_background(cell, "1B365D")
            set_cell_margins(cell, top=140, bottom=140, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            p = cell.paragraphs[0]
            style_p(p, space_before=0, space_after=0, line_spacing=1.0, align=WD_ALIGN_PARAGRAPH.CENTER)
            run = p.add_run(h_text)
            run.font.name = "Times New Roman"
            run.font.size = Pt(10.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            
        for r_idx, row_data in enumerate(data):
            row = table.rows[r_idx + 1]
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            
            bg_color = "F9FAFB" if (r_idx % 2 == 1) else "FFFFFF"
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
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
                if c_idx == 0 and len(row_data) > 3 and str(val).isdigit():
                    pass
                    
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
    r_inst.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    p_subinst = doc.add_paragraph()
    style_p(p_subinst, space_before=0, space_after=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_sub = p_subinst.add_run("HỌC PHẦN: HỌC KỲ DOANH NGHIỆP – HỌC KỲ 1, NĂM HỌC 2026 – 2027")
    r_sub.font.name = "Times New Roman"
    r_sub.font.size = Pt(10.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    p_title = doc.add_paragraph()
    style_p(p_title, space_before=6, space_after=4, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_title = p_title.add_run("BÁO CÁO TỔNG HỢP CÔNG VIỆC TUẦN 2")
    r_title.font.name = "Times New Roman"
    r_title.font.size = Pt(17)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    p_subt = doc.add_paragraph()
    style_p(p_subt, space_before=0, space_after=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_subt = p_subt.add_run("Dự án nhóm: Hệ thống Tạo Đề thi Tự động QuizGen AI & Khảo sát Wi-Fi UTH Cơ sở 2\n(Giai đoạn: Sprint 2 – Từ 31/10/2026 đến 06/11/2026)")
    r_subt.font.name = "Times New Roman"
    r_subt.font.size = Pt(12)
    r_subt.font.bold = True
    r_subt.font.color.rgb = RGBColor(0xC0, 0x39, 0x2B)

    # Table 1: Thông tin chung
    info_headers = ["Thông tin", "Nội dung chi tiết"]
    info_data = [
        ["Đơn vị đào tạo", "Trường Đại học Giao thông vận tải TP.HCM (UTH) – Viện CNTT&CĐS"],
        ["Tên dự án nhóm", "QuizGen AI – Nền tảng Tạo Đề thi Tự động Đa phương thức ứng dụng Kiến trúc Microservices & AI RAG"],
        ["Nhóm thực hiện", "Nhóm 1 (Học kỳ Doanh nghiệp HK1/2026 – 2027)"],
        ["Trưởng nhóm (Leader)", "Hồ Anh Vũ (MSSV: 060205013608) – Kỹ sư Trưởng kiêm Điều phối Kỹ thuật"],
        ["Thành viên nhóm", "Ngô Phạm Công Đức, Nguyễn Đức Cường, Huỳnh Hồ Hiệu Hiệu, Bích Đặng Bảo Hân, Nguyễn Văn Tân"],
        ["Thời gian thực hiện", "Tuần 2 (Từ Thứ Bảy 31/10/2026 đến Thứ Sáu 06/11/2026) – Ngày lập: 06/11/2026"]
    ]
    create_table(info_headers, info_data, col_widths=[2.0, 4.7], align_cols=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    # ==================== PHẦN I ====================
    add_h1("I. TÓM TẮT TÌNH HÌNH THỰC HIỆN TUẦN 2")
    add_p(
        "Trong khuôn khổ Tuần 2 (31/10/2026 – 06/11/2026), Nhóm 1 đã hoàn thành xuất sắc và toàn diện 100% khối lượng công việc được giao thuộc Sprint 2 của dự án ",
        bold_prefix="Tổng quan tiến độ Sprint 2: ",
        italic_note="QuizGen AI, đồng thời hoàn thành nhiệm vụ thực địa đo đạc khảo sát chất lượng sóng Wi-Fi tại Cơ sở 2 của Trường Đại học Giao thông vận tải TP.HCM (UTH)."
    )
    add_p(
        "Đạt khoảng 70% tổng khối lượng công việc (toàn bộ kiến trúc nền tảng và các phân hệ nòng cốt gồm Auth, CSDL Multi-Schema, Document ChromaDB, AI Gemini sinh câu hỏi và Exam xuất đề Word/PDF đều đã hoàn thành và kiểm thử nội bộ thành công trên môi trường phát triển).",
        bold_prefix="Tiến độ tích lũy toàn dự án: "
    )
    add_p(
        "Còn khoảng 2,5 – 3 tuần làm việc (chia làm 3 giai đoạn kỹ thuật rõ ràng: Tích hợp luồng E2E & Triển khai Cloud; Kiểm thử hệ thống & Tối ưu AI; Đóng gói giải pháp & Hoàn tất Báo cáo Tổng kết HKDN vào ngày 28/11/2026).",
        bold_prefix="Thời gian dự kiến hoàn thành: "
    )
    add_p(
        "Trong tuần này, toàn đội ngũ kỹ thuật đã hoàn thành việc tích hợp toàn diện cụm 8 Docker Containers chạy vi dịch vụ (Microservices), hoàn thiện 13 RESTful API cho phân hệ Exam Service, hiện thực hóa thuật toán Fisher-Yates xáo trộn mã đề hoán vị, đóng gói định dạng PDF chuẩn khảo thí kèm Phiếu trắc nghiệm quang học OMR 50 câu, chuẩn hóa lược đồ 5 Schemas CSDL PostgreSQL kết hợp bảng question_audit_logs ghi nhận JSON diff, tối ưu hóa bộ nhớ đệm LRU Cache cho phân hệ Document Vector ChromaDB và hoàn thiện giao diện Cyber Dark hỗ trợ đối soát trực quan trích dẫn giáo trình.",
        bold_prefix="Trọng tâm công nghệ: "
    )
    add_p(
        "Toàn bộ 6/6 thành viên duy trì kỷ luật lao động nghiêm túc, tuân thủ chặt chẽ quy trình Git Branching, báo cáo tiến độ đúng thời hạn lên Google Drive và hệ thống quản lý công việc Jira. Dự án đạt tiến độ dự kiến 100% của Sprint 2, sẵn sàng bước sang Sprint 3 với các tính năng chuyên sâu.",
        bold_prefix="Đánh giá chung: "
    )

    # ==================== PHẦN II ====================
    add_h1("II. CÔNG VIỆC DỰ ÁN NHÓM ĐÃ THỰC HIỆN (QUIZGEN AI)")
    
    add_h2("2.1. Diễn biến công việc theo ngày trong tuần (31/10 – 06/11/2026)")
    add_p("Tiến trình triển khai Sprint 2 được phân bổ khoa học và thực hiện xuyên suốt 7 ngày trong tuần như sau:")

    add_bullet(
        "Thứ Bảy (31/10/2026) – Họp Sprint Planning Sprint 2: ",
        "Trưởng nhóm chủ trì cuộc họp trực tuyến mở màn Tuần 2; rà soát backlog, phân tích yêu cầu kỹ thuật và phân bổ 11 User Stories (từ SCRUM-24 đến SCRUM-34) cho 5 thành viên. Thống nhất Data Contract giữa các microservices (Auth, Document, Exam, AI Service), quy chuẩn API RESTful và thiết lập workflow branching trên GitHub (feature branch -> develop -> main)."
    )
    add_bullet(
        "Chủ Nhật (01/11/2026) – Chuẩn bị Môi trường & Thiết kế Kiến trúc: ",
        "Nghiên cứu tài liệu kỹ thuật, chuẩn bị Docker Compose stack 8 containers cục bộ (Kong API Gateway, PostgreSQL, Redis, Auth Service, Document Service, Exam Service, AI Service, Frontend React). Thiết lập cấu hình multi-schema trên PostgreSQL và khởi tạo kịch bản kiểm thử tự động CI/CD GitHub Actions."
    )
    add_bullet(
        "Thứ Hai (02/11/2026) – Triển khai Tầng Lõi Core Microservices: ",
        "Các thành viên đồng loạt bắt tay vào code các phân hệ: Hiệu triển khai Core Auth với JWT Access/Refresh Token; Tân phát triển pipeline bóc tách văn bản 5 pha tích hợp ChromaDB; Đức xây dựng CRUD Question & Exam Service; Cường cấu hình connection pool PostgreSQL và Redis Cache; Hân xây dựng giao diện người dùng Cyber Dark; Trưởng nhóm Vũ thiết lập API Gateway routes và kết nối Google Gemini 2.5 Flash."
    )
    add_bullet(
        "Thứ Ba (03/11/2026) – Hoàn thành Đợt 1 Tích hợp Microservices: ",
        "Cụm 8 Docker Containers chạy ổn định và đạt 100% Healthy trên môi trường phát triển. Trưởng nhóm tiến hành nghiệm thu kỹ thuật, đối soát mã nguồn trên GitHub và biên soạn Báo cáo Tiến độ Đợt 1 (Ngày 02 - 03/11/2026) nộp lên Google Drive và Jira."
    )
    add_bullet(
        "Thứ Tư (04/11/2026) – Phát triển Tính năng Chuyên sâu & Nâng cao: ",
        "Đức hoàn thiện thuật toán xáo trộn Fisher-Yates sinh 4 mã đề hoán vị và xuất đề Word .docx, PDF OMR 50 câu; Cường lập trình bảng question_audit_logs lưu vết JSON diff và cấu hình Rate Limiting 5 req/min qua Redis; Tân tối ưu hóa hàng đợi bóc tách tài liệu và triển khai In-memory LRU Cache cho ChromaDB; Hân phát triển Modal Đối soát trích dẫn RAG hiển thị số trang sách thực tế; Hiệu hoàn thiện cơ chế phân quyền Multi-role Role-Based Access Control."
    )
    add_bullet(
        "Thứ Năm (05/11/2026) – Kiểm thử Liên thông Toàn diện (End-to-End Testing): ",
        "Nhóm tiến hành kiểm thử liên thông (E2E) toàn hệ thống: test tải API Gateway (HTTP 429 Too Many Requests), kiểm thử tính toàn vẹn dữ liệu ngoại khóa giữa 5 schemas, đo đạc độ trễ truy xuất vector RAG (< 180ms) và đối soát giao diện người dùng. Trưởng nhóm nghiệm thu kỹ thuật và lập Báo cáo Tiến độ Đợt 2 (Ngày 04 - 05/11/2026)."
    )
    add_bullet(
        "Thứ Sáu (06/11/2026) – Thực địa Khảo sát Wi-Fi CS2 & Tổng hợp Tuần 2: ",
        "Toàn bộ 6 thành viên có mặt tại Trường Đại học Giao thông vận tải TP.HCM Cơ sở 2 (TP. Thủ Đức) thực hiện đo đạc chất lượng mạng Wi-Fi tại 54 phòng học/khu vực Dãy P và Dãy N. Chiều cùng ngày, nhóm tổng hợp số liệu vào Google Sheets, phân tích 20 điểm mất sóng, lập Báo cáo Khảo sát Kỹ thuật Wi-Fi và Trưởng nhóm hoàn tất Báo cáo Tổng hợp Tuần 2."
    )

    add_h2("2.2. Chi tiết các phân hệ kỹ thuật cốt lõi đã hoàn thành")

    # 2.2.1 Lead Infrastructure
    add_h3("2.2.1. Hạ tầng Microservices & API Gateway (Hồ Anh Vũ - Kỹ sư Trưởng)")
    add_p(
        "Trưởng nhóm đã thiết kế và triển khai thành công kiến trúc Microservices phân tán với Kong API Gateway làm cửa ngõ duy nhất (Reverse Proxy), kết nối đồng bộ 8 Docker Containers bao gồm: Kong Gateway, Auth Service, Document Service, Exam Service, AI Service, Redis Cache, PostgreSQL và Frontend React. Toàn bộ các dịch vụ đều được tích hợp cơ chế Docker Healthcheck tự động, cấu hình biến môi trường an toàn và logging tập trung.",
        bold_prefix="Kiến trúc điều phối: "
    )
    add_img("weekly_report_images/d3_image1.png", "Hình 1: Cụm 8 Docker Containers của QuizGen AI hoạt động đồng bộ và đạt 100% Healthy trên môi trường phát triển (Nguồn: Trưởng nhóm Hồ Anh Vũ - [SCRUM-28])")

    # 2.2.2 Exam Service
    add_h3("2.2.2. Phân hệ Quản lý Đề thi & Khảo thí - Exam Service (Ngô Phạm Công Đức)")
    add_p(
        "Thành viên Ngô Phạm Công Đức đã hoàn thiện toàn diện 13 RESTful API Endpoints cho Exam & Question Bank Service, hỗ trợ đầy đủ các thao tác CRUD câu hỏi, quản lý ngân hàng câu hỏi theo chuyên mục và phân loại cấp độ nhận thức Bloom. Đặc biệt, hệ thống đã tích hợp thuật toán xáo trộn ngẫu nhiên Fisher-Yates xáo trộn cả câu hỏi và thứ tự các đáp án nhằm tạo ra 4 mã đề thi hoán vị độc lập (Mã 101, 102, 103, 104) từ một ma trận đề gốc.",
        bold_prefix="Tính năng nòng cốt: "
    )
    add_img("weekly_report_images/d3_image2.png", "Hình 2: Tài liệu Swagger OpenAPI 13 RESTful API Endpoints của Exam & Question Bank Service (Nguồn: Ngô Phạm Công Đức - [SCRUM-29, 36])")
    
    add_p(
        "Ngoài ra, Đức đã hoàn thành module xuất bản đề thi đa định dạng: file Word (.docx) chuẩn mẫu biên soạn của Bộ GD&ĐT, chuẩn Canvas LMS IMS QTI 2.1 phục vụ nhập trực tiếp vào hệ thống Elearning trường, và đặc biệt là file PDF chuẩn khảo thí tích hợp Phiếu trả lời trắc nghiệm quang học OMR 50 câu tự động sinh ma trận đáp án, phục vụ chấm điểm tự động qua camera.",
        bold_prefix="Đóng gói khảo thí: "
    )
    add_img("weekly_report_images/d5_image1.png", "Hình 3: Đóng gói đề thi định dạng PDF chuẩn khảo thí tích hợp Phiếu trả lời trắc nghiệm quang học OMR 50 câu (Nguồn: Ngô Phạm Công Đức - [SCRUM-56])")

    # 2.2.3 Database & Audit Logs
    add_h3("2.2.3. Phân hệ Cơ sở dữ liệu Multi-Schema & Audit Logs (Nguyễn Đức Cường)")
    add_p(
        "Thành viên Nguyễn Đức Cường đã thiết kế và hiện thực hóa kiến trúc cơ sở dữ liệu Multi-Schema trên PostgreSQL gồm 5 schemas độc lập: auth, document, question_bank, exam và audit. Để giải quyết triệt để vấn đề gian lận hoặc chỉnh sửa đề thi trái phép, Cường đã lập trình bảng question_audit_logs lưu trữ lịch sử thay đổi câu hỏi dưới dạng JSON diff (ghi nhận rõ user_id, action, old_data, new_data, timestamp). Đồng thời, xây dựng API thống kê phân bổ độ khó theo thang đo tư duy Bloom (Remember, Understand, Apply, Analyze).",
        bold_prefix="Thiết kế CSDL & Giám sát: "
    )
    add_img_pair(
        "weekly_report_images/d5_image2.png", "Bảng question_audit_logs (JSON diff)",
        "weekly_report_images/d5_image3.png", "API thống kê ma trận Bloom",
        "Hình 4: Cấu trúc bảng question_audit_logs ghi vết lịch sử (trái) và API thống kê phân bổ cấp độ Bloom (phải) (Nguồn: Nguyễn Đức Cường - [SCRUM-58])"
    )

    # 2.2.4 Document & RAG Service
    add_h3("2.2.4. Phân hệ Xử lý Tài liệu & Vector RAG ChromaDB (Nguyễn Văn Tân)")
    add_p(
        "Thành viên Nguyễn Văn Tân đã làm chủ pipeline bóc tách tài liệu bất đồng bộ 5 pha (PDF, DOCX, TXT) hỗ trợ trích xuất văn bản, bảng biểu, công thức toán học và siêu dữ liệu số trang. Phân hệ đã tích hợp kỹ thuật Chunking thông minh với độ dài 500 tokens và Overlap 50 tokens, embedding qua mô hình text-embedding-004 và nạp vào ChromaDB theo lô (Batch Upserting 64 chunks/batch). Đặc biệt, Tân đã áp dụng bộ nhớ đệm In-memory LRU Cache giúp thời gian phản hồi truy vấn vector tương đồng (Similarity Search) đạt trung bình < 180ms, vượt xa chỉ tiêu SLA cam kết (< 300ms).",
        bold_prefix="Hiệu năng bóc tách & RAG: "
    )

    # 2.2.5 Auth Service
    add_h3("2.2.5. Phân hệ Xác thực & Phân quyền Đa vai trò - Auth Service (Huỳnh Hồ Hiệu Hiệu)")
    add_p(
        "Thành viên Huỳnh Hồ Hiệu Hiệu đã hoàn thành dịch vụ định danh Auth Service với mô hình JWT kép (Access Token hiệu lực 15 phút, Refresh Token hiệu lực 7 ngày). Hệ thống phân quyền chặt chẽ theo 3 vai trò học thuật: Admin (Quản trị viên hệ thống), Teacher (Giảng viên ra đề, chỉnh sửa ngân hàng câu hỏi) và Student (Sinh viên làm bài, tra cứu kết quả). Cơ chế kiểm tra token được tích hợp trực tiếp tại Gateway, bảo vệ toàn bộ 100% các API nội bộ.",
        bold_prefix="Bảo mật & Phân quyền: "
    )
    add_img("weekly_report_images/d5_image5.png", "Hình 5: Kết quả kiểm thử liên thông cơ chế xác thực đa vai trò và tự động làm mới JWT Token (Nguồn: Huỳnh Hồ Hiệu Hiệu - [SCRUM-54])")

    # 2.2.6 Frontend UI & AI Knowledge
    add_h3("2.2.6. Phân hệ Giao diện Người dùng Cyber Dark & Tri thức AI (Bích Đặng Bảo Hân)")
    add_p(
        "Thành viên Bích Đặng Bảo Hân đã hoàn thiện giao diện Dashboard Trung tâm Khảo thí theo chuẩn phong cách Cyber Dark hiện đại, tích hợp bộ font tiếng Việt Inter / Roboto mượt mà. Đáng chú ý nhất, Hân đã xây dựng thành công Modal Đối soát trích dẫn RAG trực quan: khi giảng viên nhấn vào câu hỏi do AI sinh ra, hệ thống tự động hiển thị số trang sách thực tế trích xuất từ giáo trình cùng đoạn ngữ cảnh gốc, cho phép giảng viên biên tập nội dung ngay trên màn hình trước khi phê duyệt.",
        bold_prefix="Trải nghiệm người dùng: "
    )
    add_img("weekly_report_images/d5_image4.png", "Hình 6: Giao diện Modal Đối soát trích dẫn RAG đối chiếu số trang thực tế giáo trình và biên tập nội dung câu hỏi (Nguồn: Bích Đặng Bảo Hân - [SCRUM-55])")
    
    if os.path.exists("member_docs/extracted_images/han_day2_img2.png"):
        add_img("member_docs/extracted_images/han_day2_img2.png", "Hình 7: Giao diện Trung tâm Khảo thí Cyber Dark hiển thị số liệu ma trận Bloom và cấu hình xuất đề (Nguồn: Bích Đặng Bảo Hân - [SCRUM-49])")

    add_h2("2.3. Tổng hợp sản phẩm và kết quả kỹ thuật đã ghi nhận")
    add_p("Toàn bộ các mốc sản phẩm bàn giao kỹ thuật của Sprint 2 được tổng hợp chi tiết trong Bảng 2:")

    prod_headers = ["STT", "Sản phẩm / Phân hệ kỹ thuật", "Quy mô / Thông số ghi nhận", "Mức độ hoàn thành", "Thành viên phụ trách"]
    prod_data = [
        ["1", "Kiến trúc Microservices & Docker", "8 Containers độc lập, Docker Compose, Healthcheck 100%", "100%", "Hồ Anh Vũ"],
        ["2", "Lõi AI Service & Pipeline Gemini", "Model gemini-2.5-flash, auto-fallback, API sinh câu hỏi", "100%", "Hồ Anh Vũ"],
        ["3", "Document Service & RAG Vector", "ChromaDB, bóc tách 5 pha, LRU Cache, SLA < 180ms", "100%", "Nguyễn Văn Tân"],
        ["4", "Exam Service & Xuất bản Đa dạng", "13 API, 4 mã đề Fisher-Yates, Word .docx, PDF OMR, QTI 2.1", "100%", "Ngô Phạm Công Đức"],
        ["5", "CSDL Multi-Schema & Audit Logs", "5 Schemas, bảng question_audit_logs (JSON diff), API Bloom", "100%", "Nguyễn Đức Cường"],
        ["6", "Auth Service & Phân quyền RBAC", "JWT kép, xoay vòng Refresh Token, phân quyền 3 roles", "100%", "Huỳnh Hồ Hiệu Hiệu"],
        ["7", "Frontend Cyber Dark & RAG Modal", "Dashboard ma trận Bloom, Modal đối soát trang sách RAG", "100%", "Bích Đặng Bảo Hân"]
    ]
    create_table(prod_headers, prod_data, col_widths=[0.5, 2.3, 2.2, 0.9, 1.3], align_cols=[WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT])

    add_p("Nhật ký đồng bộ commit của toàn bộ các thành viên trên GitHub Repository thể hiện tính liên tục và sự phối hợp nhịp nhàng giữa các phân hệ kỹ thuật:")
    add_img("weekly_report_images/d5_image6.png", "Hình 8: Nhật ký Git Commits đồng bộ trên GitHub Repository thể hiện tiến độ tích hợp của các thành viên")

    # ==================== PHẦN III ====================
    # USER EDIT MUST BE PRESERVED EXACTLY AS IS!
    add_h1("III. CÔNG VIỆC TẠI TRƯỜNG")
    add_p("Trong tuần 2, toàn bộ 6 thành viên Nhóm 1 đã cùng tham gia thực hiện nhiệm vụ khảo sát, đo đạc và rà soát chất lượng mạng Wi-Fi tại khuôn viên Trường Đại học Giao thông vận tải TP.HCM (UTH) Cơ sở 2 vào ngày 06/11/2026. Nhóm đã tiến hành đo đạc thực tế tại 54 phòng học và khu vực chức năng thuộc Dãy P và Dãy N, ghi nhận các chỉ số lưu lượng, độ trễ và lập danh sách các điểm mất sóng phục vụ kiến nghị kỹ thuật cho nhà trường.")
    
    p_link1 = doc.add_paragraph()
    style_p(p_link1, space_before=2, space_after=4, align=WD_ALIGN_PARAGRAPH.LEFT)
    add_hyperlink(p_link1, "https://docs.google.com/document/d/1x-1IrIC0YSR2GTzZ0jVhw2q5rkwej6Rb/edit?usp=drive_link&ouid=117647637555181348110&rtpof=true&sd=true", "Báo cáo chi tiết", color="1155CC", underline=True, bold=True)
    
    p_link2 = doc.add_paragraph()
    style_p(p_link2, space_before=2, space_after=8, align=WD_ALIGN_PARAGRAPH.LEFT)
    add_hyperlink(p_link2, "https://docs.google.com/spreadsheets/d/1SWxOuwWx4KNT6WYOEO6X5z_dBHZ6nR27/edit?usp=drive_link&ouid=117647637555181348110&rtpof=true&sd=true", "Minh chứng đo đạc", color="1155CC", underline=True, bold=True)

    # ==================== PHẦN IV ====================
    add_h1("IV. PHÂN CÔNG VÀ ĐÁNH GIÁ THÀNH VIÊN")
    add_p(
        "Quy chế đánh giá thành viên Tuần 2 được thực hiện theo nguyên tắc khách quan, công bằng và bám sát sản phẩm thực tế. Điểm tổng kết tuần của mỗi thành viên được tính bằng ",
        bold_prefix="Nguyên tắc chấm điểm: ",
        italic_note="trung bình cộng số học của 3 đợt đánh giá tiến độ trong tuần: Đợt 1 (Ngày 02 - 03/11/2026), Đợt 2 (Ngày 04 - 05/11/2026) và Nhiệm vụ thực địa khảo sát Wi-Fi tại UTH Cơ sở 2 (Ngày 06/11/2026)."
    )

    eval_headers = ["STT", "Thành viên (MSSV)", "Nhiệm vụ trọng tâm Tuần 2", "Đợt 1 (02-03/11)", "Đợt 2 (04-05/11)", "Wi-Fi CS2 (06/11)", "Điểm TB Tuần 2", "Xếp loại"]
    eval_data = [
        [
            "1",
            "Ngô Phạm Công Đức\n(052205015692)",
            "Hoàn thiện lõi Exam Service (13 API), xáo trộn 4 mã đề Fisher-Yates, xuất Word, PDF OMR 50 câu và QTI 2.1 (SCRUM-29, 33, 36, 45, 50, 56). Đo 18 điểm Wi-Fi Dãy P.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "2",
            "Nguyễn Đức Cường\n(054205001431)",
            "Thiết kế CSDL Multi-Schema 5 schemas, bảng question_audit_logs lưu diff JSON, cấu hình Redis Cache & Rate Limiting 5 req/phút (SCRUM-27, 32, 37, 46, 52, 58). Tham gia đo Wi-Fi CS2.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "3",
            "Huỳnh Hồ Hiệu Hiệu\n(054205000788)",
            "Xây dựng Auth Service với JWT kép, cơ chế xoay vòng Refresh Token an toàn, phân quyền Multi-role 3 vai trò và tích hợp Gateway (SCRUM-25, 30, 38, 48, 54). Tham gia đo Wi-Fi CS2.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "4",
            "Bích Đặng Bảo Hân\n(060305003000)",
            "Hoàn thiện UI Cyber Dark, Dashboard ma trận Bloom, Modal đối soát trích dẫn RAG với số trang sách thực tế và biên tập câu hỏi trực tiếp (SCRUM-26, 34, 40, 44, 49, 55). Tham gia đo Wi-Fi CS2.",
            "10.0",
            "10.0",
            "10.0",
            "10.0 / 10",
            "Xuất sắc\n(A+)"
        ],
        [
            "5",
            "Nguyễn Văn Tân\n(060205012615)",
            "Hoàn thiện Document Service, RAG ChromaDB bóc tách 5 pha, LRU Cache SLA truy xuất < 180ms (SCRUM-24, 31, 39, 43, 51, 57). Đo đạc thực tế toàn bộ 20 phòng Dãy N từ Trệt đến Tầng 6.",
            "10.0",
            "9.8 (*)",
            "10.0",
            "9.9 / 10",
            "Xuất sắc\n(A)"
        ]
    ]
    create_table(eval_headers, eval_data, col_widths=[0.4, 1.4, 2.3, 0.7, 0.7, 0.7, 0.9, 0.8], align_cols=[WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER])

    add_p(
        "(*) Ghi chú chi tiết về đánh giá điểm thành viên: ",
        bold_prefix="Giải trình đánh giá: ",
        italic_note="Công thức tính Điểm TB Tuần 2 = (Điểm Đợt 1 + Điểm Đợt 2 + Điểm Khảo sát CS2) / 3. Trường hợp thành viên Nguyễn Văn Tân: Trong Đợt 2 (ngày 04 - 05/11/2026), phần code kỹ thuật của Tân đạt chất lượng xuất sắc nhưng bị trừ 0.2 điểm ở tiêu chí Kỷ luật báo cáo do thiếu hình ảnh minh chứng kết quả truy vấn ChromaDB trong file báo cáo cá nhân nộp lên Drive (đạt 9.8/10). Trong ngày 06/11/2026, thành viên Tân đã làm việc hết sức tích cực, trực tiếp leo thang bộ đo đạc toàn bộ 20 điểm thuộc Dãy N từ Tầng Trệt đến Tầng 6, bù đắp đầy đủ số liệu cho nhóm. Điểm trung bình tuần của Tân đạt: (10.0 + 9.8 + 10.0) / 3 = 9.93/10 (làm tròn thành 9.9/10), xếp loại Xuất sắc (A)."
    )

    # ==================== PHẦN V ====================
    add_h1("V. KHÓ KHĂN, TỒN ĐỌNG VÀ HƯỚNG XỬ LÝ")
    add_p("Trong quá trình triển khai Sprint 2, nhóm đã ghi nhận một số thách thức kỹ thuật và đã chủ động đưa ra các giải pháp giải quyết dứt điểm:")

    risk_headers = ["STT", "Vấn đề / Thách thức kỹ thuật", "Tình trạng ảnh hưởng", "Giải pháp đã xử lý", "Trạng thái"]
    risk_data = [
        [
            "1",
            "Giới hạn tốc độ (Rate Limit) Google AI API",
            "Khi sinh hàng loạt câu hỏi trắc nghiệm, API Gemini đôi khi phản hồi HTTP 429 Too Many Requests.",
            "Tích hợp cơ chế Exponential Backoff tự động retry sau 2s, 4s; bổ sung Fallback model dự phòng.",
            "Đã khắc phục 100%"
        ],
        [
            "2",
            "Độ trễ bóc tách tài liệu PDF lớn (>50 trang)",
            "Quá trình bóc tách text và nạp ChromaDB bị nghẽn (blocking) nếu tài liệu có nhiều trang.",
            "Chuyển sang cơ chế xử lý bất đồng bộ (Async Worker Queue) kết hợp In-memory LRU Cache cho truy vấn.",
            "Đã tối ưu (SLA < 180ms)"
        ],
        [
            "3",
            "Xung đột dữ liệu quan hệ Multi-Schema",
            "Khóa ngoại liên kết giữa schema exam và question_bank bị lỗi quyền khi kết nối nhiều service.",
            "Phân tách rõ User Database theo service, cấp quyền riêng biệt qua PostgreSQL GRANT, đồng bộ schema qua migrations.",
            "Đã giải quyết hoàn toàn"
        ],
        [
            "4",
            "Điểm lõm sóng Wi-Fi tại UTH Cơ sở 2",
            "Khảo sát thực tế phát hiện 20 điểm mất sóng hoàn toàn tại Tầng 6 Dãy N và Tầng 1 Dãy P (chiếm 37.0%).",
            "Đã tổng hợp toàn bộ 54 điểm đo thành bảng tính Excel và soạn thảo văn bản kiến nghị kỹ thuật gửi nhà trường.",
            "Đã hoàn thành báo cáo"
        ]
    ]
    create_table(risk_headers, risk_data, col_widths=[0.4, 1.8, 2.0, 2.3, 0.8], align_cols=[WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER])

    # ==================== PHẦN VI ====================
    add_h1("VI. ĐÁNH GIÁ TIẾN ĐỘ VÀ KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 3)")
    add_h2("6.1. Tiến độ lũy kế và Dự báo thời gian hoàn thành dự án (Project Progress & ETC)")
    add_p(
        "Đạt khoảng 70% tổng khối lượng công việc của dự án. Nhóm đã làm chủ toàn bộ các công nghệ cốt lõi (Backend Microservices, CSDL Multi-schema, Pipeline AI Gemini và bóc tách tài liệu), sẵn sàng bước vào pha tích hợp luồng người dùng và đưa sản phẩm lên môi trường Internet.",
        bold_prefix="Tỷ lệ hoàn thành lũy kế: "
    )
    add_p(
        "Còn khoảng 2,5 – 3 tuần làm việc. Dự kiến hoàn tất toàn bộ sản phẩm và nghiệm thu Báo cáo HKDN vào ngày 28/11/2026 (Tuần 5).",
        bold_prefix="Thời gian dự kiến hoàn thành (ETC): "
    )
    add_p("Lộ trình phân bổ tiến độ qua các Sprint và mốc bàn giao kỹ thuật của dự án QuizGen AI được tổng hợp trong Bảng 6:")

    roadmap_headers = ["Giai đoạn / Mốc", "Thời gian", "Mục tiêu kỹ thuật & Sản phẩm bàn giao", "Tỷ trọng", "Lũy kế", "Trạng thái"]
    roadmap_data = [
        ["Giai đoạn 1 (Sprint 1-2)", "24/10 – 06/11", "Hoàn thành toàn bộ kiến trúc lõi Microservices, CSDL, AI Gemini sinh đề và bóc tách tài liệu trên Localhost.", "70%", "70%", "Đã hoàn thành (Hiện tại)"],
        ["Giai đoạn 2 (Sprint 3)", "09/11 – 14/11", "Tích hợp hoàn chỉnh luồng Web (E2E) & Triển khai toàn bộ hệ thống lên Internet (Cloud/VPS, HTTPS).", "15%", "85%", "Kế hoạch tuần tới"],
        ["Giai đoạn 3 (Sprint 4)", "16/11 – 21/11", "Kiểm thử hệ thống với giáo trình thực tế, tối ưu Prompt AI theo thang Bloom và chuẩn hóa bản in Word/PDF.", "10%", "95%", "Sắp diễn ra"],
        ["Giai đoạn 4 (Sprint 5)", "23/11 – 28/11", "Đóng gói sản phẩm, biên soạn Sổ tay hướng dẫn người dùng và hoàn tất Báo cáo Tổng kết HKDN.", "5%", "100%", "Nghiệm thu cuối kỳ"]
    ]
    create_table(roadmap_headers, roadmap_data, col_widths=[1.5, 1.0, 2.6, 0.6, 0.6, 1.0], align_cols=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER])

    add_p("Chi tiết mức độ hoàn thành theo từng phân hệ tính đến thời điểm hiện tại:")
    add_bullet("Hạ tầng kỹ thuật & Backend Microservices: ", "Đạt 85% (Cụm 8 Docker containers, kết nối API Gateway, CSDL PostgreSQL 5 schemas và Redis Cache).")
    add_bullet("Phân hệ Định danh & Quản lý Tài khoản (Auth Service): ", "Đạt 85% (Đăng ký, đăng nhập JWT, phân quyền tài khoản Giáo viên / Sinh viên).")
    add_bullet("Phân hệ Quản lý Đề & Xuất bản (Exam Service): ", "Đạt 80% (CRUD câu hỏi, thuật toán xáo trộn 4 mã đề Fisher-Yates, xuất file Word và PDF OMR 50 câu).")
    add_bullet("Phân hệ Tải & Bóc tách Tài liệu (Document Service): ", "Đạt 75% (Upload giáo trình PDF/Word, bóc tách văn bản 5 pha, tìm kiếm ngữ nghĩa ChromaDB).")
    add_bullet("Phân hệ AI Sinh Câu hỏi (AI Service): ", "Đạt 75% (Tích hợp Google Gemini 2.5 Flash, sinh câu hỏi trắc nghiệm tự động theo ma trận kiến thức).")
    add_bullet("Giao diện Người dùng trên Web (Frontend): ", "Đạt 65% (Đã có Dashboard, trang đăng nhập và modal đối soát trích dẫn; đang tiếp tục ráp nối hoàn chỉnh luồng).")
    add_bullet("Triển khai Đưa lên Mạng Internet (Deployment): ", "Đạt 20% (Đã cấu hình Dockerfile và Docker Compose; sẵn sàng deploy lên Cloud trong Tuần 3).")

    add_h2("6.2. Kế hoạch trọng tâm Tuần 3 (Từ 09/11/2026 đến 14/11/2026)")
    add_bullet(
        "Tích hợp luồng trải nghiệm người dùng đầu cuối (End-to-End User Flow): ",
        "Kết nối hoàn chỉnh giữa giao diện React và hệ thống Backend qua Kong Gateway: Đăng ký/Đăng nhập JWT -> Quản lý môn học -> Upload giáo trình (PDF/Word) -> Cấu hình ma trận trắc nghiệm -> AI Gemini sinh đề thi -> Xem trước & biên tập câu hỏi -> Xuất file Word/PDF (Hân, Đức, Tân)."
    )
    add_bullet(
        "Triển khai hạ tầng Production (Cloud/VPS Deployment): ",
        "Đóng gói Docker đa tầng (Multi-stage build) để tối ưu dung lượng image; cấu hình Reverse Proxy, tên miền (Domain) và kích hoạt chứng chỉ bảo mật SSL/TLS (HTTPS) công khai (Vũ & Hiệu)."
    )
    add_bullet(
        "Tối ưu trải nghiệm phản hồi (Asynchronous UX): ",
        "Tích hợp cơ chế thông báo trạng thái tiến trình (Loading/Progress bar) thời gian thực khi AI đang sinh câu hỏi, giúp người dùng theo dõi trực quan và không bị cảm giác chờ đợi (Hân & Cường)."
    )
    add_bullet(
        "Kiểm thử nội bộ luồng sử dụng thực tế: ",
        "Toàn bộ 6 thành viên đóng vai trò người dùng thử nghiệm để kiểm tra thông suốt luồng thao tác trên môi trường mạng trước khi chuyển sang giai đoạn kiểm thử chuyên sâu (Toàn đội ngũ)."
    )

    # ==================== PHẦN VII ====================
    add_h1("VII. ĐỀ XUẤT VÀ KIẾN NGHỊ")
    add_bullet(
        "Đối với Doanh nghiệp tiếp nhận HKDN: ",
        "Tạo điều kiện để nhóm tiếp cận thêm một số tập dữ liệu câu hỏi thi thực tế của doanh nghiệp nhằm gia tăng độ phong phú cho ngân hàng câu hỏi mẫu của QuizGen AI."
    )
    add_bullet(
        "Đối với Nhà trường và Viện CNTT&CĐS UTH: ",
        "Kính đề nghị Bộ phận Mạng và Thiết bị UTH quan tâm xem xét Báo cáo khảo sát Wi-Fi tại Cơ sở 2 để sớm có phương án bổ sung Access Point tại các khu vực điểm chết (Tầng 6 Dãy N và Tầng 1 Dãy P), phục vụ tốt hơn cho sinh viên và giảng viên."
    )

    # ==================== PHẦN VIII ====================
    add_h1("VIII. DANH MỤC MINH CHỨNG VÀ LIÊN KẾT THAM CHIẾU")
    add_p("Toàn bộ mã nguồn, tài liệu thiết kế, báo cáo cá nhân và dữ liệu khảo sát thực tế được lưu trữ trực tuyến tại các liên kết sau:")

    links = [
        ("Thư mục Google Drive Tuần 2 (Chứa báo cáo đầy đủ của các thành viên): ", "https://drive.google.com/drive/folders/1bB5soOGh81XzYFIr1DnsjSr-x5ssyhMh", "Mở Thư mục Google Drive Tuần 2"),
        ("Báo cáo khảo sát Wi-Fi UTH Cơ sở 2 trên Google Docs: ", "https://docs.google.com/document/d/1x-1IrIC0YSR2GTzZ0jVhw2q5rkwej6Rb/edit?usp=drive_link&ouid=117647637555181348110&rtpof=true&sd=true", "Mở Báo cáo Khảo sát Wi-Fi UTH CS2"),
        ("Bảng tính tổng hợp số liệu đo đạc Wi-Fi trên Google Sheets: ", "https://docs.google.com/spreadsheets/d/1SWxOuwWx4KNT6WYOEO6X5z_dBHZ6nR27/edit?usp=drive_link&ouid=117647637555181348110&rtpof=true&sd=true", "Mở Bảng tính Excel Khảo sát Wi-Fi UTH"),
        ("GitHub Repository QuizGen AI (Toàn bộ mã nguồn Microservices): ", "https://github.com/quizgen-ai/quizgen-platform", "Truy cập GitHub Repository QuizGen AI"),
        ("Bảng quản lý công việc Jira Sprint 2: ", "https://uth-hkdn.atlassian.net/jira/software/projects/SCRUM/boards/1", "Mở Jira Board Sprint 2 QuizGen AI")
    ]
    for prefix, url, anchor in links:
        p_lnk = doc.add_paragraph(style='List Bullet')
        style_p(p_lnk, space_before=1, space_after=4, align=WD_ALIGN_PARAGRAPH.LEFT)
        r_pr = p_lnk.add_run(prefix)
        r_pr.font.name = "Times New Roman"
        r_pr.font.size = Pt(10.5)
        r_pr.font.bold = True
        add_hyperlink(p_lnk, url, anchor, color="1155CC", underline=True, bold=True)

    # ==================== PHẦN IX ====================
    add_h1("IX. KẾT LUẬN")
    add_p("Tuần 2 đã khép lại với kết quả hết sức thắng lợi của Nhóm 1. Toàn thể 6 thành viên đã thể hiện tinh thần trách nhiệm cao, năng lực làm chủ công nghệ mới và kỹ năng làm việc nhóm hiệu quả. Nhóm cam kết sẽ tiếp tục giữ vững phong độ, nỗ lực phấn đấu hoàn thành xuất sắc hơn nữa các mục tiêu trong Tuần 3, góp phần đưa sản phẩm QuizGen AI sớm đi vào ứng dụng thực tiễn.")

    # Signatures
    p_sign_date = doc.add_paragraph()
    style_p(p_sign_date, space_before=14, space_after=2, align=WD_ALIGN_PARAGRAPH.RIGHT)
    r_sd = p_sign_date.add_run("TP. Hồ Chí Minh, ngày 06 tháng 11 năm 2026")
    r_sd.font.name = "Times New Roman"
    r_sd.font.size = Pt(11)
    r_sd.font.italic = True

    sig_table = doc.add_table(rows=1, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.rows[0].cells[0].width = Inches(3.6)
    sig_table.rows[0].cells[1].width = Inches(3.6)
    
    c_left = sig_table.rows[0].cells[0].paragraphs[0]
    style_p(c_left, space_before=2, space_after=40, align=WD_ALIGN_PARAGRAPH.CENTER)
    rc_l = c_left.add_run("XÁC NHẬN CỦA DOANH NGHIỆP\n(Ký và ghi rõ họ tên)")
    rc_l.font.name = "Times New Roman"
    rc_l.font.size = Pt(11)
    rc_l.font.bold = True

    c_right = sig_table.rows[0].cells[1].paragraphs[0]
    style_p(c_right, space_before=2, space_after=40, align=WD_ALIGN_PARAGRAPH.CENTER)
    rc_r = c_right.add_run("TRƯỞNG NHÓM 1\n(Ký và ghi rõ họ tên)\n\n\n\n\nHồ Anh Vũ")
    rc_r.font.name = "Times New Roman"
    rc_r.font.size = Pt(11)
    rc_r.font.bold = True

    out_path = "060205013608_HoAnhVu_BaoCaoTongHopTuan2_Nhom1.docx"
    doc.save(out_path)
    print(f"Document successfully created: {out_path} (Size: {os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    build_document()
