import io
import json
import uuid
import zipfile
import html
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

class QTIExporter:
    """
    Sinh tài liệu XML và gói IMS QTI 2.1 Content Package (.zip)
    Tương thích trực tiếp với Canvas LMS, Moodle, Blackboard, D2L Brightspace.
    """

    @staticmethod
    def export_canvas_moodle_xml(title: str, questions: List[Dict[str, Any]]) -> str:
        """Xuất định dạng Moodle XML truyền thống (tương thích Moodle Question Bank)."""
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
            text_name.text = f"Câu hỏi {idx:02d} - Bloom: {bloom}"

            # Nội dung câu hỏi
            qtext_node = ET.SubElement(question_node, "questiontext", format="html")
            text_val = ET.SubElement(qtext_node, "text")
            q_content = q.get("question") or q.get("question_text") or ""
            text_val.text = f"<p>{html.escape(q_content)}</p>"

            # Điểm số mặc định
            defaultgrade = ET.SubElement(question_node, "defaultgrade")
            defaultgrade.text = "1.0000000"

            # Phản hồi chung (General Feedback / Explanation)
            feedback = ET.SubElement(question_node, "generalfeedback", format="html")
            fb_text = ET.SubElement(feedback, "text")
            explanation = q.get("explanation") or ""
            fb_text.text = f"<p>{html.escape(explanation)}</p>" if explanation else ""

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
                ans_text.text = f"<p>{html.escape(opt.get('text', ''))}</p>"

                ans_fb = ET.SubElement(answer_node, "feedback", format="html")
                ans_fb_text = ET.SubElement(ans_fb, "text")
                ans_fb_text.text = "<p>Chính xác!</p>" if is_correct else "<p>Chưa chính xác.</p>"

        return ET.tostring(quiz, encoding="utf-8", xml_declaration=True).decode("utf-8")

    @classmethod
    def export_qti21_package_zip(cls, title: str, questions: List[Dict[str, Any]]) -> bytes:
        """
        Đóng gói bộ chuẩn khảo thí IMS QTI 2.1 Content Package (.zip)
        Cấu trúc gói chuẩn gồm:
          - imsmanifest.xml: Bản khai tài nguyên chuẩn IMS CP v1.2
          - assessment.xml: Cấu trúc bài thi assessmentTest
          - items/item_XX.xml: Các câu hỏi trắc nghiệm assessmentItem QTI 2.1
          - moodle_canvas_quiz.xml: File Moodle XML phụ trợ tương thích nhanh LMS
        """
        pkg_id = uuid.uuid4().hex[:12]
        safe_title = html.escape(title or "De_Thi_QTI21")
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            item_files = []
            item_refs = []

            for idx, q in enumerate(questions, 1):
                item_id = f"item_{idx:03d}_{uuid.uuid4().hex[:6]}"
                file_rel_path = f"items/{item_id}.xml"
                item_files.append((item_id, file_rel_path))
                item_refs.append(f'<assessmentItemRef identifier="ref_{item_id}" href="{file_rel_path}"/>')

                # Options & Correct Answer
                options = q.get("options", [])
                if isinstance(options, str):
                    try:
                        options = json.loads(options)
                    except Exception:
                        options = []
                
                correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
                matched_opt = next((o for o in options if o.get("id") == correct_id), None)
                correct_ident = matched_opt.get("id", "opt-a") if matched_opt else (options[0].get("id", "opt-a") if options else "opt-a")
                q_text = html.escape(q.get("question") or q.get("question_text") or f"Câu hỏi {idx}")
                explanation = html.escape(q.get("explanation") or "")

                choices_xml = []
                for opt in options:
                    oid = opt.get("id", f"opt-{uuid.uuid4().hex[:4]}")
                    otext = html.escape(opt.get("text", ""))
                    olabel = opt.get("label", "")
                    label_prefix = f"<strong>{olabel}.</strong> " if olabel else ""
                    choices_xml.append(f'<simpleChoice identifier="{oid}">{label_prefix}{otext}</simpleChoice>')

                choices_str = "\n            ".join(choices_xml)

                item_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
                identifier="{item_id}"
                title="Câu {idx:02d}"
                adaptive="false"
                timeDependent="false">
    <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
        <correctResponse>
            <value>{correct_ident}</value>
        </correctResponse>
    </responseDeclaration>
    <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
        <defaultValue>
            <value>0</value>
        </defaultValue>
    </outcomeDeclaration>
    <itemBody>
        <div class="qtext"><p>{q_text}</p></div>
        <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
            {choices_str}
        </choiceInteraction>
    </itemBody>
    <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
    <modalFeedback outcomeIdentifier="FEEDBACK" identifier="general_feedback" showHide="show">
        <p>{explanation}</p>
    </modalFeedback>
</assessmentItem>"""
                zf.writestr(file_rel_path, item_xml.strip().encode("utf-8"))

            # 1. assessment.xml
            item_refs_str = "\n        ".join(item_refs)
            assessment_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
                identifier="TEST_{pkg_id}"
                title="{safe_title}">
    <testPart identifier="part_01" navigationMode="nonlinear" submissionMode="individual">
        <assessmentSection identifier="section_01" title="Phần trắc nghiệm khảo thí" visible="true">
        {item_refs_str}
        </assessmentSection>
    </testPart>
</assessmentTest>"""
            zf.writestr("assessment.xml", assessment_xml.strip().encode("utf-8"))

            # 2. imsmanifest.xml
            file_entries = "\n        ".join([f'<file href="{path}"/>' for _, path in item_files])
            item_resource_entries = "\n    ".join([
                f'<resource identifier="res_{iid}" type="imsqti_item_xmlv2p1" href="{path}"><file href="{path}"/></resource>'
                for iid, path in item_files
            ])

            manifest_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST_{pkg_id}"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
          xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v2p1"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
    <metadata>
        <schema>IMS Content</schema>
        <schemaversion>2.1</schemaversion>
        <imsmd:lom>
            <imsmd:general>
                <imsmd:title>
                    <imsmd:langstring xml:lang="vi">{safe_title}</imsmd:langstring>
                </imsmd:title>
                <imsmd:description>
                    <imsmd:langstring xml:lang="vi">Gói đề thi trắc nghiệm chuẩn IMS QTI 2.1 tạo bởi QuizGen AI</imsmd:langstring>
                </imsmd:description>
            </imsmd:general>
        </imsmd:lom>
    </metadata>
    <organizations/>
    <resources>
        <resource identifier="RES_ASSESSMENT" type="imsqti_test_xmlv2p1" href="assessment.xml">
            <file href="assessment.xml"/>
            {file_entries}
        </resource>
        {item_resource_entries}
        <resource identifier="RES_MOODLE_XML" type="webcontent" href="moodle_canvas_quiz.xml">
            <file href="moodle_canvas_quiz.xml"/>
        </resource>
    </resources>
</manifest>"""
            zf.writestr("imsmanifest.xml", manifest_xml.strip().encode("utf-8"))

            # 3. Kèm theo file Moodle/Canvas XML vào gói ZIP
            moodle_xml = cls.export_canvas_moodle_xml(title=title, questions=questions)
            zf.writestr("moodle_canvas_quiz.xml", moodle_xml.encode("utf-8"))

        zip_buffer.seek(0)
        return zip_buffer.getvalue()
