import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { sendOtpEmail } = require('./scripts/emailService.cjs');

// Bộ nhớ đệm lưu mã OTP trong phiên làm việc
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function authOtpDevPlugin() {
  return {
    name: 'quizgen-auth-otp-dev-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '';

        // API 1: Gửi mã OTP xác thực quên mật khẩu
        if (url.startsWith('/api/v1/auth/forgot-password') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const email = String(data.email || '').trim().toLowerCase();

              if (!email || !email.includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ detail: 'Vui lòng nhập địa chỉ email học thuật hợp lệ.' }));
                return;
              }

              // Sinh mã OTP 6 chữ số ngẫu nhiên
              const otp = String(Math.floor(100000 + Math.random() * 900000));
              otpStore.set(email, {
                otp,
                expiresAt: Date.now() + 5 * 60 * 1000 // Hạn dùng 5 phút
              });

              console.log(`[QuizGen Auth] Đang gửi mã OTP [${otp}] tới ${email} qua Gmail...`);
              const mailResult = await sendOtpEmail(email, otp);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'success',
                message: `Mã OTP đã được gửi thành công tới hòm thư ${email}.`,
                expires_in: 300,
                email_sent: mailResult.success,
                dev_otp: otp
              }));
            } catch (err: any) {
              console.error('[QuizGen Auth] Lỗi xử lý forgot-password:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ detail: 'Lỗi hệ thống khi gửi email OTP: ' + err.message }));
            }
          });
          return;
        }

        // API 2: Xác minh OTP & Đặt lại mật khẩu mới
        if (url.startsWith('/api/v1/auth/reset-password') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const email = String(data.email || '').trim().toLowerCase();
              const otp = String(data.otp || '').trim();
              const newPassword = String(data.new_password || '');

              if (!email || !otp || !newPassword) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ detail: 'Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới.' }));
                return;
              }

              if (newPassword.length < 6) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ detail: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' }));
                return;
              }

              const record = otpStore.get(email);
              if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ detail: 'Mã xác minh OTP không chính xác hoặc đã hết thời gian hiệu lực (5 phút).' }));
                return;
              }

              // Xóa OTP đã sử dụng
              otpStore.delete(email);

              console.log(`[QuizGen Auth] Đặt lại mật khẩu thành công cho ${email}.`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'success',
                message: 'Mật khẩu mới đã được cập nhật thành công vào hệ thống.'
              }));
            } catch (err: any) {
              console.error('[QuizGen Auth] Lỗi xử lý reset-password:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ detail: 'Lỗi xử lý xác minh: ' + err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), authOtpDevPlugin()],
  server: {
    port: 3000,
    host: '127.0.0.1',
    open: true,
    allowedHosts: true
  }
});
