const nodemailer = require('nodemailer');

const fs = require('fs');
const path = require('path');

// Đọc thông tin cấu hình từ biến môi trường hoặc file .env cục bộ
function getEnvConfig() {
  let user = process.env.SMTP_USER || 'quizgen.ai.team@gmail.com';
  let pass = process.env.SMTP_PASS || '';
  let fromName = process.env.SMTP_FROM_NAME || 'QuizGen AI — Cổng Khảo thí & Ngân hàng Đề thi Học thuật';

  if (!pass) {
    try {
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('SMTP_PASS=')) pass = trimmed.slice(10).trim();
          if (trimmed.startsWith('SMTP_USER=')) user = trimmed.slice(10).trim();
          if (trimmed.startsWith('SMTP_FROM_NAME=')) fromName = trimmed.slice(15).trim();
        }
      }
    } catch {}
  }
  return { user, pass, fromName };
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const config = getEnvConfig();
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
  }
  return transporter;
}

/**
 * Gửi email chứa mã OTP xác thực
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} otp - Mã 6 chữ số
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendOtpEmail(toEmail, otp) {
  try {
    const client = getTransporter();

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực OTP QuizGen AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #008689 0%, #004d50 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.15); border-radius: 12px; line-height: 48px; margin-bottom: 12px;">
                <span style="font-size: 26px;">🎓</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">QuizGen AI</h1>
              <p style="margin: 6px 0 0 0; color: #ccfbf1; font-size: 13px; font-weight: 400; opacity: 0.95;">Cổng Khảo thí & Ngân hàng Đề thi Học thuật UTH</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #0f172a;">Xác nhận đặt lại mật khẩu</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong style="color: #0f172a;">${toEmail}</strong>.
              </p>
              
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">
                Vui lòng sử dụng mã xác thực OTP (One-Time Password) dưới đây để tiếp tục:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f0fdfa; border: 2px dashed #008689; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #0f766e; margin-bottom: 8px;">MÃ XÁC THỰC CỦA BẠN</span>
                <span style="display: block; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #008689; margin-left: 10px;">${otp}</span>
                <div style="margin-top: 10px; display: inline-block; background-color: #fee2e2; border-radius: 20px; padding: 4px 12px;">
                  <span style="color: #991b1b; font-size: 12px; font-weight: 600;">⏱ Hiệu lực trong 5 phút</span>
                </div>
              </div>

              <!-- Security Warning -->
              <div style="background-color: #f8fafc; border-left: 4px solid #cbd5e1; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                  🔒 <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên hỗ trợ hệ thống. Nếu bạn không gửi yêu cầu này, hãy bỏ qua email hoặc đổi mật khẩu ngay để đảm bảo an toàn.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Trân trọng,<br>
                <strong style="color: #334155;">Ban Đảm bảo Chất lượng & Khảo thí — QuizGen AI</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email này được gửi tự động từ hệ thống QuizGen AI.<br>
                Trường Đại học Giao thông vận tải TP.HCM (UTH) — Nền tảng Soạn thảo Đề thi & Khảo thí Học thuật.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const config = getEnvConfig();
    const info = await client.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to: toEmail,
      subject: `[QuizGen AI] Mã xác nhận OTP của bạn là ${otp}`,
      html: htmlContent,
      text: `Mã xác thực OTP của bạn tại QuizGen AI là: ${otp}. Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`,
    });

    console.log(`[EmailService] Sent OTP email to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService] Failed to send OTP email to ${toEmail}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOtpEmail,
};
