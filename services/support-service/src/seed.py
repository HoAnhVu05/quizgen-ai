from sqlalchemy.orm import Session
from .models import SupportFAQCategory, SupportFAQArticle

def seed_default_knowledge_base(db: Session):
    """
    Nạp sẵn các danh mục và bài viết cẩm nang học thuật mẫu chất lượng cao
    để hỗ trợ giảng viên ngay từ lần khởi chạy đầu tiên.
    """
    # Kiểm tra xem đã có dữ liệu chưa
    existing_count = db.query(SupportFAQCategory).count()
    if existing_count > 0:
        return

    categories = [
        SupportFAQCategory(
            id="cat-doc-parsing",
            name="1. Nạp & Bóc tách Giáo trình (Document Ingestion)",
            slug="document-ingestion-ocr",
            description="Hướng dẫn tải lên tệp PDF, Word và khắc phục sự cố bóc tách chương mục.",
            icon="FileText",
            display_order=1
        ),
        SupportFAQCategory(
            id="cat-ai-bloom",
            name="2. Khởi tạo Đề thi AI & Thang đo Bloom",
            slug="ai-bloom-matrix",
            description="Cách thiết lập ma trận đề thi 4 bậc nhận thức và soạn công thức toán LaTeX.",
            icon="Cpu",
            display_order=2
        ),
        SupportFAQCategory(
            id="cat-exam-export",
            name="3. Đóng gói & In ấn Khảo thí (Exam Exporter)",
            slug="exam-export-omr-qti",
            description="Xuất đề thi Word, in ấn PDF Vector A4 kèm phiếu OMR và nhập vào Canvas LMS.",
            icon="Download",
            display_order=3
        ),
        SupportFAQCategory(
            id="cat-payment",
            name="4. Gói cước & Cổng Thanh toán VietQR",
            slug="payment-subscription-vietqr",
            description="Quy trình nâng cấp tài khoản qua quét mã VietQR và quản lý hạn mức.",
            icon="CreditCard",
            display_order=4
        )
    ]

    for cat in categories:
        db.add(cat)
    db.commit()

    articles = [
        SupportFAQArticle(
            id="art-pdf-ocr",
            category_id="cat-doc-parsing",
            title="Khắc phục lỗi font khi tải lên tài liệu PDF hoặc giáo trình quét ảnh (Scan)",
            slug="khac-phuc-loi-font-pdf-scan",
            content_markdown="""# Khắc phục lỗi font khi nạp tài liệu PDF

Khi tải lên tài liệu giáo trình định dạng PDF gặp hiện tượng chữ bị vỡ hạt hoặc mất dấu tiếng Việt:
1. **Kiểm tra định dạng PDF:** Đảm bảo tài liệu được xuất trực tiếp từ Microsoft Word hoặc LaTeX (Vector PDF) thay vì bản chụp điện thoại độ phân giải thấp.
2. **Kích thước tệp:** Giới hạn dung lượng tối đa cho mỗi tệp là 50MB.
3. **Mục lục giáo trình:** Để AI nhận dạng cây chương mục chính xác 100%, hãy đảm bảo tiêu đề các chương tuân theo cú pháp chuẩn như: `Chương 1: ...`, `Bài 2: ...`, `Phần I: ...`.""",
            tags="pdf,ocr,upload,document,font",
            view_count=120,
            helpful_count=45,
            unhelpful_count=1
        ),
        SupportFAQArticle(
            id="art-latex-math",
            category_id="cat-ai-bloom",
            title="Hướng dẫn soạn thảo và hiển thị công thức toán học LaTeX trực quan",
            slug="huong-dan-soan-thao-cong-thuc-toan-latex",
            content_markdown="""# Soạn thảo công thức toán học LaTeX trên QuizGen AI

QuizGen AI hỗ trợ đầy đủ công nghệ biên dịch công thức toán học KaTeX:
- **Công thức cùng dòng (Inline math):** Kẹp biểu thức giữa hai dấu đô la đơn: ví dụ `$E = mc^2$` hoặc `$f(x) = \\int_0^1 x^2 dx$`.
- **Ký hiệu đặc biệt:** Hỗ trợ đầy đủ các ký hiệu toán học phổ biến: `\\pm`, `\\alpha`, `\\beta`, `\\le`, `\\ge`, `\\ne`, `\\sum`, `\\sqrt{x}`.
- **Tự động làm sạch khi xuất Word:** Khi xuất đề thi ra file Microsoft Word (.docx), hệ thống tự động chuyển đổi các mã LaTeX phức tạp sang ký tự Unicode toán học chuẩn để đảm bảo máy in không bị lỗi font.""",
            tags="latex,math,formula,katex,bloom",
            view_count=210,
            helpful_count=89,
            unhelpful_count=2
        ),
        SupportFAQArticle(
            id="art-omr-printing",
            category_id="cat-exam-export",
            title="Quy chuẩn in ấn Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn khổ giấy A4",
            slug="quy-chuan-in-phieu-omr-50-cau-a4",
            content_markdown="""# Quy chuẩn in ấn Phiếu OMR 50 câu khớp máy quét

Phiếu trả lời trắc nghiệm OMR 50 câu được thiết kế theo tọa độ vật lý chuẩn xác:
1. **Kích cỡ trang in:** Chọn đúng khổ giấy **A4** (210 x 297 mm), không chọn khổ Letter.
2. **Tỷ lệ in (Scale):** Bắt buộc chọn **Actual Size (100%)** hoặc **Fit to Printable Area**, không chọn chế độ phóng to (Custom Scale > 100%) vì sẽ làm lệch tọa độ các ô tròn tô đáp án.
3. **Phần mềm chấm tương thích:** Tương thích hoàn toàn với các ứng dụng chấm thi quang học bằng máy quét hoặc điện thoại di động như ZipGrade, TestScanner, OMR Maker.""",
            tags="omr,print,pdf,a4,exam,zipgrade",
            view_count=350,
            helpful_count=142,
            unhelpful_count=3
        ),
        SupportFAQArticle(
            id="art-qti-lms",
            category_id="cat-exam-export",
            title="Cách nhập (Import) đề thi vào hệ thống LMS Canvas và Moodle qua gói IMS QTI 2.1",
            slug="nhap-de-thi-canvas-moodle-ims-qti",
            content_markdown="""# Hướng dẫn Import gói QTI vào LMS

Sau khi xuất bản gói `QTI_Package.zip` từ QuizGen AI:
1. **Trên Canvas LMS:** Vào Khóa học -> Chọn **Settings** -> Bấm **Import Course Content** -> Chọn loại nội dung là **QTI .zip file** -> Chọn tệp và bấm **Import**. Toàn bộ câu hỏi, đáp án đúng và phân bổ điểm sẽ được nạp tự động vào Ngân hàng câu hỏi của Canvas.
2. **Trên Moodle:** Vào Khóa học -> Bấm bánh răng Cài đặt -> Chọn **Question bank** -> Chọn tab **Import** -> Chọn định dạng **IMS QTI 2.1 package** và tải tệp lên.""",
            tags="qti,canvas,moodle,lms,import",
            view_count=185,
            helpful_count=76,
            unhelpful_count=1
        ),
        SupportFAQArticle(
            id="art-vietqr-pay",
            category_id="cat-payment",
            title="Quy trình thanh toán quét mã VietQR tự động kích hoạt tài khoản PRO",
            slug="quy-trinh-thanh-toan-vietqr-tu-dong",
            content_markdown="""# Quy trình nâng cấp gói cước qua VietQR

1. Trên giao diện Web, bấm nút **"Nâng cấp gói cước"** và chọn gói mong muốn (Pro hoặc Enterprise).
2. Hệ thống sinh mã Dynamic VietQR kèm số tiền và mã hóa đơn riêng biệt (`ORDER_xxxxxx`).
3. Mở bất kỳ ứng dụng ngân hàng nào (Vietcombank, BIDV, Techcombank, TPBank, v.v.), quét mã QR và xác nhận chuyển khoản.
4. **Kích hoạt tự động:** Sau khi chuyển tiền thành công, hệ thống nhận tín hiệu Webhook NAPAS 24/7 và nâng hạn mức tài khoản của bạn ngay lập tức trong vòng 3 đến 5 giây mà không cần thao tác thêm.""",
            tags="vietqr,payment,pro,upgrade,napas",
            view_count=290,
            helpful_count=110,
            unhelpful_count=0
        )
    ]

    for art in articles:
        db.add(art)
    db.commit()
