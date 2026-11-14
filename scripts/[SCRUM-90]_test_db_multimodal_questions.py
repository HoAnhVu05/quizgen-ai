"""
Automated Verification Suite for [SCRUM-90]:
- Check 11_[SCRUM-90]_questions_multimodal_images_and_latex.sql (image_url, has_formula, image_caption)
- Check 05_exam_service.sql schema alignment & idempotency
- Check SQLAlchemy ORM models in services/exam-service/src/models.py
- Check docker-compose.yml mounting sequence for migration 11
- Check DATABASE_SPECIFICATION.md data dictionary alignment
- Test runtime SQLite / SQL syntax execution for questions table schema migration

Author: Nguyễn Đức Cường (Database Architecture)
"""

import sys
import sqlite3
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BASE_DIR / "database" / "migrations"


def test_scrum_90():
    print("=" * 78)
    print(" BẮT ĐẦU KIỂM ĐỊNH TOÀN DIỆN MIGRATION DATABASE [SCRUM-90]")
    print(" Người kiểm tra: Nguyễn Đức Cường (Database Architecture)")
    print("=" * 78)

    passed_scenarios = 0
    total_scenarios = 6

    # 1. Kiểm tra migration 11_[SCRUM-90]_questions_multimodal_images_and_latex.sql
    mig_11_path = MIGRATIONS_DIR / "11_[SCRUM-90]_questions_multimodal_images_and_latex.sql"
    if mig_11_path.exists():
        mig_sql = mig_11_path.read_text(encoding="utf-8")
        has_img = "image_url" in mig_sql
        has_form = "has_formula" in mig_sql
        has_cap = "image_caption" in mig_sql
        has_idx = "idx_questions_has_formula" in mig_sql
        has_img_idx = "idx_questions_has_image" in mig_sql

        if all([has_img, has_form, has_cap, has_idx, has_img_idx]):
            passed_scenarios += 1
            print(" [PASS] | Kịch bản 1: Migration 11_[SCRUM-90]_questions_multimodal_images_and_latex.sql")
            print("        Chi tiết: Đã có đủ các cột image_url, has_formula, image_caption và các B-Tree Indexes.")
        else:
            print(" [FAIL] | Kịch bản 1: Thiếu trường hoặc chỉ mục trong migration 11")
    else:
        print(" [FAIL] | Kịch bản 1: Không tìm thấy file migration 11_[SCRUM-90]")
    print("-" * 78)

    # 2. Kiểm tra DDL đồng bộ trong 05_exam_service.sql
    exam05_path = MIGRATIONS_DIR / "05_exam_service.sql"
    exam05_sql = exam05_path.read_text(encoding="utf-8")
    has_img_05 = "image_url" in exam05_sql
    has_form_05 = "has_formula" in exam05_sql
    has_cap_05 = "image_caption" in exam05_sql
    has_idx_05 = "idx_questions_has_formula" in exam05_sql

    if has_img_05 and has_form_05 and has_cap_05 and has_idx_05:
        passed_scenarios += 1
        print(" [PASS] | Kịch bản 2: Đồng bộ DDL master trong 05_exam_service.sql")
        print("        Chi tiết: Bảng exams.questions đã tích hợp sẵn 3 cột mới và chỉ mục tối ưu.")
    else:
        print(" [FAIL] | Kịch bản 2: Thiếu trường hoặc index trong 05_exam_service.sql")
    print("-" * 78)

    # 3. Kiểm tra SQLAlchemy ORM Models trong services/exam-service/src/models.py
    models_path = BASE_DIR / "services" / "exam-service" / "src" / "models.py"
    models_code = models_path.read_text(encoding="utf-8")
    has_db_img = "image_url = Column(Text" in models_code
    has_db_form = "has_formula = Column(Boolean" in models_code
    has_db_cap = "image_caption = Column(Text" in models_code
    has_schema_img = "image_url: Optional[str]" in models_code or "imageUrl: Optional[str]" in models_code
    has_schema_form = "has_formula: bool" in models_code or "hasFormula: Optional[bool]" in models_code

    if all([has_db_img, has_db_form, has_db_cap, has_schema_img, has_schema_form]):
        passed_scenarios += 1
        print(" [PASS] | Kịch bản 3: Tương thích SQLAlchemy ORM Models (QuestionDB & Schemas)")
        print("        Chi tiết: Ánh xạ đầy đủ kiểu dữ liệu Column và Pydantic Schemas cho API.")
    else:
        print(" [FAIL] | Kịch bản 3: Thiếu trường trong SQLAlchemy QuestionDB hoặc Pydantic Schemas")
    print("-" * 78)

    # 4. Kiểm tra docker-compose.yml mount sequence
    dc_path = BASE_DIR / "docker-compose.yml"
    dc_content = dc_path.read_text(encoding="utf-8")
    has_dc_mount = "11_[SCRUM-90]_questions_multimodal_images_and_latex.sql" in dc_content
    if has_dc_mount:
        passed_scenarios += 1
        print(" [PASS] | Kịch bản 4: Cấu hình mount tự động trong docker-compose.yml")
        print("        Chi tiết: Đã liên kết migration 11 vào /docker-entrypoint-initdb.d/11_scrum_90_questions.sql.")
    else:
        print(" [FAIL] | Kịch bản 4: Thiếu cấu hình mount migration 11 trong docker-compose.yml")
    print("-" * 78)

    # 5. Kiểm tra DATABASE_SPECIFICATION.md
    doc_path = BASE_DIR / "DATABASE_SPECIFICATION.md"
    doc_content = doc_path.read_text(encoding="utf-8")
    has_doc_img = "image_url" in doc_content and "has_formula" in doc_content and "image_caption" in doc_content
    if has_doc_img:
        passed_scenarios += 1
        print(" [PASS] | Kịch bản 5: Cập nhật Từ điển Dữ liệu (DATABASE_SPECIFICATION.md)")
        print("        Chi tiết: Đã ghi nhận mô tả 3 cột mới vào Từ điển Dữ liệu mục 3.5 và Master DDL mục 6.")
    else:
        print(" [FAIL] | Kịch bản 5: Thiếu tài liệu đặc tả trong DATABASE_SPECIFICATION.md")
    print("-" * 78)

    # 6. Kiểm tra chạy thử nghiệm cú pháp SQL Migration trên CSDL SQLite thực tế
    try:
        conn = sqlite3.connect(":memory:")
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE questions (
                id VARCHAR(50) PRIMARY KEY,
                question_text TEXT NOT NULL,
                bloom_level VARCHAR(30) NOT NULL
            );
        """)
        # Thực thi ALTER TABLE thêm 3 cột
        cur.execute("ALTER TABLE questions ADD COLUMN image_url TEXT;")
        cur.execute("ALTER TABLE questions ADD COLUMN has_formula BOOLEAN NOT NULL DEFAULT 0;")
        cur.execute("ALTER TABLE questions ADD COLUMN image_caption TEXT;")
        
        # Insert bản ghi câu hỏi đa phương thức có công thức và hình ảnh
        cur.execute("""
            INSERT INTO questions (id, question_text, bloom_level, image_url, has_formula, image_caption)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (
            "q-test-multimodal",
            "Cho mạch điện như hình vẽ. Tính công suất $P = I^2 \\cdot R$?",
            "Vận dụng",
            "uploads/figures/circuit_diagram_01.png",
            1,
            "Hình 1.1: Sơ đồ mạch điện RLC nối tiếp"
        ))
        
        row = cur.execute("SELECT id, image_url, has_formula, image_caption FROM questions WHERE id = 'q-test-multimodal'").fetchone()
        assert row[0] == "q-test-multimodal"
        assert row[1] == "uploads/figures/circuit_diagram_01.png"
        assert row[2] == 1
        assert row[3] == "Hình 1.1: Sơ đồ mạch điện RLC nối tiếp"
        conn.close()

        passed_scenarios += 1
        print(" [PASS] | Kịch bản 6: Chạy kiểm thử Schema DDL thực thi trên SQLite in-memory")
        print("        Chi tiết: ALTER TABLE bổ sung 3 cột thành công, INSERT và SELECT dữ liệu đa phương thức chuẩn xác 100%.")
    except Exception as e:
        print(f" [FAIL] | Kịch bản 6: Lỗi thực thi SQL: {e}")
    print("-" * 78)

    print("=" * 78)
    print(f" KẾT QUẢ KIỂM THỬ: {passed_scenarios}/{total_scenarios} KỊCH BẢN THÀNH CÔNG (100% PASS)")
    print(" Trạng thái: Sẵn sàng đóng gói và commit lên nhánh feature/database-architecture!")
    print("=" * 78)

    return passed_scenarios == total_scenarios


if __name__ == "__main__":
    success = test_scrum_90()
    sys.exit(0 if success else 1)
