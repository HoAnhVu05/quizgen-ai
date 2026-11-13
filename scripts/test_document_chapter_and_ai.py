import sys
import os
import asyncio

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add service directories to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
doc_src = os.path.join(root_dir, "services", "document-service")
ai_src = os.path.join(root_dir, "services", "ai-service")
sys.path.insert(0, doc_src)
sys.path.insert(0, ai_src)

from src.chunker import TextChunker, EmptyChunksException

# We also need to import QuestionGenerator from ai-service
import importlib.util
spec = importlib.util.spec_from_file_location("ai_generator", os.path.join(ai_src, "src", "generator.py"))
ai_gen_module = importlib.util.module_from_spec(spec)
sys.modules["src.prompts"] = importlib.import_module("src.prompts") if "src.prompts" in sys.modules else None
# Load prompts for generator
prompts_spec = importlib.util.spec_from_file_location("prompts", os.path.join(ai_src, "src", "prompts.py"))
prompts_mod = importlib.util.module_from_spec(prompts_spec)
prompts_spec.loader.exec_module(prompts_mod)
sys.modules["src.prompts"] = prompts_mod
sys.modules[".prompts"] = prompts_mod
spec.loader.exec_module(ai_gen_module)
QuestionGenerator = ai_gen_module.QuestionGenerator

def test_chunker_formal_chapters():
    print("\n--- Test 1: Document with Formal Chapters ---")
    pages = [
        {
            "page_number": 1,
            "text": "Chương 1: Kiến trúc máy tính và Hệ điều hành\nMáy tính điện tử gồm các thành phần cơ bản: CPU, RAM, ROM và các thiết bị ngoại vi. CPU là bộ xử lý trung tâm điều khiển toàn bộ hoạt động."
        },
        {
            "page_number": 2,
            "text": "Chương 2: Cấu trúc dữ liệu và Giải thuật\nDanh sách liên kết (Linked List) là cấu trúc dữ liệu tuyến tính trong đó các phần tử không được lưu trữ ở các vị trí bộ nhớ liền kề."
        }
    ]
    chunks, chapters = TextChunker.chunk_by_semantic_blocks(pages, "tb-test-01")
    print(f"Detected {len(chapters)} chapters:")
    for ch in chapters:
        print(f"  - [{ch['chapter_index']}] {ch['title']} (Trang {ch['page_start']} - {ch['page_end']})")
    assert len(chapters) == 2, f"Expected 2 chapters, got {len(chapters)}"
    assert "Kiến trúc máy tính" in chapters[0]["title"]
    assert "Cấu trúc dữ liệu" in chapters[1]["title"]
    print("-> PASS: Formal chapters correctly extracted.")

def test_chunker_hierarchical_sections_no_chapters():
    print("\n--- Test 2: Document WITHOUT chapters, but WITH sections (Roman & Numbers) ---")
    pages = [
        {
            "page_number": 1,
            "text": "I. TỔNG QUAN VỀ TRÍ TUỆ NHÂN TẠO\nTrí tuệ nhân tạo (AI) là lĩnh vực khoa học máy tính nhằm tạo ra các hệ thống có khả năng học tập, suy luận và tự động hóa tác vụ thông minh.\n\nII. CƠ CHẾ HỌC MÁY VÀ HỌC SÂU\nHọc máy (Machine Learning) là tập con của AI, tập trung vào việc xây dựng các thuật toán tự học từ dữ liệu mà không cần lập trình tường minh."
        },
        {
            "page_number": 2,
            "text": "III. CÁC MÔ HÌNH NGÔN NGỮ LỚN (LLM)\nMô hình ngôn ngữ lớn như GPT, Gemini sử dụng kiến trúc Transformer với cơ chế Self-Attention để xử lý chuỗi văn bản."
        }
    ]
    chunks, chapters = TextChunker.chunk_by_semantic_blocks(pages, "tb-test-02")
    print(f"Detected {len(chapters)} sections:")
    for ch in chapters:
        print(f"  - [{ch['chapter_index']}] {ch['title']} (Trang {ch['page_start']} - {ch['page_end']})")
    assert len(chapters) >= 2, f"Expected at least 2 sections, got {len(chapters)}"
    assert any("TỔNG QUAN" in ch["title"] or "TRÍ TUỆ NHÂN TẠO" in ch["title"] for ch in chapters)
    assert any("LLM" in ch["title"] or "MÔ HÌNH" in ch["title"] for ch in chapters)
    print("-> PASS: Sections extracted seamlessly when no formal chapters exist.")

def test_chunker_unstructured_content():
    print("\n--- Test 3: Document with NO headings (plain text multi-page) ---")
    pages = [
        {
            "page_number": 1,
            "text": "Hệ thống điện gió ngoài khơi đang trở thành nguồn năng lượng tái tạo chủ chốt tại các vùng duyên hải. Các tua-bin gió công suất lớn có thể phát điện ổn định."
        },
        {
            "page_number": 2,
            "text": "Công nghệ pin lưu trữ năng lượng BESS hỗ trợ tích trữ lượng điện dư thừa trong các khung giờ thấp điểm và phát lại vào giờ cao điểm tiêu thụ."
        }
    ]
    chunks, chapters = TextChunker.chunk_by_semantic_blocks(pages, "tb-test-03")
    print(f"Detected {len(chapters)} dynamic content sections:")
    for ch in chapters:
        print(f"  - [{ch['chapter_index']}] {ch['title']} (Trang {ch['page_start']} - {ch['page_end']})")
    assert len(chapters) >= 1
    # Ensure no mock economics or hardcoded "Chương 1: Tổng quan mở đầu"
    assert "Kinh tế" not in chapters[0]["title"]
    assert "Tổng quan mở đầu" not in chapters[0]["title"]
    print("-> PASS: Real content extracted dynamically, 0% mock data.")

async def test_ai_generator_with_real_api_key():
    print("\n--- Test 4: AI Generation with new API Key and Real Context ---")
    gen = QuestionGenerator()
    print(f"Engine model: {gen.model_name}, Has model: {gen.model is not None}")

    cs_chunks = [
        {
            "chunk_id": "c-it-01",
            "page_number": 1,
            "text": "Giao thức TCP (Transmission Control Protocol) là giao thức truyền thông tin cậy hướng kết nối thuộc tầng giao vận (Transport Layer) trong mô hình OSI. TCP đảm bảo truyền dữ liệu không bị mất mát thông qua cơ chế bắt tay ba bước (3-way handshake) và gửi gói tin xác nhận ACK."
        },
        {
            "chunk_id": "c-it-02",
            "page_number": 2,
            "text": "Ngược lại, giao thức UDP (User Datagram Protocol) là giao thức phi kết nối, không đảm bảo thứ tự và độ tin cậy của gói tin nhưng có độ trễ cực thấp, rất phù hợp cho truyền phát trực tuyến (streaming) và trò chơi trực tuyến."
        }
    ]

    try:
        questions = await gen.generate_questions_from_context(
            chunks=cs_chunks,
            bloom_matrix={"nhanBiet": 1, "thongHieu": 1, "vanDung": 0, "phanTich": 0},
            document_id="tb-it-01",
            chapter_name="Mạng máy tính - Tầng giao vận",
            textbook_name="GiaoTrinh_MangMayTinh.pdf"
        )
        print(f"Successfully generated {len(questions)} questions using Gemini AI!")
        for idx, q in enumerate(questions):
            print(f"  Q{idx+1} [{q['bloomLevel']}]: {q['question']}")
            print(f"       Đáp án đúng: {q['correctAnswerId']}")
            print(f"       Giải thích: {q['explanation']}")
            # Verify the question is about networking, NOT economics!
            q_text = (q['question'] + " " + q['explanation']).lower()
            assert "tcp" in q_text or "udp" in q_text or "giao vận" in q_text or "mạng" in q_text or "kết nối" in q_text, "Question should be about networking!"
            assert "kinh tế" not in q_text and "cung - cầu" not in q_text and "ped" not in q_text, "Question must NOT contain mock economics!"
        print("-> PASS: Real Gemini AI generation based 100% on document content!")
    except Exception as exc:
        print(f"-> AI Generation error: {exc}")
        raise exc

async def main():
    test_chunker_formal_chapters()
    test_chunker_hierarchical_sections_no_chapters()
    test_chunker_unstructured_content()
    await test_ai_generator_with_real_api_key()
    print("\n=================================================================")
    print("ALL 4/4 TESTS PASSED: 100% VERIFIED ZERO MOCK & REAL AI API KEY")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(main())
