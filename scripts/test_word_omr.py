import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color: str):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def test_generate_omr_docx():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)

    # 1. Header
    header_table = doc.add_table(rows=1, cols=2)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_left, c_right = header_table.rows[0].cells
    
    p_left = c_left.paragraphs[0]
    r1 = p_left.add_run("ĐẠI HỌC QUỐC GIA\n")
    r1.bold = True
    r1.font.size = Pt(9.5)
    r2 = p_left.add_run("KHOA CÔNG NGHỆ THÔNG TIN")
    r2.font.size = Pt(8.5)

    p_right = c_right.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r3 = p_right.add_run("HỘI ĐỒNG KHẢO THÍ & BẢO ĐẢM CHẤT LƯỢNG\n")
    r3.bold = True
    r3.font.size = Pt(9)
    r4 = p_right.add_run("MÃ ĐỀ THI: 101")
    r4.bold = True
    r4.font.size = Pt(9.5)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(1)
    r_t = p_title.add_run("PHIẾU TRẢ LỜI TRẮC NGHIỆM")
    r_t.bold = True
    r_t.font.size = Pt(13)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(4)
    r_s = p_sub.add_run("CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA")
    r_s.italic = True
    r_s.font.size = Pt(8)

    # Student info + SBD & Mã đề
    info_table = doc.add_table(rows=1, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_info, c_sbd = info_table.rows[0].cells
    c_info.width = Inches(4.3)
    c_sbd.width = Inches(2.7)

    # Info
    p_info = c_info.paragraphs[0]
    p_info.paragraph_format.space_after = Pt(2)
    r_ih = p_info.add_run("THÔNG TIN THÍ SINH (Ghi bằng bút mực):\n")
    r_ih.bold = True
    r_ih.font.size = Pt(8.5)

    fields = [
        "• Họ và tên: ..........................................................................",
        "• Ngày sinh: ....../....../........   Giới tính: Nam [  ]  Nữ [  ]",
        "• Lớp / Phòng thi: ...........................   Số bàn: .............",
        "• Môn thi: Mạng máy tính (Khoa CNTT)",
        "• Chữ ký GT 1: .....................  Chữ ký GT 2: ....................."
    ]
    for f in fields:
        p = c_info.add_paragraph()
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(f)
        r.font.size = Pt(8)

    # SBD & Mã đề
    p_sbd = c_sbd.paragraphs[0]
    p_sbd.paragraph_format.space_after = Pt(2)
    r_sh = p_sbd.add_run("SỐ BÁO DANH & MÃ ĐỀ:\n")
    r_sh.bold = True
    r_sh.font.size = Pt(8.5)

    p_sbd_box = c_sbd.add_paragraph()
    p_sbd_box.paragraph_format.space_after = Pt(1)
    r_sb = p_sbd_box.add_run("SBD: [  ] [  ] [  ] [  ] [  ] [  ]  |  MÃ ĐỀ: [ 1 ] [ 0 ] [ 1 ]\n")
    r_sb.font.size = Pt(8)
    r_sb.bold = True

    p_sbd_grid = c_sbd.add_paragraph()
    p_sbd_grid.paragraph_format.space_after = Pt(1)
    p_sbd_grid.add_run("Tô số: (0) (1) (2) (3) (4) (5) (6) (7) (8) (9)").font.size = Pt(7.5)

    # Hướng dẫn tô
    p_guide = doc.add_paragraph()
    p_guide.paragraph_format.space_before = Pt(3)
    p_guide.paragraph_format.space_after = Pt(3)
    r_gh = p_guide.add_run("HƯỚNG DẪN TÔ ĐÁP ÁN: ")
    r_gh.bold = True
    r_gh.font.size = Pt(7.5)
    r_gt = p_guide.add_run("Dùng bút chì 2B tô kín vòng tròn phương án chọn. [ ĐÚNG: ( ● ) ]   [ SAI: ( X )  ( / )  ( - ) ]")
    r_gt.font.size = Pt(7.5)

    # Lưới 50 câu trắc nghiệm: 26 rows (1 header + 25 data rows), 10 cols
    grid = doc.add_table(rows=26, cols=10)
    grid.alignment = WD_TABLE_ALIGNMENT.CENTER

    hdr = grid.rows[0].cells
    set_cell_background(hdr[0], "E2E8F0")
    hdr[0].text = "CÂU"
    for j in range(1, 5):
        set_cell_background(hdr[j], "E2E8F0")
        hdr[j].text = ["A", "B", "C", "D"][j-1]

    set_cell_background(hdr[5], "E2E8F0")
    hdr[5].text = "CÂU"
    for j in range(6, 10):
        set_cell_background(hdr[j], "E2E8F0")
        hdr[j].text = ["A", "B", "C", "D"][j-6]

    for j in range(10):
        hdr[j].paragraphs[0].runs[0].font.size = Pt(7.5)
        hdr[j].paragraphs[0].runs[0].bold = True
        hdr[j].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    labels = ["A", "B", "C", "D"]
    for i in range(25):
        row = grid.rows[i + 1].cells
        q_left = i + 1
        q_right = i + 26

        row[0].text = f"{q_left:02d}"
        row[0].paragraphs[0].runs[0].font.size = Pt(7.5)
        row[0].paragraphs[0].runs[0].bold = True
        row[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

        for opt in range(4):
            row[opt + 1].text = f"[ {labels[opt]} ]"
            row[opt + 1].paragraphs[0].runs[0].font.size = Pt(7)
            row[opt + 1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

        row[5].text = f"{q_right:02d}"
        row[5].paragraphs[0].runs[0].font.size = Pt(7.5)
        row[5].paragraphs[0].runs[0].bold = True
        row[5].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

        for opt in range(4):
            row[opt + 6].text = f"[ {labels[opt]} ]"
            row[opt + 6].paragraphs[0].runs[0].font.size = Pt(7)
            row[opt + 6].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Footer
    p_ft = doc.add_paragraph()
    p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ft.paragraph_format.space_before = Pt(3)
    r_ft = p_ft.add_run("Mã nhận dạng OMR: *OMR-50-VN-101* | Thí sinh giữ phiếu phẳng, không làm rách hoặc vấy bẩn.")
    r_ft.italic = True
    r_ft.font.size = Pt(7)

    doc.save("test_omr_output.docx")
    print("Docx OMR generated successfully!")

if __name__ == "__main__":
    test_generate_omr_docx()
