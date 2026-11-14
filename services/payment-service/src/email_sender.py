import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "quizgen.ai.team@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_NAME = "QuizGen AI - Hệ Thống Khảo Thí Học Thuật"

def send_payment_success_email(
    to_email: str,
    user_name: str,
    order_code: str,
    plan_name: str,
    amount_vnd: int,
    expires_at_str: str,
    payment_method: str = "VietQR (NAPAS 247)"
) -> bool:
    """
    Gửi email hóa đơn điện tử và thông báo kích hoạt gói cước thành công.
    Nếu SMTP chưa cấu hình mật khẩu ứng dụng, hàm sẽ ghi nhận log hóa đơn an toàn.
    """
    formatted_amount = f"{amount_vnd:,} VNĐ".replace(",", ".")
    current_time_str = datetime.now().strftime("%H:%M:%S ngày %d/%m/%Y")
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ background: linear-gradient(135deg, #008689 0%, #005f61 100%); padding: 32px 24px; text-align: center; color: white; }}
            .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }}
            .header p {{ margin: 8px 0 0; font-size: 13px; opacity: 0.9; }}
            .badge-success {{ display: inline-block; background-color: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 14px; }}
            .content {{ padding: 28px 24px; color: #1e293b; }}
            .greeting {{ font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }}
            .intro {{ font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
            .invoice-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
            .invoice-table th, .invoice-table td {{ padding: 12px 14px; text-align: left; font-size: 13px; border-bottom: 1px solid #f1f5f9; }}
            .invoice-table th {{ color: #64748b; font-weight: 600; width: 40%; }}
            .invoice-table td {{ color: #0f172a; font-weight: 700; }}
            .amount-highlight {{ color: #da1c2d; font-size: 16px; font-weight: 800; }}
            .features-box {{ background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 24px; }}
            .features-title {{ font-size: 13px; font-weight: bold; color: #166534; margin-bottom: 8px; }}
            .features-list {{ margin: 0; padding-left: 20px; font-size: 12px; color: #15803d; line-height: 1.8; }}
            .cta-btn {{ display: block; width: 220px; margin: 0 auto 20px; text-align: center; background-color: #008689; color: white !important; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: bold; }}
            .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>XÁC NHẬN KÍCH HOẠT DỊCH VỤ</h1>
                <p>Nền tảng Khảo thí & Khởi tạo Đề thi Trắc nghiệm Học thuật AI</p>
                <div class="badge-success">✓ GIAO DỊCH ĐÃ HOÀN TẤT</div>
            </div>
            <div class="content">
                <div class="greeting">Kính gửi Thầy/Cô {user_name},</div>
                <div class="intro">
                    Hệ thống <strong>QuizGen AI</strong> xin trân trọng thông báo đơn hàng nâng cấp tính năng của Thầy/Cô đã được xử lý và kích hoạt thành công trên tài khoản. Dưới đây là thông tin chi tiết hóa đơn thanh toán điện tử:
                </div>

                <table class="invoice-table">
                    <tr>
                        <th>Mã đơn hàng:</th>
                        <td>#{order_code}</td>
                    </tr>
                    <tr>
                        <th>Gói cước đã mua:</th>
                        <td><span style="color: #008689;">{plan_name}</span></td>
                    </tr>
                    <tr>
                        <th>Số tiền thanh toán:</th>
                        <td class="amount-highlight">{formatted_amount}</td>
                    </tr>
                    <tr>
                        <th>Phương thức:</th>
                        <td>{payment_method}</td>
                    </tr>
                    <tr>
                        <th>Thời gian giao dịch:</th>
                        <td>{current_time_str}</td>
                    </tr>
                    <tr>
                        <th>Hạn dùng gói cước:</th>
                        <td>{expires_at_str}</td>
                    </tr>
                </table>

                <div class="features-box">
                    <div class="features-title">🌟 Quyền lợi đã mở khóa tức thì cho tài khoản của Thầy/Cô:</div>
                    <ul class="features-list">
                        <li>Không giới hạn số lượng giáo trình PDF / DOCX tải lên kho tài liệu.</li>
                        <li>Sinh tới 1.000 câu hỏi trắc nghiệm AI mỗi tháng theo chuẩn 4 cấp độ tư duy Bloom.</li>
                        <li>Xuất bản đề thi chuẩn E-Learning Canvas / Moodle (IMS QTI 2.1 & Moodle XML).</li>
                        <li>Đảo đa mã đề hoán vị và in ấn trực tiếp tờ đề chuẩn thể thức đại học A4.</li>
                    </ul>
                </div>

                <a href="http://localhost:3000" class="cta-btn">Trải Nghiệm Tính Năng Ngay</a>
            </div>
            <div class="footer">
                <p>Email này được gửi tự động từ hệ thống QuizGen AI. Thầy/Cô vui lòng không trả lời thư này.</p>
                <p>Hỗ trợ kỹ thuật: quizgen.ai.team@gmail.com | Hotline: 1900-QUIZGEN</p>
                <p>&copy; 2026 QuizGen AI Team. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    print(f"[EMAIL INVOICE] Đang chuẩn bị gửi hóa đơn #{order_code} tới {to_email}...")
    
    # Nếu không có SMTP Password cấu hình, ghi log mô phỏng thành công
    if not SMTP_PASSWORD:
        print(f"[EMAIL INVOICE - SIMULATION] Đã ghi nhận hóa đơn điện tử #{order_code} gửi tới {to_email} (Gói: {plan_name}, {formatted_amount}).")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[QuizGen AI] Hóa đơn điện tử & Kích hoạt {plan_name} #{order_code}"
        msg["From"] = f"{SENDER_NAME} <{SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            
        print(f"[EMAIL INVOICE] Đã gửi thành công email hóa đơn tới {to_email} qua Gmail SMTP.")
        return True
    except Exception as e:
        print(f"[EMAIL INVOICE - WARNING] Không thể gửi qua SMTP: {str(e)}. Giao dịch vẫn hợp lệ.")
        return False
