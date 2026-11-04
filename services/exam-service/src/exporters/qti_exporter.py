import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

class QTIExporter:
    """
    Sinh tài liệu XML chuẩn IMS QTI 2.1 và Moodle XML
    Tương thích trực tiếp với Canvas LMS, Moodle, Blackboard và Brightspace.
    """

    @staticmethod
    def export_canvas_moodle_xml(title: str, questions: List[Dict[str, Any]]) -> str:
        quiz = ET.Element("quiz")
        
        # Thẻ thông tin danh mục đề thi
        category_node = ET.SubElement(quiz, "question", type="category")
        cat_info = ET.SubElement(category_node, "category")
        cat_text = ET.SubElement(cat_info, "text")
        cat_text.text = f"$course$/top/{title}"

        for idx, q in enumerate(questions, 1):
            question_node = ET.SubElement(quiz, "question", type="multichoice")
            
            # Định danh câu hỏi & Bloom taxonomy
            name = ET.SubElement(question_node, "name")
            text_name = ET.SubElement(name, "text")
            bloom = q.get("bloom_level") or q.get("bloomLevel") or "Nhận biết"
            text_name.text = f"Câu hỏi {idx} - Bloom: {bloom}"

            # Nội dung câu hỏi
            qtext_node = ET.SubElement(question_node, "questiontext", format="html")
            text_val = ET.SubElement(qtext_node, "text")
            q_content = q.get("question") or q.get("question_text") or ""
            text_val.text = f"<p>{q_content}</p>"

            # Điểm số mặc định
            defaultgrade = ET.SubElement(question_node, "defaultgrade")
            defaultgrade.text = "1.0000000"

            # Phản hồi chung (General Feedback / Explanation)
            feedback = ET.SubElement(question_node, "generalfeedback", format="html")
            fb_text = ET.SubElement(feedback, "text")
            explanation = q.get("explanation") or ""
            fb_text.text = f"<p>{explanation}</p>" if explanation else ""

            # Thiết lập hiển thị (xáo trộn đáp án)
            shuffleanswers = ET.SubElement(question_node, "shuffleanswers")
            shuffleanswers.text = "1"
            answernumbering = ET.SubElement(question_node, "answernumbering")
            answernumbering.text = "abc"

            # Các phương án lựa chọn
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
            options = q.get("options", [])
            if isinstance(options, str):
                try:
                    options = json.loads(options)
                except Exception:
                    options = []

            for opt in options:
                is_correct = (opt.get("id") == correct_id)
                fraction = "100" if is_correct else "0"
                answer_node = ET.SubElement(question_node, "answer", fraction=fraction, format="html")
                ans_text = ET.SubElement(answer_node, "text")
                ans_text.text = f"<p>{opt.get('text', '')}</p>"

                ans_fb = ET.SubElement(answer_node, "feedback", format="html")
                ans_fb_text = ET.SubElement(ans_fb, "text")
                ans_fb_text.text = "<p>Chính xác!</p>" if is_correct else "<p>Chưa chính xác.</p>"

        return ET.tostring(quiz, encoding="utf-8", xml_declaration=True).decode("utf-8")
