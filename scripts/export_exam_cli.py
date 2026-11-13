# -*- coding: utf-8 -*-
import os
import sys
import json
import tempfile

sys.stdout.reconfigure(encoding='utf-8')

# Ensure python can find services/exam-service/src
current_dir = os.path.dirname(os.path.abspath(__file__))
exam_service_src = os.path.join(os.path.dirname(current_dir), 'services', 'exam-service', 'src')
if exam_service_src not in sys.path:
    sys.path.insert(0, exam_service_src)

from exporters.word_exporter import WordExamExporter
from exporters.pdf_exporter import PDFExamExporter
from exporters.bundle_exporter import ExamBundleExporter
from exporters.qti_exporter import QTIExporter

def main():
    if len(sys.argv) < 3:
        print("Usage: python export_exam_cli.py <input_json_file> <output_file>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fmt = (data.get('format') or 'docx').lower()
    title = data.get('examTitle') or 'ĐỀ THI KẾT THÚC HỌC PHẦN'
    subject = data.get('subjectName') or 'Kinh tế vi mô'
    exam_code = str(data.get('baseExamCode') or data.get('examCode') or '101')
    university = data.get('university') or 'ĐẠI HỌC QUỐC GIA TP.HCM'
    faculty = data.get('faculty') or 'Khoa Kinh tế & Quản trị'
    duration = int(data.get('durationMinutes') or data.get('duration') or 60)
    include_ans = data.get('includeAnswerKey', True)
    include_exp = data.get('includeExplanation', False)
    include_omr = data.get('includeOmrSheet', True)
    exam_code_count = int(data.get('examCodeCount') or 4)

    raw_questions = data.get('questions') or []
    # Normalize questions format
    questions = []
    for q in raw_questions:
        norm_opts = []
        for opt in q.get('options', []):
            if isinstance(opt, dict):
                norm_opts.append({'id': opt.get('id', ''), 'text': opt.get('text', '')})
            else:
                norm_opts.append({'id': '', 'text': str(opt)})
        questions.append({
            'id': str(q.get('id', '')),
            'question': q.get('question', ''),
            'options': norm_opts,
            'correct_answer_id': q.get('correctAnswerId') or q.get('correct_answer_id') or 'A',
            'explanation': q.get('explanation', ''),
            'bloom_level': q.get('bloomLevel') or q.get('bloom_level') or 'Nhận biết',
            'chapter': q.get('chapter', '')
        })

    if not questions:
        # Default mock question if empty
        questions = [{
            'id': 'q1',
            'question': 'Khi chính phủ đánh thuế vào hàng hóa có cầu co giãn nhiều hơn cung, ai chịu thuế nhiều hơn?',
            'options': [
                {'id': 'A', 'text': 'Người tiêu dùng chịu nhiều hơn'},
                {'id': 'B', 'text': 'Người sản xuất chịu nhiều hơn'},
                {'id': 'C', 'text': 'Cả hai chịu bằng nhau'},
                {'id': 'D', 'text': 'Chính phủ chịu toàn bộ'}
            ],
            'correct_answer_id': 'B',
            'explanation': 'Bên nào co giãn ít hơn sẽ chịu phần thuế lớn hơn theo nguyên lý kinh tế học.',
            'bloom_level': 'Thông hiểu',
            'chapter': 'Chương 2: Cung cầu'
        }]

    if fmt in ('zip', 'bundle'):
        bundle_bytes = ExamBundleExporter.generate_exam_bundle_zip(
            exam_title=title,
            subject=subject,
            questions=questions,
            university=university,
            faculty=faculty,
            duration_minutes=duration,
            exam_code_count=exam_code_count,
            base_exam_code=exam_code,
            include_answer_key=include_ans,
            include_explanation=include_exp,
            include_omr_sheet=include_omr
        )
        with open(output_file, 'wb') as f:
            f.write(bundle_bytes)

    elif fmt == 'pdf':
        pdf_bytes = PDFExamExporter.generate_pdf(
            exam_title=title,
            subject=subject,
            exam_code=exam_code,
            questions=questions,
            university=university,
            faculty=faculty,
            duration_minutes=duration,
            include_answer_key=include_ans,
            include_explanation=include_exp,
            include_omr_sheet=include_omr
        )
        with open(output_file, 'wb') as f:
            f.write(pdf_bytes)

    elif fmt == 'qti':
        qti_bytes = QTIExporter.export_qti21_package_zip(
            title=title,
            questions=questions
        )
        with open(output_file, 'wb') as f:
            f.write(qti_bytes)

    else: # docx
        docx_bytes = WordExamExporter.generate_docx(
            exam_title=title,
            subject=subject,
            exam_code=exam_code,
            questions=questions,
            university=university,
            faculty=faculty,
            duration_minutes=duration,
            include_answer_key=include_ans,
            include_explanation=include_exp
        )
        with open(output_file, 'wb') as f:
            f.write(docx_bytes)

    print(f"SUCCESS: Exported {fmt.upper()} to {output_file} ({os.path.getsize(output_file)} bytes)")

if __name__ == '__main__':
    main()
