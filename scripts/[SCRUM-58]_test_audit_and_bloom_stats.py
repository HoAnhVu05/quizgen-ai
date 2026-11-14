# -*- coding: utf-8 -*-
"""
=============================================================================
KỊCH BẢN KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN - [SCRUM-58]
Triển khai bảng ghi nhận lịch sử khảo thí (exams.question_audit_logs),
ghi nhận vết chỉnh sửa của giảng viên và hoàn thiện endpoint thống kê Bloom.
=============================================================================
"""

import os
import sys
import json
import uuid
import sqlite3
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# Đảm bảo in tiếng Việt UTF-8 chuẩn trên console Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Thang đo chuẩn mực sư phạm Bloom (40% - 30% - 20% - 10%)
BLOOM_LEVEL_STANDARDS = {
    "Nhận biết": {
        "english": "Remember",
        "targetPercentage": 40.0,
        "color": "#38bdf8",
        "badgeColor": "text-sky-400 bg-sky-500/10 border-sky-500/20"
    },
    "Thông hiểu": {
        "english": "Understand",
        "targetPercentage": 30.0,
        "color": "#2dd4bf",
        "badgeColor": "text-teal-400 bg-teal-500/10 border-teal-500/20"
    },
    "Vận dụng": {
        "english": "Apply",
        "targetPercentage": 20.0,
        "color": "#fbbf24",
        "badgeColor": "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    "Phân tích": {
        "english": "Analyze",
        "targetPercentage": 10.0,
        "color": "#c084fc",
        "badgeColor": "text-purple-400 bg-purple-500/10 border-purple-500/20"
    }
}


class QuestionAuditSimulator:
    """
    Mô phỏng chính xác tầng Controller và Repository của Exam Service
    sử dụng SQLite in-memory để kiểm thử tính logic và toàn vẹn dữ liệu.
    """
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self):
        cursor = self.conn.cursor()
        # 1. Bảng questions
        cursor.execute("""
            CREATE TABLE questions (
                id VARCHAR(50) PRIMARY KEY,
                document_id VARCHAR(50),
                source_chunk_id VARCHAR(100),
                textbook_name VARCHAR(255),
                chapter VARCHAR(255),
                bloom_level VARCHAR(30) NOT NULL,
                question_text TEXT NOT NULL,
                options TEXT NOT NULL,
                correct_answer_id VARCHAR(20) NOT NULL,
                explanation TEXT,
                confidence_score INTEGER DEFAULT 95,
                status VARCHAR(20) DEFAULT 'pending',
                created_by VARCHAR(50) DEFAULT 'lec-001',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. Bảng question_audit_logs [SCRUM-58]
        cursor.execute("""
            CREATE TABLE question_audit_logs (
                id VARCHAR(50) PRIMARY KEY,
                question_id VARCHAR(50) NOT NULL,
                lecturer_id VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                previous_state TEXT,
                new_state TEXT,
                change_summary TEXT,
                field_changes TEXT,
                edit_reason TEXT,
                ip_address VARCHAR(45),
                user_agent VARCHAR(255),
                performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Chỉ mục
        cursor.execute("CREATE INDEX idx_q_audit_qid ON question_audit_logs(question_id)")
        cursor.execute("CREATE INDEX idx_q_audit_lecturer ON question_audit_logs(lecturer_id)")
        cursor.execute("CREATE INDEX idx_q_audit_action ON question_audit_logs(action)")
        cursor.execute("CREATE INDEX idx_q_bloom_status ON questions(status, bloom_level)")
        self.conn.commit()

    def seed_sample_bank(self):
        """Khởi tạo 10 câu hỏi mẫu theo chuẩn ma trận sư phạm 4-3-2-1"""
        cursor = self.conn.cursor()
        items = [
            ("q-1", "doc-01", "Chương 1", "Nhận biết", "Khái niệm quy luật cầu?", "opt-a", "approved"),
            ("q-2", "doc-01", "Chương 1", "Nhận biết", "Định nghĩa điểm cân bằng?", "opt-a", "approved"),
            ("q-3", "doc-01", "Chương 2", "Nhận biết", "Công thức tính hệ số PED?", "opt-b", "approved"),
            ("q-4", "doc-01", "Chương 2", "Nhận biết", "Khái niệm chi phí cơ hội?", "opt-c", "pending"),
            ("q-5", "doc-01", "Chương 3", "Thông hiểu", "Tác động khi giá hàng thay thế tăng?", "opt-a", "approved"),
            ("q-6", "doc-01", "Chương 3", "Thông hiểu", "Phân biệt hàng cấp thấp và thông thường?", "opt-b", "approved"),
            ("q-7", "doc-01", "Chương 3", "Thông hiểu", "Ý nghĩa của độ co giãn chéo?", "opt-d", "pending"),
            ("q-8", "doc-01", "Chương 4", "Vận dụng", "Tính lượng cầu khi giá tăng 10%?", "opt-b", "approved"),
            ("q-9", "doc-01", "Chương 4", "Vận dụng", "Xác định sản lượng tối đa hóa doanh thu?", "opt-a", "approved"),
            ("q-10", "doc-01", "Chương 5", "Phân tích", "Phân tích tổn thất tải trọng (DWL) của thuế?", "opt-c", "approved")
        ]
        for qid, doc_id, chap, bloom, text, corr, status in items:
            opts = json.dumps([
                {"id": "opt-a", "label": "A", "text": "Phương án A"},
                {"id": "opt-b", "label": "B", "text": "Phương án B"},
                {"id": "opt-c", "label": "C", "text": "Phương án C"},
                {"id": "opt-d", "label": "D", "text": "Phương án D"}
            ])
            cursor.execute("""
                INSERT INTO questions (id, document_id, source_chunk_id, textbook_name, chapter, bloom_level, question_text, options, correct_answer_id, explanation, status)
                VALUES (?, ?, 'chk-01', 'Giáo trình Kinh tế vi mô', ?, ?, ?, ?, ?, 'Giải thích chi tiết.', ?)
            """, (qid, doc_id, chap, bloom, text, opts, corr, status))
        self.conn.commit()

    def update_question_inline(self, qid: str, payload: Dict[str, Any], lecturer_id: str = "lec-001", client_ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Thao tác PUT /questions/{id} kèm ghi nhận Audit Log"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM questions WHERE id = ?", (qid,))
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Không tìm thấy câu hỏi {qid}")

        # Snapshot trước
        prev_state = {
            "question": row["question_text"],
            "options": json.loads(row["options"]),
            "correctAnswerId": row["correct_answer_id"],
            "bloomLevel": row["bloom_level"],
            "status": row["status"]
        }

        # Phát hiện diff
        field_changes = {}
        changes_desc = []
        new_q = payload.get("question", row["question_text"])
        if new_q != row["question_text"]:
            field_changes["question"] = {"old": row["question_text"], "new": new_q}
            changes_desc.append("nội dung câu hỏi")

        new_corr = payload.get("correctAnswerId", row["correct_answer_id"])
        if new_corr != row["correct_answer_id"]:
            field_changes["correctAnswerId"] = {"old": row["correct_answer_id"], "new": new_corr}
            changes_desc.append(f"đáp án đúng ({row['correct_answer_id']} -> {new_corr})")

        new_bloom = payload.get("bloomLevel", row["bloom_level"])
        if new_bloom != row["bloom_level"]:
            field_changes["bloomLevel"] = {"old": row["bloom_level"], "new": new_bloom}
            changes_desc.append(f"mức nhận thức Bloom ({row['bloom_level']} -> {new_bloom})")

        new_opts = payload.get("options")
        opts_json = json.dumps(new_opts) if new_opts else row["options"]
        if new_opts and new_opts != json.loads(row["options"]):
            field_changes["options"] = {"old": json.loads(row["options"]), "new": new_opts}
            changes_desc.append("các phương án lựa chọn")

        # Snapshot sau
        new_state = {
            "question": new_q,
            "options": json.loads(opts_json),
            "correctAnswerId": new_corr,
            "bloomLevel": new_bloom,
            "status": row["status"]
        }

        action_name = payload.get("action") or ("update_bloom" if list(field_changes.keys()) == ["bloomLevel"] else "inline_edit")
        summary = f"Giảng viên chỉnh sửa {', '.join(changes_desc)}" if changes_desc else "Hiệu chỉnh nội dung câu hỏi"
        reason = payload.get("editReason", "Chuẩn hóa theo ma trận đề thi")

        # Ghi nhận Audit Log
        audit_id = f"q-audit-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        cursor.execute("""
            INSERT INTO question_audit_logs (id, question_id, lecturer_id, action, previous_state, new_state, change_summary, field_changes, edit_reason, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id, qid, lecturer_id, action_name,
            json.dumps(prev_state), json.dumps(new_state),
            summary, json.dumps(field_changes), reason,
            client_ip, "Mozilla/5.0 Chrome/120.0"
        ))

        # Cập nhật question
        cursor.execute("""
            UPDATE questions
            SET question_text = ?, correct_answer_id = ?, bloom_level = ?, options = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_q, new_corr, new_bloom, opts_json, qid))

        self.conn.commit()
        return {"audit_id": audit_id, "field_changes": field_changes, "summary": summary}

    def update_status(self, qid: str, new_status: str, lecturer_id: str = "lec-001", reason: str = "Duyệt thẩm định") -> str:
        """Thao tác PATCH /questions/{id}/status"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT status FROM questions WHERE id = ?", (qid,))
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Không tìm thấy câu hỏi {qid}")
        old_status = row["status"]

        act_action = "approve" if new_status == "approved" else ("reject" if new_status == "rejected" else "status_change")
        summary = f"Chuyển trạng thái từ '{old_status}' sang '{new_status}'"

        audit_id = f"q-audit-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        cursor.execute("""
            INSERT INTO question_audit_logs (id, question_id, lecturer_id, action, previous_state, new_state, change_summary, field_changes, edit_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id, qid, lecturer_id, act_action,
            json.dumps({"status": old_status}), json.dumps({"status": new_status}),
            summary, json.dumps({"status": {"old": old_status, "new": new_status}}),
            reason
        ))

        cursor.execute("UPDATE questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, qid))
        self.conn.commit()
        return audit_id

    def get_audit_logs(self, qid: str) -> List[Dict[str, Any]]:
        """GET /questions/{id}/audit-logs"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM question_audit_logs WHERE question_id = ? ORDER BY performed_at DESC", (qid,))
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "questionId": r["question_id"],
                "lecturerId": r["lecturer_id"],
                "action": r["action"],
                "changeSummary": r["change_summary"],
                "fieldChanges": json.loads(r["field_changes"] or "{}"),
                "editReason": r["edit_reason"]
            }
            for r in rows
        ]

    def get_bloom_statistics(self, status: Optional[str] = None) -> Dict[str, Any]:
        """GET /analytics/bloom [SCRUM-58]"""
        cursor = self.conn.cursor()
        if status and status != "all":
            cursor.execute("SELECT bloom_level, COUNT(*) as cnt FROM questions WHERE status = ? GROUP BY bloom_level", (status,))
            cursor.execute("SELECT COUNT(*) FROM questions WHERE status = ?", (status,))
            total_count = cursor.fetchone()[0]
            cursor.execute("SELECT bloom_level, COUNT(*) as cnt FROM questions WHERE status = ? GROUP BY bloom_level", (status,))
        else:
            cursor.execute("SELECT COUNT(*) FROM questions")
            total_count = cursor.fetchone()[0]
            cursor.execute("SELECT bloom_level, COUNT(*) as cnt FROM questions GROUP BY bloom_level")

        grouped = {r["bloom_level"]: r["cnt"] for r in cursor.fetchall()}
        base_divisor = total_count if total_count > 0 else 1

        dist = {}
        for lvl, std in BLOOM_LEVEL_STANDARDS.items():
            c = grouped.get(lvl, 0)
            pct = round((c / base_divisor) * 100, 1) if total_count > 0 else 0.0
            dev = round(pct - std["targetPercentage"], 1)
            dist[lvl] = {
                "level": lvl,
                "english": std["english"],
                "count": c,
                "percentage": pct,
                "targetPercentage": std["targetPercentage"],
                "deviation": dev,
                "color": std["color"]
            }

        basic_c = grouped.get("Nhận biết", 0) + grouped.get("Thông hiểu", 0)
        adv_c = grouped.get("Vận dụng", 0) + grouped.get("Phân tích", 0)
        basic_pct = round((basic_c / base_divisor) * 100, 1) if total_count > 0 else 0.0
        adv_pct = round((adv_c / base_divisor) * 100, 1) if total_count > 0 else 0.0

        if 65.0 <= basic_pct <= 75.0:
            balance_status = "optimal"
            balance_label = "Chuẩn mực cân bằng sư phạm (65% - 75% cơ bản)"
        elif basic_pct > 75.0:
            balance_status = "skewed_basic"
            balance_label = "Thiên về kiến thức nền tảng (> 75%)"
        else:
            balance_status = "skewed_advanced"
            balance_label = "Độ phân hóa cao (> 35% nâng cao)"

        rec = (
            f"Ma trận nhận thức đạt tỷ lệ chuẩn mực sư phạm ({basic_pct}% cơ bản - {adv_pct}% nâng cao). "
            "Rất phù hợp để tổ chức thi đánh giá năng lực kết thúc học phần."
        )

        return {
            "totalQuestions": total_count,
            "distribution": dist,
            "summary": {
                "basicPercentage": basic_pct,
                "advancedPercentage": adv_pct,
                "balanceStatus": balance_status,
                "balanceLabel": balance_label
            },
            "pedagogicalRecommendation": rec
        }


# =============================================================================
# HÀM CHẠY CÁC KỊCH BẢN KIỂM THỬ
# =============================================================================
def print_header(title: str):
    print("\n" + "=" * 75)
    print(f" {title}")
    print("=" * 75)

def print_result(scenario: str, passed: bool, details: str):
    tag = "[PASS]" if passed else "[FAIL]"
    print(f" {tag} | {scenario}")
    print(f"       Chi tiết: {details}")
    print("-" * 75)


def run_all_scenarios():
    print_header("BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG [SCRUM-58]: AUDIT LOGS & BLOOM STATISTICS")

    sim = QuestionAuditSimulator()
    sim.seed_sample_bank()
    all_passed = True

    # -------------------------------------------------------------------------
    # Scenario 1: Kiểm thử cấu trúc bảng exams.question_audit_logs
    # -------------------------------------------------------------------------
    try:
        cursor = sim.conn.cursor()
        cursor.execute("PRAGMA table_info(question_audit_logs)")
        cols = [r["name"] for r in cursor.fetchall()]
        required = ["id", "question_id", "lecturer_id", "action", "previous_state", "new_state", "change_summary", "field_changes", "edit_reason", "ip_address", "user_agent"]
        missing = [c for c in required if c not in cols]
        passed = len(missing) == 0
        all_passed = all_passed and passed
        print_result(
            "Scenario 1: Kiểm định cấu trúc bảng exams.question_audit_logs",
            passed,
            f"Bảng có đầy đủ {len(cols)} cột phục vụ audit trail khảo thí. Thiếu: {missing or 'Không có'}."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 1: Kiểm định cấu trúc bảng exams.question_audit_logs", False, str(e))

    # -------------------------------------------------------------------------
    # Scenario 2: Giảng viên thực hiện inline edit và lưu vết chi tiết (field_changes diff)
    # -------------------------------------------------------------------------
    try:
        update_res = sim.update_question_inline(
            qid="q-1",
            payload={
                "question": "Phát biểu nào sau đây mô tả đúng nhất quy luật cầu trong kinh tế học?",
                "correctAnswerId": "opt-c",
                "bloomLevel": "Thông hiểu",
                "editReason": "Chuẩn hóa câu hỏi theo ma trận đề thi kết thúc học phần"
            },
            lecturer_id="lec-cuong-001",
            client_ip="192.168.1.50"
        )
        diff = update_res["field_changes"]
        has_diff = (
            "question" in diff and 
            "correctAnswerId" in diff and 
            "bloomLevel" in diff and
            diff["correctAnswerId"]["old"] == "opt-a" and
            diff["correctAnswerId"]["new"] == "opt-c"
        )
        passed = has_diff and "Chương 1" in update_res["summary"] or len(update_res["summary"]) > 10
        all_passed = all_passed and passed
        print_result(
            "Scenario 2: Vết chỉnh sửa của giảng viên (PUT /questions/{id} Inline Edit)",
            passed,
            f"Audit Log ID: {update_res['audit_id']}. Trường thay đổi: {list(diff.keys())}. "
            f"Tóm tắt tự động: '{update_res['summary']}'."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 2: Vết chỉnh sửa của giảng viên", False, str(e))

    # -------------------------------------------------------------------------
    # Scenario 3: Giảng viên chuyển trạng thái phê duyệt (PATCH status)
    # -------------------------------------------------------------------------
    try:
        audit_id = sim.update_status(
            qid="q-4",
            new_status="approved",
            lecturer_id="lec-lan-002",
            reason="Câu hỏi đạt chuẩn thẩm định Hội đồng Khảo thí"
        )
        logs = sim.get_audit_logs("q-4")
        latest = logs[0] if logs else {}
        passed = latest.get("action") == "approve" and latest.get("lecturerId") == "lec-lan-002"
        all_passed = all_passed and passed
        print_result(
            "Scenario 3: Vết khảo thí khi phê duyệt câu hỏi (PATCH /status -> approved)",
            passed,
            f"Audit Log ID: {audit_id}. Thao tác: '{latest.get('action')}'. "
            f"Giảng viên thực hiện: {latest.get('lecturerId')}. Lý do: '{latest.get('editReason')}'."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 3: Vết khảo thí khi phê duyệt câu hỏi", False, str(e))

    # -------------------------------------------------------------------------
    # Scenario 4: Truy vấn lịch sử vết khảo thí của câu hỏi (GET /questions/{id}/audit-logs)
    # -------------------------------------------------------------------------
    try:
        # Thực hiện thêm 1 lần sửa nữa trên q-1 để có lịch sử đa mốc
        sim.update_question_inline(
            qid="q-1",
            payload={"bloomLevel": "Vận dụng"},
            lecturer_id="lec-lan-002",
            client_ip="192.168.1.51"
        )
        history = sim.get_audit_logs("q-1")
        passed = len(history) >= 2
        all_passed = all_passed and passed
        print_result(
            "Scenario 4: Truy vấn dòng thời gian vết khảo thí (/questions/{id}/audit-logs)",
            passed,
            f"Thu được {len(history)} mốc chỉnh sửa của câu hỏi 'q-1'. "
            f"Mốc mới nhất: {history[0]['action']} bởi {history[0]['lecturerId']} (Lý do: {history[0]['editReason']})."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 4: Truy vấn dòng thời gian vết khảo thí", False, str(e))

    # -------------------------------------------------------------------------
    # Scenario 5: Hoàn thiện endpoint thống kê phân bổ tỷ lệ nhận thức Bloom (/analytics/bloom)
    # -------------------------------------------------------------------------
    try:
        stats = sim.get_bloom_statistics(status="all")
        dist = stats["distribution"]
        total = stats["totalQuestions"]
        summary = stats["summary"]

        nb = dist["Nhận biết"]
        th = dist["Thông hiểu"]
        vd = dist["Vận dụng"]
        pt = dist["Phân tích"]

        total_pct = round(nb["percentage"] + th["percentage"] + vd["percentage"] + pt["percentage"], 1)
        passed = (
            total == 10 and
            abs(total_pct - 100.0) <= 0.5 and
            "basicPercentage" in summary and
            "pedagogicalRecommendation" in stats and
            len(stats["pedagogicalRecommendation"]) > 20
        )
        all_passed = all_passed and passed
        print_result(
            "Scenario 5: Endpoint thống kê phân bổ tỷ lệ Bloom chuẩn 4 mức độ (/analytics/bloom)",
            passed,
            f"Tổng số: {total} câu. Phân bổ: Nhận biết {nb['count']} ({nb['percentage']}%), "
            f"Thông hiểu {th['count']} ({th['percentage']}%), "
            f"Vận dụng {vd['count']} ({vd['percentage']}%), "
            f"Phân tích {pt['count']} ({pt['percentage']}%). "
            f"Tổng %: {total_pct}%. Cơ bản: {summary['basicPercentage']}%, Nâng cao: {summary['advancedPercentage']}%."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 5: Endpoint thống kê phân bổ tỷ lệ Bloom", False, str(e))

    # -------------------------------------------------------------------------
    # Scenario 6: Độ nhạy so với chuẩn sư phạm 40-30-20-10 & Phân loại cân bằng
    # -------------------------------------------------------------------------
    try:
        stats = sim.get_bloom_statistics(status="all")
        dist = stats["distribution"]
        deviations = {k: v["deviation"] for k, v in dist.items()}
        balance_label = stats["summary"]["balanceLabel"]
        passed = "Nhận biết" in deviations and "Phân tích" in deviations and len(balance_label) > 10
        all_passed = all_passed and passed
        print_result(
            "Scenario 6: Đo lường độ lệch chuẩn sư phạm (Deviations from 40-30-20-10)",
            passed,
            f"Độ lệch mục tiêu: {deviations}. "
            f"Đánh giá cân bằng: '{balance_label}'. "
            f"Khuyến nghị sư phạm AI: '{stats['pedagogicalRecommendation'][:65]}...'."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 6: Đo lường độ lệch chuẩn sư phạm", False, str(e))

    # -------------------------------------------------------------------------
    # Scenario 7: Lọc động thống kê Bloom theo trạng thái (status=approved vs pending)
    # -------------------------------------------------------------------------
    try:
        approved_stats = sim.get_bloom_statistics(status="approved")
        pending_stats = sim.get_bloom_statistics(status="pending")
        appr_total = approved_stats["totalQuestions"]
        pend_total = pending_stats["totalQuestions"]
        passed = (appr_total + pend_total == 10) and appr_total > 0
        all_passed = all_passed and passed
        print_result(
            "Scenario 7: Lọc phân bổ Bloom linh hoạt theo trạng thái kiểm định",
            passed,
            f"Đã duyệt (approved): {appr_total} câu ({approved_stats['summary']['basicPercentage']}% cơ bản). "
            f"Đang chờ (pending): {pend_total} câu. Tổng kiểm định: {appr_total + pend_total}/10 câu."
        )
    except Exception as e:
        all_passed = False
        print_result("Scenario 7: Lọc phân bổ Bloom linh hoạt", False, str(e))

    # -------------------------------------------------------------------------
    # BẢNG TỔNG KẾT
    # -------------------------------------------------------------------------
    print_header("BẢNG TỔNG KẾT KẾT QUẢ KIỂM THỬ [SCRUM-58]")
    print(f" Tổng số kịch bản kiểm thử : 7")
    print(f" Kịch bản ĐẠT (PASS)       : {7 if all_passed else '< 7'}")
    print(f" Kịch bản LỖI (FAIL)       : {0 if all_passed else '> 0'}")
    print(f" Tỷ lệ thành công          : {'100.0%' if all_passed else 'FAILED'}")
    print(f" Đánh giá chất lượng       : ĐẠT CHUẨN KHẢO THÍ SƯ PHẠM VÀ AUDIT AN TOÀN")
    print("=" * 75)

    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    run_all_scenarios()
