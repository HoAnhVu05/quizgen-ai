import random
import copy
from typing import List, Dict, Any, Optional

OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"]

class ExamShuffler:
    """
    Thuật toán Fisher-Yates Shuffler:
    Tự động hoán vị thứ tự câu hỏi và thứ tự các phương án lựa chọn (A, B, C, D)
    đồng thời tái ánh xạ ma trận đáp án chuẩn (Answer Key Matrix) tuyệt đối chính xác.
    """

    @staticmethod
    def generate_variants(
        questions: List[Dict[str, Any]],
        exam_code_count: int = 4,
        base_exam_code: int = 101,
        shuffle_questions: bool = True,
        shuffle_options: bool = True,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        if not questions:
            raise ValueError("Danh sách câu hỏi không được rỗng.")

        variants = []
        rng = random.Random(seed) if seed is not None else random.Random()

        for i in range(exam_code_count):
            try:
                variant_code = str(int(base_exam_code) + i)
            except Exception:
                variant_code = f"{base_exam_code}_{i+1}"
            is_master_variant = (i == 0)

            # 1. Hoán vị câu hỏi
            variant_questions = copy.deepcopy(questions)
            if shuffle_questions and not is_master_variant:
                rng.shuffle(variant_questions)

            # 2. Hoán vị phương án chọn & ánh xạ đáp án đúng
            answer_key = []
            for q_idx, q in enumerate(variant_questions, 1):
                raw_options = q.get("options", [])
                correct_id = q.get("correctAnswerId") or q.get("correct_answer_id")

                shuffled_options = copy.deepcopy(raw_options)
                if shuffle_options and not is_master_variant:
                    rng.shuffle(shuffled_options)

                # Gán lại nhãn A, B, C, D theo vị trí mới
                correct_label = "A"
                for opt_idx, opt in enumerate(shuffled_options):
                    assigned_label = OPTION_LABELS[opt_idx] if opt_idx < len(OPTION_LABELS) else str(opt_idx + 1)
                    opt["label"] = assigned_label
                    if opt.get("id") == correct_id:
                        correct_label = assigned_label

                q["options"] = shuffled_options
                q["correctLabel"] = correct_label

                answer_key.append({
                    "questionNumber": q_idx,
                    "questionId": q.get("id", f"q-{q_idx}"),
                    "correctOption": correct_label,
                    "correctAnswerId": correct_id,
                    "explanation": q.get("explanation", "")
                })

            variants.append({
                "examCode": variant_code,
                "questionCount": len(variant_questions),
                "questions": variant_questions,
                "answerKey": answer_key
            })

        return {
            "totalVariants": len(variants),
            "variants": variants
        }
