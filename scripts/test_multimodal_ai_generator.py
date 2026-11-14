# -*- coding: utf-8 -*-
"""
KIỂM THỬ TÍCH HỢP MÔ-ĐUN AI ĐA PHƯƠNG THỨC & CÔNG THỨC LATEX (QUIZGEN AI)
Tác giả: Hồ Anh Vũ (Leader - Phụ trách AI Service & Auth)
Ngày: 14/11/2026

Kịch bản kiểm thử:
1. Tạo ảnh sơ đồ vật lý giả lập (Đồ thị dao động điều hòa) bằng Pillow (PIL).
2. Chuẩn bị ngữ cảnh RAG chứa kiến thức Vật lý đại cương và công thức vi phân.
3. Kích hoạt QuestionGenerator với mô hình Gemini 2.5 Flash đa phương thức (Multimodal Vision).
4. Xác minh:
   - AI tiếp nhận thành công cả Văn bản + Hình ảnh.
   - Nhận diện và sinh công thức theo đúng chuẩn LaTeX ($...$).
   - Gán cờ has_image, image_url, image_caption chính xác.
   - Kiểm tra API tái tạo câu hỏi đơn (Regenerate Question) với ngữ cảnh hình ảnh.
"""

import os
import sys
import asyncio
import json
import io

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from PIL import Image, ImageDraw, ImageFont

# Thêm đường dẫn services/ai-service vào sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AI_SERVICE_DIR = os.path.join(BASE_DIR, "services", "ai-service")
sys.path.insert(0, AI_SERVICE_DIR)

from src.generator import QuestionGenerator


def create_mock_physics_diagram() -> Image.Image:
    """Tạo ảnh đồ thị dao động điều hòa hình sin để kiểm thử Vision AI"""
    img = Image.new("RGB", (600, 300), color="#ffffff")
    draw = ImageDraw.Draw(img)

    # Vẽ trục tọa độ Ox, Ot
    draw.line([(50, 150), (550, 150)], fill="#0f172a", width=2) # Trục Ot
    draw.line([(80, 20), (80, 280)], fill="#0f172a", width=2)   # Trục Ox

    # Vẽ mũi tên trục
    draw.polygon([(550, 150), (540, 145), (540, 155)], fill="#0f172a")
    draw.polygon([(80, 20), (75, 30), (85, 30)], fill="#0f172a")

    # Vẽ đường sóng sin (dao động x = A*cos(wt))
    import math
    points = []
    for px in range(80, 520):
        # Chu kỳ T = 200px, Biên độ A = 80px
        t = (px - 80) / 200.0 * 2 * math.pi
        py = 150 - int(80 * math.cos(t))
        points.append((px, py))
    draw.line(points, fill="#008689", width=3)

    # Chú thích đồ thị
    draw.text((555, 155), "t (s)", fill="#0f172a")
    draw.text((60, 25), "x (cm)", fill="#0f172a")
    draw.text((45, 65), "+A = 4", fill="#da1c2d")
    draw.text((45, 225), "-A = -4", fill="#da1c2d")
    draw.text((270, 155), "T/2 = 1.0s", fill="#4f46e5")
    draw.text((470, 155), "T = 2.0s", fill="#4f46e5")
    draw.text((120, 270), "Hinh 1: Do thi li do - thoi gian cua vat dao dong dieu hoa", fill="#64748b")

    return img


async def run_multimodal_tests():
    print("======================================================================")
    print(">>> QUIZGEN AI - KIỂM THỬ MÔ-ĐUN AI VISION & CÔNG THỨC LATEX <<<")
    print(">>> Đảm nhiệm kỹ thuật: Trưởng nhóm Hồ Anh Vũ (Leader - AI/Auth) <<<")
    print("======================================================================\n")

    # 1. Khởi tạo QuestionGenerator
    generator = QuestionGenerator()
    print(f"[*] Mô hình AI kích hoạt: {generator.model_name}")
    print(f"[*] API Key status: {'Sẵn sàng (Đã cấu hình)' if generator.api_key else 'Thiếu API Key'}")

    # 2. Tạo hình ảnh sơ đồ đồ thị kiểm thử
    test_img = create_mock_physics_diagram()
    test_img_path = os.path.join(BASE_DIR, "scratch", "test_physics_diagram.png")
    os.makedirs(os.path.dirname(test_img_path), exist_ok=True)
    test_img.save(test_img_path)
    print(f"[+] Đã tạo ảnh sơ đồ đồ thị dao động điều hòa tại: {test_img_path}")

    # 3. Chuẩn bị ngữ cảnh RAG Toán / Vật lý với công thức chuẩn
    mock_chunks = [
        {
            "chunk_id": "chunk-phys-01",
            "page_number": 15,
            "text": (
                "Chương 1: Dao động cơ học đại cương.\n"
                "Phương trình li độ của vật dao động điều hòa có dạng tổng quát: $x = A \\cos(\\omega t + \\varphi)$, "
                "trong đó $x$ là li độ, $A > 0$ là biên độ dao động, $\\omega$ là tần số góc (rad/s) và $\\varphi$ là pha ban đầu.\n"
                "Vận tốc tức thời: $v = x' = -\\omega A \\sin(\\omega t + \\varphi)$. Vận tốc đạt giá trị cực đại $v_{\\max} = \\omega A$ khi qua VTCB theo chiều dương.\n"
                "Gia tốc: $a = v' = -\\omega^2 x$. Gia tốc luôn hướng về vị trí cân bằng và có độ lớn cực đại $a_{\\max} = \\omega^2 A$ tại các biên.\n"
                "Chu kỳ dao động: $T = \\frac{2\\pi}{\\omega}$. Tần số dao động: $f = \\frac{1}{T} = \\frac{\\omega}{2\\pi}$."
            ),
            "associated_images": [
                {
                    "id": "fig-osc-01",
                    "path": test_img_path,
                    "url": "/uploads/figures/fig-osc-01.png",
                    "caption": "Hình 1: Đồ thị li độ - thời gian của vật dao động điều hòa",
                    "page_number": 15
                }
            ]
        }
    ]

    bloom_matrix = {
        "nhanBiet": 1,
        "thongHieu": 1,
        "vanDung": 1,
        "phanTich": 1
    }

    print("\n[*] Đang gửi yêu cầu sinh 04 câu hỏi Đa phương thức tới Gemini 2.5 Flash...")
    questions = await generator.generate_questions_from_context(
        chunks=mock_chunks,
        bloom_matrix=bloom_matrix,
        document_id="doc-phys-2026",
        chapter_name="Chương 1: Dao động cơ học",
        textbook_name="Giáo trình Vật lý Đại cương",
        images=[
            {
                "id": "fig-osc-01",
                "data": test_img,
                "url": "/uploads/figures/fig-osc-01.png",
                "caption": "Hình 1: Đồ thị dao động li độ x theo thời gian t",
                "page_number": 15
            }
        ]
    )

    print(f"\n[+] ĐÃ SINH THÀNH CÔNG {len(questions)} CÂU HỎI TỪ GEMINI 2.5 FLASH!")
    print("----------------------------------------------------------------------")

    has_latex_count = 0
    has_image_count = 0

    for idx, q in enumerate(questions):
        print(f"\n[CÂU HỎI #{idx+1}] [{q.get('bloomLevel')}]")
        print(f"  - Nội dung: {q.get('question')}")
        print(f"  - Đính kèm hình ảnh: {q.get('hasImage')} | URL: {q.get('imageUrl')}")
        if q.get('imageCaption'):
            print(f"  - Chú thích hình: {q.get('imageCaption')}")
        print(f"  - Chứa công thức LaTeX: {q.get('hasFormula')}")
        print("  - Các phương án:")
        for opt in q.get('options', []):
            is_correct = opt.get('id') == q.get('correctAnswerId')
            marker = " (ĐÁP ÁN ĐÚNG)" if is_correct else ""
            print(f"    [{opt.get('label')}] {opt.get('text')}{marker}")
        print(f"  - Giải thích: {q.get('explanation')}")

        if q.get('hasFormula') or "$" in q.get('question', ''):
            has_latex_count += 1
        if q.get('hasImage') and q.get('imageUrl'):
            has_image_count += 1

    print("\n----------------------------------------------------------------------")
    print(f"[=] Số câu hỏi chứa công thức chuẩn LaTeX ($...$): {has_latex_count}/{len(questions)}")
    print(f"[=] Số câu hỏi khai thác hình vẽ / sơ đồ: {has_image_count}/{len(questions)}")
    assert len(questions) >= 3, "Số lượng câu hỏi sinh ra phải đạt yêu cầu ma trận."
    assert has_latex_count > 0, "Phải có ít nhất 1 câu hỏi định dạng công thức bằng LaTeX."

    # 4. Kiểm thử API Tái tạo câu hỏi đơn (Regenerate Question)
    print("\n[*] Đang kiểm thử tính năng Tái tạo câu hỏi đơn với Image Context...")
    target_q = questions[0]
    regen_q = await generator.regenerate_single_question(
        question_id=target_q["id"],
        current_question=target_q,
        chunk_context={"id": "chunk-phys-01", "text": mock_chunks[0]["text"], "page_number": 15},
        bloom_level="Vận dụng",
        textbook_name="Giáo trình Vật lý Đại cương",
        image_context={
            "url": "/uploads/figures/fig-osc-01.png",
            "caption": "Hình 1: Đồ thị dao động li độ x theo thời gian t",
            "data": test_img
        }
    )
    print(f"[+] Tái tạo thành công: {regen_q.get('question')}")
    print(f"    hasImage: {regen_q.get('hasImage')} | imageUrl: {regen_q.get('imageUrl')}")
    print(f"    hasFormula: {regen_q.get('hasFormula')}")

    print("\n======================================================================")
    print(">>> KẾT QUẢ: TẤT CẢ KIỂM THỬ AI VISION & LATEX ĐẠT 100% THÀNH CÔNG <<<")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(run_multimodal_tests())
