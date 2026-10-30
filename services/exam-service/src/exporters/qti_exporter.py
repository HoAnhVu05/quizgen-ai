import xml.etree.ElementTree as ET
from typing import List, Dict, Any

class QTIExporter:
    @staticmethod
    def export_canvas_moodle_xml(title: str, questions: List[Dict[str, Any]]) -> str:
        """
        Sinh chuẩn QTI 2.1 XML tương thích trực tiếp với Canvas LMS, Moodle, Blackboard
        """
        quiz = ET.Element("quiz")
        
        for idx, q in enumerate(questions, 1):
            question_node = ET.SubElement(quiz, "question", type="multichoice")
            
            # Name
            name = ET.SubElement(question_node, "name")
            text_name = ET.SubElement(name, "text")
            text_name.text = f"Câu hỏi {idx} - Bloom: {q.get('bloom_level', 'Nhận biết')}"

            # Question text
            qtext = ET.SubElement(question_node, "questiontext", format="html")
            text_val = ET.SubElement(qtext, "text")
            text_val.text = f"<p>{q.get('question', '')}</p>"

            # General feedback / explanation
            feedback = ET.SubElement(question_node, "generalfeedback", format="html")
            fb_text = ET.SubElement(feedback, "text")
            fb_text.text = f"<p>{q.get('explanation', '')}</p>"

            # Options
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
            for opt in q.get("options", []):
                fraction = "100" if opt.get("id") == correct_id else "0"
                answer_node = ET.SubElement(question_node, "answer", fraction=fraction, format="html")
                ans_text = ET.SubElement(answer_node, "text")
                ans_text.text = f"<p>{opt.get('text', '')}</p>"

        return ET.tostring(quiz, encoding="utf-8", xml_declaration=True).decode("utf-8")
