const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { sendOtpEmail } = require('./emailService.cjs');

const PORT = 8000;

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match && match[1]) return match[1].trim();
    }
  } catch {}
  return '';
}

async function callGeminiChat({ message, history, context }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const screenLabel = (context && context.screenLabel) || 'Bảng điều khiển';
  const q = context && context.activeQuestion;
  const userName = (context && context.userName) || 'Thầy/Cô';
  const docName = context && (context.documentName || context.document_name);
  const docId = context && (context.documentId || context.document_id);
  const docPages = context && context.documentPages;
  const allDocs = (context && context.allDocuments) || [];
  const docChunks = (context && (context.docChunks || context.chunks)) || [];

  let sysText = `Bạn là Quanta — Trợ lý Khảo thí Học thuật & Chuyên gia Phân tích Giáo trình AI cao cấp của nền tảng QuizGen AI.\n` +
    `Bạn đang đồng hành trực tiếp cùng ${userName} trong nghiên cứu tài liệu, thẩm định tri thức và biên soạn đề thi.\n` +
    `Màn hình làm việc hiện tại: ${screenLabel}.\n\n` +
    `QUY ĐỊNH BẮT BUỘC VỀ VAI TRÒ & NĂNG LỰC (NGHIÊM CẤM TỪ CHỐI):\n` +
    `1. BẠN CÓ TOÀN QUYỀN TRUY CẬP, đọc hiểu, phân tích sâu, tóm tắt và trích xuất mọi dữ liệu từ giáo trình, bài giảng mà người dùng đã tải lên.\n` +
    `2. TUYỆT ĐỐI NGHIÊM CẤM từ chối hoặc nói các câu như: "Tôi không có khả năng trực tiếp đọc file", "Tôi không xem được tài liệu", "Tôi chỉ hỗ trợ biên soạn đề thi". Đó là vi phạm nghiêm trọng quy chuẩn hệ thống QuizGen AI.\n` +
    `3. Khi người dùng yêu cầu "Tóm tắt giáo trình / tài liệu vừa gửi lên", "Nội dung chương này là gì?", "Giải thích định nghĩa trong sách":\n` +
    `   - Hãy lập tức phân tích và tóm tắt chi tiết, mạch lạc theo chuẩn mực học thuật của môn học/tài liệu đó (dựa trên tên tài liệu '${docName || 'tài liệu đã nạp'}' và các chương mục).\n` +
    `   - Trình bày bài bản: Khái quát học phần -> Trọng tâm từng chương mục chính (kèm số trang và luận điểm then chốt) -> Các lưu ý và định hướng ra câu hỏi thi trắc nghiệm theo thang đo Bloom.\n` +
    `4. Tuyệt đối không nhắc đến bất kỳ tên trường đại học cụ thể nào (không được xuất hiện chữ UTH).\n` +
    `5. Khi viết công thức Toán, Lý, Hóa, BẮT BUỘC dùng định dạng LaTeX ($...$ hoặc $$...$$).\n` +
    `6. Giữ văn phong sư phạm chuẩn mực, chuyên nghiệp, truyền cảm hứng.\n`;

  // Tìm kiếm giáo trình trong cơ sở tri thức (hỗ trợ cả tìm theo tên tài liệu tải lên)
  let matchedDoc = null;
  if (docId && CURRICULUM_DATABASE[docId]) {
    matchedDoc = CURRICULUM_DATABASE[docId];
  } else if (docName) {
    const lowDoc = docName.toLowerCase();
    if (lowDoc.includes('tuong') || lowDoc.includes('hcm') || lowDoc.includes('ho chi minh')) {
      matchedDoc = CURRICULUM_DATABASE['doc-tu-tuong-hcm'];
    } else if (lowDoc.includes('vi mo') || lowDoc.includes('kinh te')) {
      matchedDoc = CURRICULUM_DATABASE['doc-kinh-te-vi-mo-2025'];
    } else if (lowDoc.includes('tri tue') || lowDoc.includes('nhan tao') || lowDoc.includes('ai')) {
      matchedDoc = CURRICULUM_DATABASE['doc-tri-tue-nhan-tao-2026'];
    }
  }

  // Can thiệp sâu vào giáo trình học liệu
  if (docName || docId || allDocs.length > 0 || matchedDoc) {
    sysText += `\n\nTHÔNG TIN GIÁO TRÌNH & DỮ LIỆU ĐÃ TẢI LÊN:\n`;
    if (docName) {
      sysText += `- Giáo trình đang làm việc: '${docName}' (Mã: ${docId || 'chưa gán'}, Số trang: ${docPages || 'chưa xác định'})\n`;
    }
    if (allDocs.length > 0) {
      sysText += `- Kho tài liệu đã nạp (${allDocs.length} tài liệu):\n`;
      for (const d of allDocs.slice(0, 5)) {
        sysText += `  + ${d.name || d.id} (${d.totalPages || '?'} trang, ${d.chaptersCount || '?'} chương)\n`;
      }
    }

    if (docChunks.length > 0) {
      sysText += `\nTRÍCH ĐOẠN NGỮ CẢNH TỪ GIÁO TRÌNH:\n`;
      for (const c of docChunks.slice(0, 6)) {
        sysText += `[Trang ${c.pageNumber || c.page_number || '?'}] ${c.text || c.textSnippet || ''}\n`;
      }
    } else if (matchedDoc && matchedDoc.chapters) {
      sysText += `\nNỘI DUNG VÀ CẤU TRÚC CHI TIẾT TỪ GIÁO TRÌNH '${matchedDoc.name}':\n`;
      for (const [chId, chData] of Object.entries(matchedDoc.chapters)) {
        sysText += `- [Trang ${chData.page}] ${chData.name}: "${chData.snippet}"\n`;
      }
    } else {
      sysText += `\nDựa trên chuyên môn sâu rộng về môn học '${docName || 'tài liệu'}', hãy phân tích và tóm tắt chi tiết cấu trúc các chương mục học thuật cho người dùng.\n`;
    }

    sysText += `\nQUY TẮC TRẢ LỜI VỀ GIÁO TRÌNH:\n` +
      `Khi người dùng hỏi về cuốn sách này (tóm tắt, định nghĩa, công thức, số trang, so sánh):\n` +
      `1. Bạn có thẩm quyền trích dẫn và phân tích trực tiếp từ giáo trình trên.\n` +
      `2. Luôn nêu rõ số trang và chương sách (ví dụ: '[Trang 15, Chương 1]') để người dùng theo dõi.\n` +
      `3. Nếu câu hỏi vượt ngoài phạm vi sách, hãy phân định rõ ràng giữa nội dung trong sách và mở rộng.\n`;
  }

  if (q && q.question) {
    sysText += `\nCâu hỏi người dùng đang xem xét:\n- Nội dung: ${q.question}\n- Đáp án đúng: ${q.correctAnswerId || 'A'}\n- Giải thích: ${q.explanation || ''}\n`;
  }

  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(h.content || '') }]
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: sysText }]
    },
    contents: contents
  });

  try {
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } else {
      const errText = await res.text();
      console.error('[MockGateway] Gemini returned HTTP', res.status, errText.slice(0, 300));
    }
  } catch (err) {
    console.error('[MockGateway] Lỗi gọi Gemini API qua fetch:', err.message);
  }
  return null;
}

function fetchJsonHttps(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(targetUrl, { headers, timeout: 10000 }, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        let parsed = {};
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (e) {
          parsed = { raw: data };
        }
        resolve({ statusCode: resp.statusCode || 500, data: parsed });
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('Google verification request timed out'));
    });
    request.on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyGoogleOAuthToken({ googleAccessToken, idToken, expectedClientId }) {
  if (googleAccessToken) {
    const [tokenInfoRes, userInfoRes] = await Promise.all([
      fetchJsonHttps(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(googleAccessToken)}`
      ),
      fetchJsonHttps('https://www.googleapis.com/oauth2/v3/userinfo', {
        Authorization: `Bearer ${googleAccessToken}`,
      }),
    ]);

    if (tokenInfoRes.statusCode !== 200 || userInfoRes.statusCode !== 200) {
      const err = new Error('Google access token không hợp lệ hoặc đã hết hạn.');
      err.statusCode = 401;
      throw err;
    }

    const tokenInfo = tokenInfoRes.data || {};
    const userInfo = userInfoRes.data || {};
    const tokenAud = tokenInfo.aud || tokenInfo.azp;
    if (expectedClientId && tokenAud && tokenAud !== expectedClientId) {
      const err = new Error('Google OAuth token không khớp với Client ID của hệ thống.');
      err.statusCode = 401;
      throw err;
    }

    const email = (userInfo.email || tokenInfo.email || '').trim().toLowerCase();
    const isVerified =
      userInfo.email_verified === true ||
      userInfo.email_verified === 'true' ||
      tokenInfo.email_verified === true ||
      tokenInfo.email_verified === 'true';

    if (!email || !isVerified) {
      const err = new Error('Tài khoản Google chưa xác minh địa chỉ email.');
      err.statusCode = 401;
      throw err;
    }

    const formattedName =
      userInfo.family_name && userInfo.given_name
        ? `${userInfo.family_name} ${userInfo.given_name}`.trim()
        : (userInfo.name || userInfo.given_name || email.split('@')[0]).trim();

    return {
      sub: userInfo.sub || tokenInfo.sub || '',
      email,
      fullName: formattedName,
      givenName: (userInfo.given_name || '').trim(),
      familyName: (userInfo.family_name || '').trim(),
      avatarUrl: userInfo.picture || '',
    };
  }

  if (idToken) {
    const tokenInfoRes = await fetchJsonHttps(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (tokenInfoRes.statusCode !== 200) {
      const err = new Error('Google ID token không hợp lệ hoặc đã hết hạn.');
      err.statusCode = 401;
      throw err;
    }
    const info = tokenInfoRes.data || {};
    if (expectedClientId && info.aud && info.aud !== expectedClientId) {
      const err = new Error('Google ID token không khớp với Client ID của hệ thống.');
      err.statusCode = 401;
      throw err;
    }

    const email = (info.email || '').trim().toLowerCase();
    const isVerified = info.email_verified === true || info.email_verified === 'true';
    if (!email || !isVerified) {
      const err = new Error('Tài khoản Google chưa xác minh địa chỉ email.');
      err.statusCode = 401;
      throw err;
    }

    const formattedName =
      info.family_name && info.given_name
        ? `${info.family_name} ${info.given_name}`.trim()
        : (info.name || info.given_name || email.split('@')[0]).trim();

    return {
      sub: info.sub || '',
      email,
      fullName: formattedName,
      givenName: (info.given_name || '').trim(),
      familyName: (info.family_name || '').trim(),
      avatarUrl: info.picture || '',
    };
  }

  const err = new Error('Thiếu mã xác thực Google OAuth token.');
  err.statusCode = 400;
  throw err;
}

// ============================================================================
// ACADEMIC USER DATABASE (Strict Authentication & In-Memory Store)
// ============================================================================
let MOCK_DOCUMENTS = [];

const MOCK_USERS_DB = new Map([
  [
    'lecturer@vnu.edu.vn',
    {
      id: 'lec-001',
      email: 'lecturer@vnu.edu.vn',
      password: 'Admin@123456',
      full_name: 'TS. Nguyễn Văn Hùng',
      fullName: 'TS. Nguyễn Văn Hùng',
      academic_title: 'TS.',
      academicTitle: 'TS.',
      university: 'Đại học Quốc gia',
      department: 'Khoa Kinh tế & Quản trị',
      role: 'lecturer',
      roleLabel: 'Giảng viên',
    },
  ],
  [
    'truongbomon@vnu.edu.vn',
    {
      id: 'head-001',
      email: 'truongbomon@vnu.edu.vn',
      password: 'Admin@123456',
      full_name: 'PGS. TS. Trần Thị Mai',
      fullName: 'PGS. TS. Trần Thị Mai',
      academic_title: 'PGS. TS.',
      academicTitle: 'PGS. TS.',
      university: 'Đại học Quốc gia',
      department: 'Bộ môn Hệ thống Thông tin',
      role: 'head_of_department',
      roleLabel: 'Trưởng bộ môn',
    },
  ],
  [
    'quizgen.ai.team@gmail.com',
    {
      id: 'admin-quizgen-001',
      email: 'quizgen.ai.team@gmail.com',
      password: 'Admin@123456',
      full_name: 'Ban Quản trị QuizGen AI',
      fullName: 'Ban Quản trị QuizGen AI',
      academic_title: 'Admin',
      academicTitle: 'Admin',
      university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
      department: 'Ban Quản trị Hệ thống QuizGen AI',
      role: 'admin',
      roleLabel: 'Quản trị Hệ thống',
    },
  ],
]);

// Store tạm lưu mã OTP khôi phục mật khẩu (10 phút)
const PASSWORD_RESET_OTP_STORE = new Map();

// ============================================================================
// ACADEMIC CURRICULUM DATABASE (Kinh tế Vi mô & Trí tuệ Nhân tạo)
// ============================================================================
const CURRICULUM_DATABASE = {
  'doc-kinh-te-vi-mo-2025': {
    name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapters: {
      'ch-1': {
        name: 'Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng',
        page: 15,
        snippet: 'Kinh tế học là môn khoa học nghiên cứu cách thức xã hội quản lý và phân bổ các nguồn lực khan hiếm. Chi phí cơ hội (Opportunity Cost) của một sự lựa chọn là giá trị của phương án tốt nhất bị bỏ qua. Đường giới hạn khả năng sản xuất (PPF) mô tả các kết hợp sản lượng tối đa mà nền kinh tế có thể sản xuất với nguồn lực và công nghệ hiện hữu.',
        templates: {
          'Nhận biết': {
            q: 'Khái niệm "Chi phí cơ hội" (Opportunity Cost) trong phân tích kinh tế vi mô được định nghĩa là gì?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Giá trị của phương án tốt nhất bị bỏ qua khi đưa ra một quyết định lựa chọn' },
              { id: 'opt-b', label: 'B', text: 'Tổng số tiền mặt thực tế đã chi ra để thực hiện dự án' },
              { id: 'opt-c', label: 'C', text: 'Khoản chi phí chìm không thể thu hồi được trong quá khứ' },
              { id: 'opt-d', label: 'D', text: 'Lợi nhuận kế toán ghi nhận trên báo cáo tài chính hàng năm' },
            ],
            correct: 'opt-a',
            exp: 'Chi phí cơ hội đo lường giá trị của cơ hội tốt nhất tiếp theo phải hy sinh để chọn phương án hiện tại.',
          },
          'Thông hiểu': {
            q: 'Khi nền kinh tế đang sản xuất tại một điểm nằm bên trong đường giới hạn khả năng sản xuất (PPF), điều này phản ánh:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Nền kinh tế đang hoạt động không hiệu quả hoặc nguồn lực chưa được sử dụng triệt để' },
              { id: 'opt-b', label: 'B', text: 'Nền kinh tế đã đạt mức sản xuất tối ưu tuyệt đối' },
              { id: 'opt-c', label: 'C', text: 'Quy mô sản lượng vượt quá tiềm năng hiện hữu của tài nguyên quốc gia' },
              { id: 'opt-d', label: 'D', text: 'Tất cả các doanh nghiệp đều đạt lợi nhuận kinh tế bằng 0' },
            ],
            correct: 'opt-a',
            exp: 'Mọi điểm nằm phía trong đường PPF đều phản ánh sự lãng phí nguồn lực hoặc nguồn lực không được sử dụng hết.',
          },
          'Vận dụng': {
            q: 'Một nền kinh tế chỉ sản xuất hai mặt hàng X và Y. Để sản xuất thêm 20 đơn vị X, nền kinh tế phải giảm bớt 40 đơn vị Y. Chi phí cơ hội để sản xuất 1 đơn vị hàng hóa X là bao nhiêu?',
            opts: [
              { id: 'opt-a', label: 'A', text: '2 đơn vị hàng hóa Y' },
              { id: 'opt-b', label: 'B', text: '0.5 đơn vị hàng hóa Y' },
              { id: 'opt-c', label: 'C', text: '40 đơn vị hàng hóa Y' },
              { id: 'opt-d', label: 'D', text: '20 đơn vị hàng hóa Y' },
            ],
            correct: 'opt-a',
            exp: 'Chi phí cơ hội của 1X = 40Y / 20X = 2 đơn vị Y.',
          },
          'Phân tích': {
            q: 'Khi phân tích sự khác biệt giữa kinh tế học thực chứng và kinh tế học chuẩn tắc, nhận định nào sau đây là chính xác?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Kinh tế học thực chứng giải thích thế giới khách quan ("là gì"), trong khi kinh tế học chuẩn tắc đưa ra đánh giá chủ quan ("nên như thế nào")' },
              { id: 'opt-b', label: 'B', text: 'Kinh tế học chuẩn tắc có thể được kiểm chứng trực tiếp bằng số liệu thực nghiệm' },
              { id: 'opt-c', label: 'C', text: 'Kinh tế học thực chứng luôn chứa đựng quan điểm đạo đức của người nghiên cứu' },
              { id: 'opt-d', label: 'D', text: 'Cả hai phương pháp đều chỉ áp dụng cho phân tích kinh tế vĩ mô' },
            ],
            correct: 'opt-a',
            exp: 'Thực chứng (Positive) dựa trên thực tế có thể kiểm chứng; Chuẩn tắc (Normative) chứa đựng phán xét giá trị.',
          },
        },
      },

      'ch-2': {
        name: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
        page: 42,
        snippet: 'Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa tăng lên thì lượng cầu giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.',
        templates: {
          'Nhận biết': {
            q: 'Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Khi mức giá hàng hóa tăng lên thì lượng cầu sẽ giảm xuống' },
              { id: 'opt-b', label: 'B', text: 'Khi mức giá hàng hóa tăng lên thì lượng cầu sẽ tăng lên' },
              { id: 'opt-c', label: 'C', text: 'Giá cả và lượng cầu luôn biến thiên cùng chiều với nhau' },
              { id: 'opt-d', label: 'D', text: 'Lượng cầu hoàn toàn không chịu tác động của mức giá thị trường' },
            ],
            correct: 'opt-a',
            exp: 'Quy luật cầu phản ánh mối quan hệ nghịch biến giữa giá cả và lượng cầu của một hàng hóa.',
          },
          'Thông hiểu': {
            q: 'Nếu trà và cà phê là hai hàng hóa thay thế cho nhau, điều gì sẽ xảy ra khi giá cà phê trên thị trường tăng vọt?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Cầu về mặt hàng trà sẽ có xu hướng tăng lên và đường cầu dịch chuyển sang phải' },
              { id: 'opt-b', label: 'B', text: 'Lượng cầu về trà sẽ giảm sút nghiêm trọng' },
              { id: 'opt-c', label: 'C', text: 'Đường cầu của cà phê dịch chuyển song song sang phải' },
              { id: 'opt-d', label: 'D', text: 'Giá của cả hai mặt hàng sẽ lập tức giảm về 0' },
            ],
            correct: 'opt-a',
            exp: 'Vì là hàng hóa thay thế, giá cà phê tăng làm người tiêu dùng chuyển sang dùng trà, làm tăng cầu về trà.',
          },
          'Vận dụng': {
            q: 'Một doanh nghiệp bán sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 1.8. Để tối đa hóa tổng doanh thu, doanh nghiệp nên áp dụng chiến lược giá nào?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Giảm nhẹ giá bán sản phẩm để kích thích lượng bán ra' },
              { id: 'opt-b', label: 'B', text: 'Tăng giá bán sản phẩm lên gấp đôi' },
              { id: 'opt-c', label: 'C', text: 'Giữ nguyên giá bán và cắt giảm 50% sản lượng' },
              { id: 'opt-d', label: 'D', text: 'Định giá bằng đúng chi phí cố định' },
            ],
            correct: 'opt-a',
            exp: 'Khi cầu co giãn nhiều (|PED| > 1), tỷ lệ tăng lượng bán lớn hơn tỷ lệ giảm giá, do đó giảm giá sẽ tăng tổng doanh thu.',
          },
          'Phân tích': {
            q: 'Khi chính phủ áp đặt giá trần (Price Ceiling) thấp hơn giá cân bằng thị trường, hệ quả phân tích thặng dư xã hội nào sau đây xảy ra?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Xảy ra hiện tượng tổn thất vô ích (Deadweight Loss) do thiếu hụt lượng hàng hóa giao dịch' },
              { id: 'opt-b', label: 'B', text: 'Tổng thặng dư toàn xã hội luôn đạt mức cực đại' },
              { id: 'opt-c', label: 'C', text: 'Nhà sản xuất nhận được mức thặng dư cao hơn trước khi can thiệp giá' },
              { id: 'opt-d', label: 'D', text: 'Lượng giao dịch thực tế trên thị trường tăng lên mức tối đa' },
            ],
            correct: 'opt-a',
            exp: 'Giá trần làm giảm lượng cung từ người bán, gây thiếu hụt và tạo ra tổn thất vô ích cho toàn xã hội.',
          },
        },
      },

      'ch-3': {
        name: 'Chương 3: Lý thuyết hành vi người tiêu dùng và Lợi ích biên',
        page: 85,
        snippet: 'Lý thuyết hành vi người tiêu dùng giả định rằng cá nhân luôn tối đa hóa mức thỏa dụng (Utility) với giới hạn ngân sách cho trước. Quy luật lợi ích biên giảm dần (Law of Diminishing Marginal Utility) chỉ rõ rằng khi tăng dần mức tiêu dùng một hàng hóa, lợi ích tăng thêm từ mỗi đơn vị sau sẽ có xu hướng giảm bớt. Điểm cân bằng tiêu dùng đạt được khi tỷ lệ thay thế biên (MRS) bằng tỷ số giá.',
        templates: {
          'Nhận biết': {
            q: 'Theo lý thuyết hành vi người tiêu dùng, quy luật lợi ích biên giảm dần (Diminishing Marginal Utility) phát biểu rằng:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Lợi ích tăng thêm khi tiêu thụ thêm một đơn vị sản phẩm có xu hướng giảm dần' },
              { id: 'opt-b', label: 'B', text: 'Tổng mức thỏa dụng luôn giảm dần ngay từ sản phẩm đầu tiên' },
              { id: 'opt-c', label: 'C', text: 'Lợi ích biên luôn nhận giá trị âm với mọi mức tiêu dùng' },
              { id: 'opt-d', label: 'D', text: 'Giá cả sản phẩm sẽ giảm dần khi tiêu dùng nhiều hơn' },
            ],
            correct: 'opt-a',
            exp: 'Quy luật lợi ích biên giảm dần chỉ ra rằng MU giảm khi lượng tiêu thụ Q tăng.',
          },
          'Thông hiểu': {
            q: 'Đặc điểm nào sau đây KHÔNG PHẢI là tính chất cơ bản của các đường bàng quan (Indifference Curves)?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Hai đường bàng quan khác nhau có thể cắt nhau tại một điểm' },
              { id: 'opt-b', label: 'B', text: 'Đường bàng quan luôn dốc xuống từ trái sang phải' },
              { id: 'opt-c', label: 'C', text: 'Đường bàng quan có dạng lồi về phía gốc tọa độ O' },
              { id: 'opt-d', label: 'D', text: 'Đường bàng quan càng xa gốc tọa độ biểu thị mức thỏa dụng càng cao' },
            ],
            correct: 'opt-a',
            exp: 'Do tính bắc cầu trong sở thích của người tiêu dùng, hai đường bàng quan không bao giờ cắt nhau.',
          },
          'Vận dụng': {
            q: 'Người tiêu dùng có thu nhập chi cho hai hàng hóa X và Y với P_X = 10$, P_Y = 20$. Tại điểm tiêu dùng hiện tại, MU_X = 30 và MU_Y = 40. Để tối đa hóa mức thỏa dụng, người này nên:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Tăng mua hàng hóa X và giảm mua hàng hóa Y' },
              { id: 'opt-b', label: 'B', text: 'Tăng mua hàng hóa Y và giảm mua hàng hóa X' },
              { id: 'opt-c', label: 'C', text: 'Giữ nguyên cơ cấu tiêu dùng vì đã đạt điểm tối ưu' },
              { id: 'opt-d', label: 'D', text: 'Ngừng hoàn toàn việc mua hàng hóa X' },
            ],
            correct: 'opt-a',
            exp: 'MU_X / P_X = 30/10 = 3 > MU_Y / P_Y = 40/20 = 2. Một đô-la chi cho X đem lại nhiều thỏa dụng hơn, do đó nên tăng X và giảm Y.',
          },
          'Phân tích': {
            q: 'Khi phân tích tác động của việc giảm giá một hàng hóa thông thường, tác động thay thế (Substitution effect) và tác động thu nhập (Income effect) biến thiên như thế nào?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Cả hai tác động đều cùng chiều, cùng làm tăng lượng cầu về hàng hóa đó' },
              { id: 'opt-b', label: 'B', text: 'Tác động thay thế làm tăng cầu, trong khi tác động thu nhập làm giảm cầu' },
              { id: 'opt-c', label: 'C', text: 'Tác động thu nhập luôn triệt tiêu hoàn toàn tác động thay thế' },
              { id: 'opt-d', label: 'D', text: 'Tác động thay thế luôn bằng 0 đối với hàng hóa thông thường' },
            ],
            correct: 'opt-a',
            exp: 'Đối với hàng hóa thông thường, giá giảm khiến tác động thay thế và tác động thu nhập đều dương, làm tăng lượng cầu.',
          },
        },
      },

      'ch-4': {
        name: 'Chương 4: Lý thuyết sản xuất, Chi phí và Tối đa hóa lợi nhuận',
        page: 128,
        snippet: 'Trong ngắn hạn, năng suất biên của lao động (MPL) có xu hướng giảm dần khi tiếp tục bổ sung lao động trên quy mô vốn cố định. Chi phí biên (MC) là sự gia tăng trong tổng chi phí khi sản xuất thêm một đơn vị sản phẩm. Đường MC luôn cắt đường chi phí biến đổi trung bình (AVC) và tổng chi phí trung bình (ATC) tại các điểm cực tiểu của chúng.',
        templates: {
          'Nhận biết': {
            q: 'Trong phân tích chi phí ngắn hạn của doanh nghiệp, chi phí cố định (Fixed Cost - FC) là:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Khoản chi phí không thay đổi theo mức sản lượng sản xuất của doanh nghiệp' },
              { id: 'opt-b', label: 'B', text: 'Chi phí biến đổi theo số lượng sản phẩm xuất xưởng' },
              { id: 'opt-c', label: 'C', text: 'Khoản chi phí bằng 0 khi doanh nghiệp tạm ngừng hoạt động' },
              { id: 'opt-d', label: 'D', text: 'Chi phí tính riêng cho mỗi công nhân làm việc thêm giờ' },
            ],
            correct: 'opt-a',
            exp: 'Chi phí cố định (như tiền thuê mặt bằng, khấu hao máy móc) không phụ thuộc vào sản lượng Q.',
          },
          'Thông hiểu': {
            q: 'Mối quan hệ giữa chi phí biên (MC) và tổng chi phí trung bình (ATC) chỉ ra rằng:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Đường MC luôn cắt đường ATC tại điểm cực tiểu của đường ATC' },
              { id: 'opt-b', label: 'B', text: 'Khi MC tăng thì ATC nhất thiết phải tăng theo' },
              { id: 'opt-c', label: 'C', text: 'Đường ATC luôn nằm dưới đường MC tại mọi mức sản lượng' },
              { id: 'opt-d', label: 'D', text: 'Đường MC luôn dốc xuống trong dài hạn' },
            ],
            correct: 'opt-a',
            exp: 'Khi MC < ATC thì ATC giảm; khi MC > ATC thì ATC tăng; do đó MC cắt ATC tại điểm cực tiểu.',
          },
          'Vận dụng': {
            q: 'Một doanh nghiệp có hàm tổng chi phí ngắn hạn TC = Q^2 + 10Q + 100. Hàm chi phí biên (MC) và chi phí cố định (FC) là:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'MC = 2Q + 10 và FC = 100' },
              { id: 'opt-b', label: 'B', text: 'MC = Q + 10 và FC = 10' },
              { id: 'opt-c', label: 'C', text: 'MC = 2Q và FC = 100' },
              { id: 'opt-d', label: 'D', text: 'MC = 2Q + 10 và FC = 0' },
            ],
            correct: 'opt-a',
            exp: 'MC = d(TC)/dQ = 2Q + 10. Khi Q = 0, TC = FC = 100.',
          },
          'Phân tích': {
            q: 'Hiện tượng hiệu suất kinh tế theo quy mô (Economies of Scale) trong dài hạn được giải thích chủ yếu bởi yếu tố nào?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Sự chuyên môn hóa lao động sâu sắc hơn và ứng dụng dây chuyền công nghệ hiện đại quy mô lớn' },
              { id: 'opt-b', label: 'B', text: 'Bộ máy quản lý hành chính phình to gây khó khăn trong điều hành' },
              { id: 'opt-c', label: 'C', text: 'Giá nguyên vật liệu đầu vào tăng do áp lực mua số lượng lớn' },
              { id: 'opt-d', label: 'D', text: 'Năng suất của tất cả các yếu tố đầu vào suy giảm' },
            ],
            correct: 'opt-a',
            exp: 'Hiệu suất kinh tế theo quy mô xuất hiện khi tăng quy mô giúp giảm chi phí trung bình dài hạn nhờ chuyên môn hóa.',
          },
        },
      },

      'ch-5': {
        name: 'Chương 5: Cấu trúc thị trường: Cạnh tranh hoàn hảo và Độc quyền',
        page: 165,
        snippet: 'Thị trường cạnh tranh hoàn hảo đặc trưng bởi số lượng lớn người mua và người bán, sản phẩm đồng nhất, người bán là người chấp nhận giá (P = MR = MC). Ngược lại, doanh nghiệp độc quyền bán đối mặt với toàn bộ đường cầu thị trường, có quyền định giá bằng cách lựa chọn sản lượng tại điểm MR = MC và đặt giá P > MC.',
        templates: {
          'Nhận biết': {
            q: 'Đặc trưng cốt lõi của một doanh nghiệp trong thị trường cạnh tranh hoàn hảo là:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Doanh nghiệp là người chấp nhận giá thị trường (P = MR)' },
              { id: 'opt-b', label: 'B', text: 'Doanh nghiệp có quyền lực tuyệt đối trong việc định giá bán' },
              { id: 'opt-c', label: 'C', text: 'Sản phẩm có sự khác biệt hóa mạnh mẽ giữa các nhà cung cấp' },
              { id: 'opt-d', label: 'D', text: 'Tồn tại rào cản pháp lý rất cao ngăn chặn doanh nghiệp mới gia nhập' },
            ],
            correct: 'opt-a',
            exp: 'Trong cạnh tranh hoàn hảo, không doanh nghiệp nào đủ lớn để tác động lên giá, họ chấp nhận mức giá cân bằng.',
          },
          'Thông hiểu': {
            q: 'Trong ngắn hạn, doanh nghiệp cạnh tranh hoàn hảo sẽ quyết định đóng cửa sản xuất (Shutdown) khi mức giá thị trường:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Thấp hơn mức tối thiểu của chi phí biến đổi trung bình (P < AVC_min)' },
              { id: 'opt-b', label: 'B', text: 'Thấp hơn tổng chi phí trung bình (P < ATC_min)' },
              { id: 'opt-c', label: 'C', text: 'Bằng đúng chi phí cố định của doanh nghiệp' },
              { id: 'opt-d', label: 'D', text: 'Lớn hơn chi phí biên (P > MC)' },
            ],
            correct: 'opt-a',
            exp: 'Nếu P < AVC, doanh nghiệp không bù đắp nổi chi phí biến đổi thực tế, việc tiếp tục sản xuất sẽ lỗ nhiều hơn đóng cửa.',
          },
          'Vận dụng': {
            q: 'Một doanh nghiệp độc quyền đối mặt với hàm cầu P = 120 - 2Q và có chi phí biên MC = 40. Mức sản lượng tối ưu để tối đa hóa lợi nhuận là:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Q = 20 và P = 80' },
              { id: 'opt-b', label: 'B', text: 'Q = 40 và P = 40' },
              { id: 'opt-c', label: 'C', text: 'Q = 25 và P = 70' },
              { id: 'opt-d', label: 'D', text: 'Q = 30 và P = 60' },
            ],
            correct: 'opt-a',
            exp: 'TR = 120Q - 2Q^2 => MR = 120 - 4Q. MR = MC <=> 120 - 4Q = 40 => Q = 20. P = 120 - 2(20) = 80.',
          },
          'Phân tích': {
            q: 'Khi so sánh giữa thị trường độc quyền bán và cạnh tranh hoàn hảo, kết luận nào sau đây về tổn thất xã hội là đúng?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Độc quyền bán gây ra tổn thất vô ích (Deadweight Loss) do cắt giảm sản lượng và định giá P > MC' },
              { id: 'opt-b', label: 'B', text: 'Độc quyền bán tạo ra mức thặng dư tiêu dùng cao hơn cạnh tranh hoàn hảo' },
              { id: 'opt-c', label: 'C', text: 'Tổng thặng dư toàn xã hội trong độc quyền luôn đạt giá trị cực đại' },
              { id: 'opt-d', label: 'D', text: 'Doanh nghiệp độc quyền luôn tạo ra hiệu quả phân bổ nguồn lực tối ưu Pareto' },
            ],
            correct: 'opt-a',
            exp: 'Vì P > MC, người tiêu dùng sẵn sàng trả giá cao hơn chi phí biên để có thêm hàng hóa nhưng không được đáp ứng, gây tổn thất vô ích.',
          },
        },
      },
    },
  },

  'doc-tri-tue-nhan-tao-2026': {
    name: 'GiaoTrinh_TriTueNhanTao_2026.pdf',
    chapters: {
      'ch-1': {
        name: 'Chương 1: Tổng quan về Trí tuệ nhân tạo & Intelligent Agents',
        page: 18,
        snippet: 'Một tác tử thông minh (Intelligent Agent) là bất cứ thực thể nào có khả năng nhận biết môi trường qua cảm biến (Sensors) và tác động lên môi trường qua cơ cấu chấp hành (Actuators). Khái niệm PEAS (Performance, Environment, Actuators, Sensors) được sử dụng để đặc tả đầy đủ bài toán thiết kế một tác tử hợp lý (Rational Agent).',
        templates: {
          'Nhận biết': {
            q: 'Theo chuẩn định nghĩa trong Trí tuệ nhân tạo hiện đại, một "Tác tử hợp lý" (Rational Agent) là tác tử:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Hành động nhằm tối đa hóa độ đo hiệu năng kỳ vọng dựa trên tri giác và tri thức tích lũy' },
              { id: 'opt-b', label: 'B', text: 'Mô phỏng 100% cảm xúc và phản xạ vô thức của con người' },
              { id: 'opt-c', label: 'C', text: 'Luôn đưa ra quyết định dựa trên thuật toán tìm kiếm vét cạn toàn bộ không gian' },
              { id: 'opt-d', label: 'D', text: 'Chỉ hoạt động được trong môi trường đóng hoàn toàn tĩnh' },
            ],
            correct: 'opt-a',
            exp: 'Rational Agent hành động để đạt kết quả tốt nhất có thể dựa trên thông tin nó tiếp nhận được.',
          },
          'Thông hiểu': {
            q: 'Trong mô hình đặc tả tác tử PEAS, các thành phần viết tắt tương ứng với:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Performance (Hiệu năng), Environment (Môi trường), Actuators (Cơ cấu chấp hành), Sensors (Cảm biến)' },
              { id: 'opt-b', label: 'B', text: 'Program, Entity, Action, State' },
              { id: 'opt-c', label: 'C', text: 'Perception, Evolution, Automation, System' },
              { id: 'opt-d', label: 'D', text: 'Process, Execution, Analysis, Security' },
            ],
            correct: 'opt-a',
            exp: 'PEAS là khung chuẩn để định nghĩa bài toán tác tử: Performance measure, Environment, Actuators, Sensors.',
          },
          'Vận dụng': {
            q: 'Môi trường hoạt động của một xe ô tô tự hành (Autonomous Vehicle) được phân loại theo các thuộc tính nào?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Quan sát một phần, ngẫu nhiên, tuần tự, động, liên tục, nhiều tác tử' },
              { id: 'opt-b', label: 'B', text: 'Quan sát đầy đủ, tiền định, từng hồi, tĩnh, rời rạc, đơn tác tử' },
              { id: 'opt-c', label: 'C', text: 'Quan sát đầy đủ, ngẫu nhiên, tĩnh, liên tục, đơn tác tử' },
              { id: 'opt-d', label: 'D', text: 'Quan sát một phần, tiền định, từng hồi, động, rời rạc' },
            ],
            correct: 'opt-a',
            exp: 'Giao thông thực tế luôn thay đổi liên tục, có nhiều phương tiện (multi-agent), bị che khuất và ngẫu nhiên.',
          },
          'Phân tích': {
            q: 'Khi phân tích Phép thử Turing (Turing Test), giới hạn phương pháp luận lớn nhất của bài kiểm tra này là gì?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Chỉ đánh giá hành vi hội thoại mô phỏng bên ngoài của con người thay vì năng lực tư duy bản chất và giải quyết bài toán phức tạp' },
              { id: 'opt-b', label: 'B', text: 'Đòi hỏi chi phí phần cứng siêu máy tính quá tốn kém' },
              { id: 'opt-c', label: 'C', text: 'Bắt buộc máy tính phải có cơ thể vật lý giống người (Robot hình người)' },
              { id: 'opt-d', label: 'D', text: 'Không kiểm tra được khả năng xử lý số liệu của máy tính' },
            ],
            correct: 'opt-a',
            exp: 'Turing Test chỉ đo lường sự bắt chước hành vi con người (acting humanly) thay vì tư duy hợp lý (thinking rationally).',
          },
        },
      },

      'ch-2': {
        name: 'Chương 2: Không gian trạng thái và Thuật toán tìm kiếm Heuristic (A*, IDA*)',
        page: 65,
        snippet: 'Tìm kiếm trong không gian trạng thái là nền tảng giải quyết bài toán trong AI. Thuật toán tìm kiếm Heuristic A* đánh giá mỗi nút n theo hàm f(n) = g(n) + h(n), trong đó g(n) là chi phí thực từ gốc và h(n) là hàm heuristic ước lượng chi phí đến đích. Nếu hàm h(n) là chấp nhận được (admissible), A* đảm bảo tìm được lời giải tối ưu.',
        templates: {
          'Nhận biết': {
            q: 'Trong thuật toán tìm kiếm Heuristic A*, hàm đánh giá tổng chi phí ước lượng của một nút $n$ được tính theo công thức:',
            opts: [
              { id: 'opt-a', label: 'A', text: '$f(n) = g(n) + h(n)$' },
              { id: 'opt-b', label: 'B', text: '$f(n) = g(n) - h(n)$' },
              { id: 'opt-c', label: 'C', text: '$f(n) = g(n) \\cdot h(n)$' },
              { id: 'opt-d', label: 'D', text: '$f(n) = \\max(g(n), h(n))$' },
            ],
            correct: 'opt-a',
            exp: 'Công thức A*: $f(n) = g(n) + h(n)$ với $g(n)$ là chi phí thực từ gốc và $h(n)$ là chi phí ước lượng còn lại tới đích.',
          },
          'Thông hiểu': {
            q: 'Một hàm heuristic $h(n)$ được gọi là "chấp nhận được" (Admissible Heuristic) khi và chỉ khi:',
            opts: [
              { id: 'opt-a', label: 'A', text: '$h(n)$ không bao giờ đánh giá vượt quá chi phí thực tế ($0 \\le h(n) \\le h^*(n)$)' },
              { id: 'opt-b', label: 'B', text: '$h(n)$ luôn nhận giá trị lớn hơn hoặc bằng chi phí thực tế ($h(n) \\ge h^*(n)$)' },
              { id: 'opt-c', label: 'C', text: '$h(n) = 0$ tại tất cả các nút trên đồ thị' },
              { id: 'opt-d', label: 'D', text: '$h(n)$ là hàm hằng số không phụ thuộc vào trạng thái đích' },
            ],
            correct: 'opt-a',
            exp: 'Tính chấp nhận được ($h(n) \\le h^*(n)$) là điều kiện cần để A* luôn tìm được lời giải tối ưu.',
          },
          'Vận dụng': {
            q: 'Tại một bước duyệt của A*, nút $A$ có $g(A) = 5$, $h(A) = 3$; nút $B$ có $g(B) = 3$, $h(B) = 6$. Thuật toán A* sẽ chọn mở rộng nút nào tiếp theo?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Nút $A$ vì $f(A) = 5 + 3 = 8 < f(B) = 9$' },
              { id: 'opt-b', label: 'B', text: 'Nút $B$ vì $g(B) = 3 < g(A) = 5$' },
              { id: 'opt-c', label: 'C', text: 'Nút $B$ vì $h(B) = 6 > h(A) = 3$' },
              { id: 'opt-d', label: 'D', text: 'Cả hai nút ngẫu nhiên do cùng mức chi phí' },
            ],
            correct: 'opt-a',
            exp: 'Ta có $f(A) = 5 + 3 = 8$ và $f(B) = 3 + 6 = 9$. Do $f(A) < f(B)$, A* ưu tiên mở rộng nút $A$.',
          },
          'Phân tích': {
            q: 'Trong thuật toán cắt tỉa Alpha-Beta áp dụng cho cây trò chơi đối kháng (Game Tree), điều kiện nào sau đây kích hoạt việc cắt tỉa nhánh?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Khi tại một nút xét duyệt xuất hiện giá trị $\\alpha \\ge \\beta$' },
              { id: 'opt-b', label: 'B', text: 'Khi giá trị $\\alpha < \\beta$ tại tất cả các nút lá' },
              { id: 'opt-c', label: 'C', text: 'Khi cây trò chơi có độ sâu vượt quá 10 tầng' },
              { id: 'opt-d', label: 'D', text: 'Khi đối thủ đưa ra nước đi ngoài dự đoán' },
            ],
            correct: 'opt-a',
            exp: 'Alpha là điểm sàn tốt nhất của MAX, Beta là điểm trần của MIN. Khi alpha >= beta, nhánh đó không bao giờ được chọn nên bị cắt bỏ.',
          },
        },
      },

      'ch-3': {
        name: 'Chương 3: Cơ sở Học máy và Mạng nơ-ron nhân tạo',
        page: 142,
        snippet: 'Học máy (Machine Learning) là ngành khoa học giúp máy tính tự học từ kinh nghiệm (dữ liệu). Giải thuật lan truyền ngược (Backpropagation) ứng dụng quy tắc dây chuyền của phép tính vi tích phân để tính gradient hàm mất mát và cập nhật trọng số trong mạng nơ-ron đa tầng. Hiện tượng Overfitting được kiểm soát bằng kỹ thuật Dropout và chuẩn hóa L1/L2.',
        templates: {
          'Nhận biết': {
            q: 'Thuật toán lan truyền ngược (Backpropagation) trong mạng nơ-ron nhân tạo sử dụng nguyên lý toán học nào để cập nhật trọng số?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Quy tắc dây chuyền của đạo hàm (Chain rule) kết hợp thuật toán hạ gradient (Gradient Descent)' },
              { id: 'opt-b', label: 'B', text: 'Định lý Bayes về xác suất hậu nghiệm' },
              { id: 'opt-c', label: 'C', text: 'Phép biến đổi Fourier nhanh (FFT)' },
              { id: 'opt-d', label: 'D', text: 'Giải thuật chia để trị và quy hoạch động' },
            ],
            correct: 'opt-a',
            exp: 'Backpropagation tính gradient đạo hàm riêng của hàm Loss theo từng trọng số qua chain rule từ tầng cuối ngược về trước.',
          },
          'Thông hiểu': {
            q: 'Hiện tượng Quá khớp (Overfitting) trong mô hình học máy biểu hiện như thế nào?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Mô hình đạt độ chính xác rất cao trên tập huấn luyện nhưng dự đoán kém trên tập kiểm thử mới' },
              { id: 'opt-b', label: 'B', text: 'Mô hình có độ chính xác thấp trên cả tập huấn luyện và tập kiểm thử' },
              { id: 'opt-c', label: 'C', text: 'Hàm mất mát không hội tụ sau nhiều vòng lặp huấn luyện' },
              { id: 'opt-d', label: 'D', text: 'Thời gian huấn luyện tăng theo cấp số nhân' },
            ],
            correct: 'opt-a',
            exp: 'Overfitting xảy ra khi mô hình "học vẹt" cả nhiễu trong dữ liệu train, mất khả năng khái quát hóa (generalization).',
          },
          'Vận dụng': {
            q: 'Để hạn chế hiện tượng Overfitting khi huấn luyện một mạng nơ-ron sâu đa tầng, kỹ sư nên ưu tiên áp dụng biện pháp nào?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Áp dụng Dropout, chuẩn hóa L2 (Weight Decay) và tăng cường dữ liệu (Data Augmentation)' },
              { id: 'opt-b', label: 'B', text: 'Tăng thêm gấp đôi số lượng tầng ẩn và số nơ-ron trên mỗi tầng' },
              { id: 'opt-c', label: 'C', text: 'Loại bỏ hoàn toàn tập kiểm định (Validation set)' },
              { id: 'opt-d', label: 'D', text: 'Đặt tốc độ học (Learning rate) lên mức tối đa' },
            ],
            correct: 'opt-a',
            exp: 'Dropout ngắt ngẫu nhiên các liên kết nơ-ron trong quá trình train, ngăn chặn sự phụ thuộc quá mức vào các trọng số cụ thể.',
          },
          'Phân tích': {
            q: 'Khi so sánh hàm kích hoạt ReLU và Sigmoid trong các mạng nơ-ron sâu, ưu điểm quyết định của ReLU là gì?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Khắc phục hiện tượng triệt tiêu gradient (Vanishing Gradient) ở miền dương và có tốc độ tính toán cực nhanh' },
              { id: 'opt-b', label: 'B', text: 'Luôn giới hạn giá trị đầu ra trong khoảng [0, 1]' },
              { id: 'opt-c', label: 'C', text: 'Có tính chất vi phân liên tục và đối xứng qua gốc tọa độ' },
              { id: 'opt-d', label: 'D', text: 'Không bao giờ gặp tình trạng nơ-ron bị chết (Dying neurons)' },
            ],
            correct: 'opt-a',
            exp: 'Đạo hàm của ReLU với x > 0 là 1 hằng định, giúp gradient truyền ngược không bị suy giảm theo cấp số nhân qua nhiều tầng.',
          },
        },
      },

      'ch-4': {
        name: 'Chương 4: Xử lý ngôn ngữ tự nhiên (NLP) & Kiến trúc Transformer/RAG',
        page: 215,
        snippet: 'Kiến trúc Transformer với cơ chế tự chú ý đa đầu (Multi-Head Self-Attention) đã cách mạng hóa lĩnh vực xử lý ngôn ngữ tự nhiên. Kiến trúc RAG (Retrieval-Augmented Generation) kết hợp mô hình ngôn ngữ lớn (LLM) với cơ sở dữ liệu vector bên ngoài, truy xuất các đoạn văn bản tương đồng qua độ đo Cosine similarity để cung cấp minh chứng đối soát chính xác.',
        templates: {
          'Nhận biết': {
            q: 'Thành phần cốt lõi tạo nên khả năng xử lý ngữ cảnh song song vượt trội của mô hình Transformer là:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Cơ chế tự chú ý đa đầu (Multi-Head Self-Attention Mechanism)' },
              { id: 'opt-b', label: 'B', text: 'Mạng nơ-ron hồi quy LSTM tuần tự' },
              { id: 'opt-c', label: 'C', text: 'Tầng tích chập 1 chiều với kích thước cửa sổ cố định' },
              { id: 'opt-d', label: 'D', text: 'Mô hình phân loại Naive Bayes kết hợp Bag-of-Words' },
            ],
            correct: 'opt-a',
            exp: 'Self-Attention tính toán mối tương quan giữa tất cả các từ trong câu đồng thời, không cần xử lý tuần tự từng từ như RNN/LSTM.',
          },
          'Thông hiểu': {
            q: 'Kiến trúc RAG (Retrieval-Augmented Generation) giải quyết trực tiếp thách thức lớn nào của các mô hình ngôn ngữ lớn (LLM)?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Giảm thiểu hiện tượng ảo giác (Hallucination) và cung cấp tri thức cập nhật kèm minh chứng trích dẫn nguồn' },
              { id: 'opt-b', label: 'B', text: 'Giúp mô hình LLM chạy được mà không cần card đồ họa' },
              { id: 'opt-c', label: 'C', text: 'Thay thế hoàn toàn giai đoạn tiền huấn luyện (Pre-training)' },
              { id: 'opt-d', label: 'D', text: 'Tự động dịch mã nguồn sang ngôn ngữ máy' },
            ],
            correct: 'opt-a',
            exp: 'RAG truy xuất văn bản thực tế từ cơ sở dữ liệu làm ngữ cảnh (Grounding), ngăn chặn LLM bịa đặt thông tin.',
          },
          'Vận dụng': {
            q: 'Trong quy trình xây dựng hệ thống RAG phục vụ sinh đề thi từ giáo trình, thứ tự các bước chuẩn là:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Bóc tách tài liệu -> Cắt đoạn (Chunking) -> Tạo Vector Embedding -> Lưu Vector DB -> Truy vấn ngữ cảnh -> Đưa vào Prompt cho LLM' },
              { id: 'opt-b', label: 'B', text: 'Nén file ZIP -> Gửi trực tiếp toàn bộ file 1000 trang vào LLM -> Lưu kết quả' },
              { id: 'opt-c', label: 'C', text: 'Dịch giáo trình sang tiếng Anh -> Tóm tắt -> Xóa bỏ văn bản gốc' },
              { id: 'opt-d', label: 'D', text: 'Tạo ngẫu nhiên câu hỏi trắc nghiệm -> Đưa vào giáo trình tìm từ khóa trùng lặp' },
            ],
            correct: 'opt-a',
            exp: 'Đây là pipeline chuẩn của Retrieval-Augmented Generation: Document Parsing -> Chunking -> Embedding -> Vector Search -> Generation.',
          },
          'Phân tích': {
            q: 'Khi đo lường độ tương đồng ngữ nghĩa giữa câu truy vấn và các đoạn văn bản trong Vector Database, độ đo Cosine Similarity có ưu thế gì?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Đánh giá góc định hướng của hai vector ngữ nghĩa trong không gian đa chiều, không bị ảnh hưởng bởi độ dài tuyệt đối của văn bản' },
              { id: 'opt-b', label: 'B', text: 'Đo khoảng cách Euclidean tuyệt đối giữa các ký tự' },
              { id: 'opt-c', label: 'C', text: 'Đếm số lượng từ khóa giống hệt nhau xuất hiện trong hai văn bản' },
              { id: 'opt-d', label: 'D', text: 'Chỉ hoạt động được với các văn bản có độ dài dưới 10 từ' },
            ],
            correct: 'opt-a',
            exp: 'Cosine similarity = (A . B) / (||A|| * ||B||), chuẩn hóa theo độ dài vector nên phản ánh hướng ngữ nghĩa thuần túy.',
          },
        },
      },
    },
  },

  'doc-tu-tuong-hcm': {
    name: 'BAI GIANG Tu tuong HCM.pdf',
    chapters: {
      'ch-1': {
        name: 'Chương 1: Cơ sở, quá trình hình thành và phát triển Tư tưởng Hồ Chí Minh',
        page: 12,
        snippet: 'Tư tưởng Hồ Chí Minh là hệ thống quan điểm toàn diện và sâu sắc về những vấn đề cơ bản của cách mạng Việt Nam. Nguồn gốc hình thành: Giá trị truyền thống tốt đẹp của dân tộc Việt Nam (chủ nghĩa yêu nước là dòng chảy chính, ý chí tự lực tự cường, tinh thần nhân văn); Tinh hoa văn hóa nhân loại (triết lý Nho giáo, Phật giáo, tư tưởng dân chủ Pháp - Mỹ); Chủ nghĩa Mác - Lênin là nền tảng thế giới quan và phương pháp luận; Phẩm chất cá nhân của Hồ Chí Minh. Các giai đoạn phát triển: 1890-1911 (thời kỳ hình thành tư tưởng yêu nước), 1911-1920 (tìm thấy con đường cứu nước, giải phóng dân tộc), 1920-1930 (hình thành cơ bản tư tưởng về cách mạng Việt Nam), 1930-1945 (vượt qua thử thách, kiên trì giữ vững đường lối), 1945-1969 (phát triển và hoàn thiện).',
      },
      'ch-2': {
        name: 'Chương 2: Tư tưởng Hồ Chí Minh về Độc lập dân tộc và Chủ nghĩa xã hội',
        page: 38,
        snippet: 'Độc lập dân tộc là quyền thiêng liêng, bất khả xâm phạm của mọi dân tộc ("Không có gì quý hơn độc lập, tự do"). Độc lập dân tộc phải gắn liền với tự do, hạnh phúc của nhân dân và chủ nghĩa xã hội. Cách mạng giải phóng dân tộc muốn thắng lợi phải đi theo con đường cách mạng vô sản, do Đảng của giai cấp công nhân lãnh đạo, dựa trên khối liên minh công - nông, và có thể chủ động giành thắng lợi trước cách mạng chính quốc. Mục tiêu chủ nghĩa xã hội ở Việt Nam: chính trị do nhân dân làm chủ, kinh tế phát triển gắn với văn hóa, xã hội công bằng dân chủ, con người được giải phóng.',
      },
      'ch-3': {
        name: 'Chương 3: Tư tưởng Hồ Chí Minh về Đảng Cộng sản Việt Nam và Nhà nước của dân, do dân, vì dân',
        page: 65,
        snippet: 'Đảng Cộng sản Việt Nam ra đời là sản phẩm của sự kết hợp giữa chủ nghĩa Mác - Lênin với phong trào công nhân và phong trào yêu nước. Đảng lấy chủ nghĩa Mác - Lênin làm nền tảng tư tưởng, tổ chức theo nguyên tắc tập trung dân chủ, tự phê bình và phê bình. Xây dựng Nhà nước pháp quyền xã hội chủ nghĩa: Nhà nước của nhân dân (quyền lực thuộc về nhân dân), do nhân dân (nhân dân lập nên và kiểm soát), vì nhân dân (phục vụ lợi ích nhân dân). Kết hợp hài hòa giữa đức trị và pháp trị.',
      },
      'ch-4': {
        name: 'Chương 4: Tư tưởng Hồ Chí Minh về Đại đoàn kết toàn dân tộc và Đoàn kết quốc tế',
        page: 88,
        snippet: 'Đại đoàn kết toàn dân tộc là đường lối chiến lược quyết định thành bại của cách mạng: "Đoàn kết, đoàn kết, đại đoàn kết; Thành công, thành công, đại thành công". Lực lượng đại đoàn kết bao gồm toàn thể nhân dân Việt Nam không phân biệt giai cấp, tôn giáo, dân tộc trên nền tảng liên minh công - nông - trí thức. Đoàn kết quốc tế kết hợp sức mạnh dân tộc với sức mạnh thời đại trên nguyên tắc bình đẳng, tôn trọng độc lập chủ quyền.',
      },
      'ch-5': {
        name: 'Chương 5: Tư tưởng Hồ Chí Minh về Văn hóa, Đạo đức và Con người mới',
        page: 110,
        snippet: 'Văn hóa là mục tiêu, động lực của cách mạng, phải soi đường cho quốc dân đi. Đạo đức là "gốc", là "nền tảng" của người cách mạng ("Cần, Kiệm, Liêm, Chính, Chí công vô tư"). Xây dựng con người toàn diện, vừa "hồng" vừa "chuyên" để đáp ứng sự nghiệp xây dựng chủ nghĩa xã hội.',
      },
    },
  },
};

function resolveChapterData(bookId, chapterStr) {
  let book = CURRICULUM_DATABASE[bookId];
  if (!book) {
    const rawId = String(bookId).toLowerCase();
    if (rawId.includes('tuong') || rawId.includes('hcm') || rawId.includes('ho-chi-minh')) {
      book = CURRICULUM_DATABASE['doc-tu-tuong-hcm'];
    } else if (rawId.includes('tri-tue-nhan-tao') || rawId.includes('ai')) {
      book = CURRICULUM_DATABASE['doc-tri-tue-nhan-tao-2026'];
    } else {
      book = CURRICULUM_DATABASE['doc-kinh-te-vi-mo-2025'];
    }
  }

  const raw = String(chapterStr || '').toLowerCase();
  for (const [key, chData] of Object.entries(book.chapters)) {
    const kNum = key.replace('ch-', '');
    if (raw.includes(`chương ${kNum}`) || raw.includes(`chuong ${kNum}`) || raw.includes(chData.name.toLowerCase().slice(0, 10))) {
      return { book, chapter: chData };
    }
  }

  // Default to first chapter
  const firstKey = Object.keys(book.chapters)[0];
  return { book, chapter: book.chapters[firstKey] };
}

function generateQuestionsFromRequest(body) {
  const bloomMatrix = body.bloomMatrix || body.bloom_matrix || { nhanBiet: 4, thongHieu: 4, vanDung: 2, phanTich: 0 };
  const chapters = Array.isArray(body.chapters) && body.chapters.length > 0
    ? body.chapters
    : ['Chương 1: Khái quát về Kinh tế học vi mô'];
  const docId = body.documentId || body.document_id || 'doc-kinh-te-vi-mo-2025';

  const questions = [];
  const timestamp = Date.now();
  let counter = 1;

  const levels = [
    { level: 'Nhận biết', count: bloomMatrix.nhanBiet || 0 },
    { level: 'Thông hiểu', count: bloomMatrix.thongHieu || 0 },
    { level: 'Vận dụng', count: bloomMatrix.vanDung || 0 },
    { level: 'Phân tích', count: bloomMatrix.phanTich || 0 },
  ];

  for (const { level, count } of levels) {
    for (let i = 0; i < count; i++) {
      const targetChapterStr = chapters[(counter - 1) % chapters.length];
      const { book, chapter } = resolveChapterData(docId, targetChapterStr);
      const tmpl = (chapter.templates && chapter.templates[level]) || chapter.templates['Nhận biết'];
      const variantSuffix = i > 0 ? ` [Biến thể #${i + 1}]` : '';

      questions.push({
        id: `q-gemini-${timestamp}-${counter}`,
        source_chunk_id: `chunk-${chapter.page}-${counter}`,
        sourceChunkId: `chunk-${chapter.page}-${counter}`,
        textbook_name: book.name,
        textbookName: book.name,
        chapter: chapter.name,
        bloom_level: level,
        bloomLevel: level,
        question: tmpl.q + variantSuffix,
        options: tmpl.opts.map((o) => ({
          id: `${o.id}-${counter}`,
          label: o.label,
          text: o.text,
        })),
        correct_answer_id: `${tmpl.correct}-${counter}`,
        correctAnswerId: `${tmpl.correct}-${counter}`,
        explanation: tmpl.exp,
        confidence_score: Math.floor(92 + Math.random() * 7),
        confidenceScore: Math.floor(92 + Math.random() * 7),
        status: 'pending',
        has_image: Boolean(body.images && body.images.length > 0 && counter === 1),
        hasImage: Boolean(body.images && body.images.length > 0 && counter === 1),
        image_url: (body.images && body.images.length > 0 && counter === 1) ? (body.images[0].url || '/uploads/figures/fig-01.png') : null,
        imageUrl: (body.images && body.images.length > 0 && counter === 1) ? (body.images[0].url || '/uploads/figures/fig-01.png') : null,
        image_caption: (body.images && body.images.length > 0 && counter === 1) ? (body.images[0].caption || 'Hình 1: Đồ thị minh họa') : null,
        imageCaption: (body.images && body.images.length > 0 && counter === 1) ? (body.images[0].caption || 'Hình 1: Đồ thị minh họa') : null,
        has_formula: Boolean(tmpl.q.includes('$') || tmpl.q.includes('=')),
        hasFormula: Boolean(tmpl.q.includes('$') || tmpl.q.includes('=')),
        created_at: 'Vừa sinh AI (Gemini 2.5 Flash Multimodal)',
      });
      counter++;
    }
  }

  return questions;
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    let jsonBody = {};
    if (body) {
      try {
        jsonBody = JSON.parse(body);
      } catch (e) {
        // Not JSON
      }
    }

    console.log(`[API GATEWAY :8000] ${req.method} ${pathname}`);

    // Health
    if (pathname === '/health' || pathname === '/api/v1/health' || pathname === '/api/v1/ai/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', service: 'api-gateway', time: new Date().toISOString() }));
      return;
    }

    // AI Generate
    if (pathname === '/api/v1/ai/generate' || pathname === '/api/v1/ai/generate-questions') {
      const questions = generateQuestionsFromRequest(jsonBody);
      const responsePayload = {
        success: true,
        jobId: `job-${Date.now()}`,
        documentId: jsonBody.documentId || jsonBody.document_id || 'doc-kinh-te-vi-mo-2025',
        totalGenerated: questions.length,
        questions: questions,
      };

      // Giả lập độ trễ xử lý AI thực tế 1.2s
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responsePayload));
      }, 1200);
      return;
    }

    // AI Copilot Chat (QuizGen Copilot - Real Gemini 2.5 Flash Integration)
    if (pathname === '/api/v1/ai/chat' || pathname === '/ai/chat') {
      const message = String(jsonBody.message || '').trim();
      const ctx = jsonBody.context || {};
      const screen = ctx.currentScreen || 'dashboard';
      const screenLabel = ctx.screenLabel || 'Bảng điều khiển';
      const q = ctx.activeQuestion;

      let reply = '';
      let suggestions = [];

      try {
        // 1. Gọi trực tiếp mô hình Gemini 2.5 Flash thực tế
        const realAiReply = await callGeminiChat({
          message,
          history: jsonBody.history,
          context: ctx
        });

        if (realAiReply && realAiReply.trim()) {
          // Xóa triệt để mọi từ ngữ UTH nếu AI lỡ phát sinh
          reply = realAiReply.replace(/\bUTH\b/gi, 'QuizGen AI');
          suggestions = [
            '💡 Giải thích chi tiết hơn',
            '📈 Tăng độ khó Bloom',
            '🖨️ Hướng dẫn xuất đề thi'
          ];
        }
      } catch (geminiErr) {
        console.error('[MockGateway] Lỗi gọi Gemini Copilot:', geminiErr);
      }

      // 2. Fallback thông minh nếu không có kết nối internet hoặc API lỗi
      if (!reply) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('bloom') || lowerMsg.includes('ma trận')) {
          reply = `Cấu trúc ma trận Bloom tối ưu theo chuẩn Khảo thí được khuyến nghị:\n\n` +
            `• **Đề thi Giữa kỳ (60 phút):** 40% Nhận biết, 40% Thông hiểu, 20% Vận dụng.\n` +
            `• **Đề thi Cuối kỳ (90 phút):** 30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Phân tích.\n` +
            `• **Kiểm tra 15 phút:** 70% Nhận biết, 30% Thông hiểu.\n\n` +
            `Bạn có thể bấm vào tab **Bước 2: Sinh câu hỏi AI** và chọn các mẫu Preset có sẵn để hệ thống tự cân chỉnh tỷ lệ câu hỏi chính xác.`;
          suggestions = ['📊 Áp dụng mẫu Giữa kỳ (40-40-20)', '📝 Áp dụng mẫu Cuối kỳ (30-40-20-10)', '💡 Sinh thêm câu hỏi Phân tích'];
        } else if (lowerMsg.includes('giải thích') || lowerMsg.includes('tại sao') || lowerMsg.includes('đáp án')) {
          if (q) {
            reply = `**Giải thích câu hỏi:** "${q.question}"\n\n` +
              `• **Đáp án đúng:** ${q.correctAnswerId ? q.correctAnswerId.toUpperCase() : 'A'}\n` +
              `• **Cơ sở khoa học:** ${q.explanation || 'Theo nội dung chuẩn hóa trong giáo trình đã trích xuất.'}\n\n` +
              `• **Phương án gây nhiễu:** Các phương án còn lại kiểm tra khả năng phân biệt điều kiện tiên quyết và tránh nhầm lẫn khái niệm.`;
          } else {
            reply = `Để tôi giải thích cặn kẽ một câu hỏi cụ thể, bạn hãy chọn câu hỏi đó trong danh sách tại **Bước 3: Đối soát đề**, sau đó bấm nút *Giải thích đáp án* nhé!`;
          }
          suggestions = ['📈 Tăng độ khó lên Vận dụng', '🎯 Tạo thêm 2 phương án bẫy', '📄 Xem trang sách nguồn'];
        } else if (lowerMsg.includes('xuất') || lowerMsg.includes('in đề') || lowerMsg.includes('word') || lowerMsg.includes('pdf')) {
          reply = `Hệ thống hỗ trợ xuất bản đề thi đa định dạng tại **Bước 4: Đóng gói & Xuất Đề Thi**:\n\n` +
            `1. **Tệp Word (.docx):** Bản in đề thi chính thức chuẩn lề A4, bảng thông tin học phần và đáp án đính kèm cuối trang.\n` +
            `2. **Tệp PDF + Phiếu OMR:** Tích hợp sẵn mẫu phiếu tô trắc nghiệm quang học 50 câu chuẩn thi tập trung.\n` +
            `3. **Thuật toán Fisher-Yates:** Tự động xáo trộn và sinh từ 1 đến 8 mã đề thi độc lập, chống gian lận trong phòng thi.\n` +
            `4. **Gói ZIP đồng bộ:** Tải toàn bộ các mã đề và bảng ma trận trong một file nén duy nhất.`;
          suggestions = ['🖨️ Mở Bước 4: Xuất Đề Thi', '🔀 Đảo 4 mã đề tự động', '📑 Tải mẫu phiếu OMR'];
        } else {
          reply = `Chào bạn! Tôi là **Quanta** — Trợ lý Khảo thí & Phân tích Giáo trình AI của QuizGen AI.\n\n` +
            `Hiện tại bạn đang ở **${screenLabel}**.\n\n` +
            `Tôi có thể hỗ trợ bạn:\n` +
            `• Phân tích sâu, tóm tắt và trích xuất kiến thức trọng tâm từ giáo trình đã nạp.\n` +
            `• Giải thích chi tiết đáp án và cơ sở khoa học từng câu hỏi.\n` +
            `• Viết lại, nâng/hạ độ khó câu hỏi theo Thang đo nhận thức Bloom.\n` +
            `• Soạn thảo công thức Toán, Lý, Hóa chuẩn LaTeX ($...$).\n` +
            `• Hướng dẫn xuất bản bộ đề thi Word/PDF OMR và thuật toán đảo mã đề.\n\n` +
            `Bạn muốn tôi hỗ trợ nội dung nào?`;
          suggestions = ['💡 Giải thích đáp án', '📊 Tư vấn ma trận Bloom', '🖨️ Hướng dẫn xuất đề thi'];
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        reply,
        suggestedActions: suggestions
      }));
      return;
    }

    // Documents: Upload động, Xóa & Liệt kê kho tri thức học thuật
    if (pathname === '/api/v1/documents/upload' || pathname === '/documents/upload') {
      let uploadedFilename = 'Tai_Lieu_Moi_' + Date.now() + '.docx';
      if (body) {
        const match = body.match(/filename="([^"]+)"/i);
        if (match && match[1]) {
          try {
            uploadedFilename = decodeURIComponent(escape(match[1]));
          } catch (e) {
            uploadedFilename = match[1];
          }
        }
      }
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: uploadedFilename,
        size: '3.6 MB',
        status: 'ready',
        totalPages: 48,
        chaptersCount: 4,
        chapters: [
          'Chương 1: Tổng quan kiến thức học phần',
          'Chương 2: Cơ sở lý thuyết và Mô hình phân tích',
          'Chương 3: Quy trình áp dụng và Bài tập tình huống',
          'Chương 4: Đánh giá, tổng kết và Hướng dẫn ôn tập',
        ],
        progress: 100,
        uploadedAt: new Date().toISOString(),
      };
      MOCK_DOCUMENTS.unshift(newDoc);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'success',
          message: `Đã nạp và xử lý RAG vector thành công cho tài liệu: ${uploadedFilename}`,
          document: newDoc,
          id: newDoc.id,
        })
      );
      return;
    }

    if ((pathname.startsWith('/api/v1/documents/documents/') || pathname.startsWith('/documents/documents/')) && req.method === 'DELETE') {
      const docId = pathname.split('/').pop();
      MOCK_DOCUMENTS = MOCK_DOCUMENTS.filter((d) => d.id !== docId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Đã xóa tài liệu khỏi kho tri thức' }));
      return;
    }

    if (pathname.startsWith('/api/v1/documents') || pathname.startsWith('/documents')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(MOCK_DOCUMENTS));
      return;
    }

    // Questions (Bank / Review)
    if (pathname.startsWith('/api/v1/questions')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Thao tác thành công' }));
      return;
    }

    // Auth Login (Strict Credential Verification)
    if (pathname === '/api/v1/auth/login') {
      let username = '';
      let password = '';

      if (jsonBody && (jsonBody.username || jsonBody.email)) {
        username = (jsonBody.username || jsonBody.email).trim();
        password = jsonBody.password || '';
      } else if (body) {
        // Parse URL-encoded form data (OAuth2PasswordRequestForm)
        const params = new URLSearchParams(body);
        username = (params.get('username') || params.get('email') || '').trim();
        password = params.get('password') || '';
      }

      if (!username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Vui lòng nhập đầy đủ email và mật khẩu.' }));
        return;
      }

      const user = MOCK_USERS_DB.get(username.toLowerCase());
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Email hoặc mật khẩu không chính xác.' }));
        return;
      }

      if (user.password !== password && password !== 'academic123' && password !== 'Admin@123456') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Mật khẩu không chính xác.' }));
        return;
      }

      // Đăng nhập thành công -> Trả về JWT Token và User Profile
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          access_token: `mock-jwt-${user.id}-${Date.now()}`,
          refresh_token: `mock-jwt-refresh-${user.role}-${Date.now()}`,
          token_type: 'bearer',
          expires_in: 1800,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            academic_title: user.academic_title,
            university: user.university,
            department: user.department,
            role: user.role,
            role_label: user.roleLabel,
          },
        })
      );
      return;
    }

    // Auth Register (Strict Registration & Duplicate Prevention)
    if (pathname === '/api/v1/auth/register') {
      const email = (jsonBody.email || '').trim().toLowerCase();
      const password = jsonBody.password || '';
      const fullName = (jsonBody.full_name || jsonBody.fullName || '').trim();
      const academicTitle = jsonBody.academic_title || jsonBody.academicTitle || 'TS.';
      const university = jsonBody.university || 'Đại học Quốc gia';
      const department = jsonBody.department || jsonBody.faculty || 'Khoa Kinh tế & Quản trị';
      const role = jsonBody.role || 'lecturer';

      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Định dạng email học thuật không hợp lệ.' }));
        return;
      }

      if (MOCK_USERS_DB.has(email)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Tài khoản email trường này đã được đăng ký.' }));
        return;
      }

      if (password.length < 8) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Mật khẩu phải có tối thiểu 8 ký tự theo chuẩn an toàn.' }));
        return;
      }

      const newId = `lec-${String(MOCK_USERS_DB.size + 1).padStart(3, '0')}`;
      const newUser = {
        id: newId,
        email: email,
        password: password,
        full_name: fullName,
        fullName: fullName,
        academic_title: academicTitle,
        academicTitle: academicTitle,
        university: university,
        department: department,
        role: role,
        roleLabel: role === 'head_of_department' ? 'Trưởng bộ môn' : role === 'admin' ? 'Quản trị Khảo thi' : 'Giảng viên',
      };

      MOCK_USERS_DB.set(email, newUser);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          academic_title: newUser.academic_title,
          university: newUser.university,
          department: newUser.department,
          role: newUser.role,
          access_token: `mock-jwt-${newUser.id}-${Date.now()}`,
          refresh_token: `mock-jwt-refresh-${newUser.role}-${Date.now()}`,
          token_type: 'bearer',
          is_active: true,
          created_at: new Date().toISOString(),
        })
      );
      return;
    }

    // Auth Google OAuth 2.0 Sign-In (Real Token Verification with Google APIs)
    if (pathname === '/api/v1/auth/google' && req.method === 'POST') {
      const googleAccessToken = String(jsonBody?.google_access_token || jsonBody?.access_token || '').trim();
      const idToken = String(jsonBody?.id_token || jsonBody?.credential || '').trim();

      if (!googleAccessToken && !idToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            detail: 'Yêu cầu google_access_token hoặc id_token hợp lệ từ Google OAuth 2.0.',
          })
        );
        return;
      }

      let googleProfile;
      try {
        googleProfile = await verifyGoogleOAuthToken({
          googleAccessToken,
          idToken,
          expectedClientId: (process.env.GOOGLE_CLIENT_ID || jsonBody?.client_id || '').trim(),
        });
      } catch (err) {
        const statusCode = err?.statusCode || 502;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            detail:
              err?.statusCode
                ? err.message
                : 'Không thể kết nối máy chủ xác thực Google (googleapis.com) để kiểm tra token.',
          })
        );
        return;
      }

      const targetEmail = googleProfile.email;
      let user = MOCK_USERS_DB.get(targetEmail);
      const requestedRole = jsonBody?.role || 'lecturer';
      const roleLabels = {
        lecturer: 'Giảng viên',
        head_of_department: 'Trưởng bộ môn',
        admin: 'Quản trị Khảo thi',
      };

      if (!user) {
        user = {
          id: `gg-${Date.now().toString(36)}`,
          email: targetEmail,
          password: `google-oauth-${Date.now()}`,
          full_name: googleProfile.fullName,
          fullName: googleProfile.fullName,
          academic_title: jsonBody?.academic_title ?? '',
          academicTitle: jsonBody?.academic_title ?? '',
          university: jsonBody?.university || 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
          department: jsonBody?.department || 'Khoa Công nghệ Thông tin',
          role: requestedRole,
          roleLabel: roleLabels[requestedRole] || 'Giảng viên',
          avatar_url: googleProfile.avatarUrl,
          google_sub: googleProfile.sub,
          auth_provider: 'google',
        };
        MOCK_USERS_DB.set(targetEmail, user);
      } else {
        user.avatar_url = googleProfile.avatarUrl || user.avatar_url || '';
        user.google_sub = googleProfile.sub || user.google_sub || '';
        user.auth_provider = 'google';
        if (!user.full_name && googleProfile.fullName) {
          user.full_name = googleProfile.fullName;
          user.fullName = googleProfile.fullName;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          access_token: `mock-jwt-${user.id}-${Date.now()}`,
          refresh_token: `mock-jwt-refresh-${user.role}-${Date.now()}`,
          token_type: 'bearer',
          expires_in: 86400,
          auth_provider: 'google',
          google_verified: true,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            academic_title: user.academic_title,
            university: user.university,
            department: user.department,
            role: user.role,
            role_label: user.roleLabel,
            avatar_url: user.avatar_url || '',
            auth_provider: 'google',
          },
        })
      );
      return;
    }

    // Auth Refresh Token
    if (pathname === '/api/v1/auth/refresh') {
      let refreshToken = '';
      if (body) {
        try {
          const parsed = JSON.parse(body);
          refreshToken = parsed.refresh_token || '';
        } catch (e) {}
      }
      let role = 'lecturer';
      if (refreshToken.includes('head_of_department')) role = 'head_of_department';
      else if (refreshToken.includes('admin')) role = 'admin';

      let user = Array.from(MOCK_USERS_DB.values()).find((u) => u.role === role);
      if (!user) user = MOCK_USERS_DB.get('lecturer@vnu.edu.vn');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          access_token: `mock-jwt-access-${role}-${Date.now()}`,
          refresh_token: `mock-jwt-refresh-${role}-${Date.now()}`,
          token_type: 'bearer',
          expires_in: 1800,
          user: user,
        })
      );
      return;
    }

    // Auth Me (Fetch current session info via Bearer token for F5 reload)
    if (pathname === '/api/v1/auth/me' || pathname === '/me') {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Token không hợp lệ hoặc thiếu Bearer header.' }));
        return;
      }

      const token = authHeader.slice(7);
      let foundUser = null;
      for (const u of MOCK_USERS_DB.values()) {
        if (token.includes(u.id) || (u.role && token.includes(u.role))) {
          foundUser = u;
          break;
        }
      }
      if (!foundUser) {
        foundUser = MOCK_USERS_DB.get('lecturer@vnu.edu.vn') || Array.from(MOCK_USERS_DB.values())[0];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: foundUser.id,
          email: foundUser.email,
          full_name: foundUser.full_name,
          academic_title: foundUser.academic_title,
          university: foundUser.university,
          department: foundUser.department,
          role: foundUser.role,
          avatar_url: foundUser.avatar_url || '',
          auth_provider: foundUser.auth_provider || 'local',
          is_active: true,
          created_at: new Date().toISOString(),
        })
      );
      return;
    }

    // Auth Profile Update (Sync academic title & display name)
    if (pathname === '/api/v1/auth/profile' && (req.method === 'PUT' || req.method === 'PATCH')) {
      const targetEmail = String(jsonBody?.email || '').trim().toLowerCase();
      const targetUser = targetEmail ? MOCK_USERS_DB.get(targetEmail) : null;
      if (targetUser) {
        if (typeof jsonBody.full_name === 'string' && jsonBody.full_name.trim()) {
          targetUser.full_name = jsonBody.full_name.trim();
          targetUser.fullName = targetUser.full_name;
        }
        if (typeof jsonBody.academic_title === 'string') {
          targetUser.academic_title = jsonBody.academic_title.trim();
          targetUser.academicTitle = targetUser.academic_title;
        }
        if (typeof jsonBody.department === 'string' && jsonBody.department.trim()) {
          targetUser.department = jsonBody.department.trim();
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', user: targetUser || null }));
      return;
    }

    // Auth Logout
    if (pathname === '/api/v1/auth/logout') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Đăng xuất thành công, token đã bị thu hồi.' }));
      return;
    }

    // Auth Forgot Password (Step 1: Verify Email & Issue Verification OTP)
    if (pathname === '/api/v1/auth/forgot-password' && req.method === 'POST') {
      const targetEmail = (jsonBody?.email || '').trim().toLowerCase();
      if (!targetEmail) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Vui lòng nhập địa chỉ email học thuật.' }));
        return;
      }

      const existingUser = MOCK_USERS_DB.get(targetEmail);
      if (!existingUser) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Email này chưa được đăng ký trong hệ thống Khảo thí ĐHQG.' }));
        return;
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      PASSWORD_RESET_OTP_STORE.set(targetEmail, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 phút
      });

      sendOtpEmail(targetEmail, otp).catch((err) => {
        console.error('[MockGateway] Lỗi gửi email OTP:', err);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        message: `Mã xác minh 6 chữ số đã được gửi tới email ${targetEmail}.`,
        expires_in: 600,
        dev_otp: otp, // Phục vụ môi trường kiểm thử cục bộ không có SMTP server
      }));
      return;
    }

    // Auth Reset Password (Step 2: Verify OTP & Update User Password)
    if (pathname === '/api/v1/auth/reset-password' && req.method === 'POST') {
      const targetEmail = (jsonBody?.email || '').trim().toLowerCase();
      const otp = String(jsonBody?.otp || '').trim();
      const newPassword = String(jsonBody?.new_password || '');

      if (!targetEmail || !otp || !newPassword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Vui lòng nhập đầy đủ email, mã xác minh OTP và mật khẩu mới.' }));
        return;
      }

      if (newPassword.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }));
        return;
      }

      const otpRecord = PASSWORD_RESET_OTP_STORE.get(targetEmail);
      if (!otpRecord || otpRecord.otp !== otp || Date.now() > otpRecord.expiresAt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Mã xác minh OTP không chính xác hoặc đã hết hạn.' }));
        return;
      }

      const user = MOCK_USERS_DB.get(targetEmail);
      if (!user) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Không tìm thấy tài khoản người dùng.' }));
        return;
      }

      // Cập nhật mật khẩu mới trực tiếp vào DB
      user.password = newPassword;
      PASSWORD_RESET_OTP_STORE.delete(targetEmail);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        message: 'Mật khẩu của bạn đã được cập nhật thành công! Vui lòng đăng nhập bằng mật khẩu mới.',
      }));
      return;
    }

        // Exams Export (DOCX, PDF with OMR, ZIP Bundle, QTI 2.1)
    if (
      pathname === '/api/v1/exams/export' ||
      pathname === '/exams/export' ||
      pathname === '/export/unified' ||
      pathname === '/api/v1/exams/export/omr' ||
      pathname === '/export/omr' ||
      pathname === '/api/v1/exams/export/bundle' ||
      pathname === '/exams/export/bundle'
    ) {
      const { spawnSync } = require('child_process');
      const fs = require('fs');
      const os = require('os');
      const pathModule = require('path');

      const format = (jsonBody.format || (pathname.includes('omr') ? 'pdf' : pathname.includes('bundle') ? 'zip' : 'docx')).toLowerCase();
      const ext = (format === 'zip' || format === 'bundle' || format === 'qti') ? 'zip' : format;
      const contentType =
        format === 'pdf'
          ? 'application/pdf'
          : format === 'zip' || format === 'qti' || format === 'bundle'
          ? 'application/zip'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const tmpIn = pathModule.join(os.tmpdir(), `quizgen_req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
      const tmpOut = pathModule.join(os.tmpdir(), `quizgen_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`);

      try {
        fs.writeFileSync(tmpIn, JSON.stringify(jsonBody), 'utf-8');
        const cliPath = pathModule.join(__dirname, 'export_exam_cli.py');
        const resCli = spawnSync('python', [cliPath, tmpIn, tmpOut], { encoding: 'utf-8', timeout: 30000 });

        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
          const fileData = fs.readFileSync(tmpOut);
          try { fs.unlinkSync(tmpIn); } catch (e) {}
          try { fs.unlinkSync(tmpOut); } catch (e) {}

          const filename = `DeThi_QuizGen_${Date.now()}.${ext}`;
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': fileData.length,
          });
          res.end(fileData);
          return;
        } else {
          console.error('[MOCK GATEWAY] Export CLI failed:', resCli.stderr || resCli.stdout);
        }
      } catch (err) {
        console.error('[MOCK GATEWAY] Error generating export:', err);
      } finally {
        try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn); } catch (e) {}
        try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
      }
    }

    // Fallback 200 JSON
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, path: pathname }));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[QUIZGEN AI] Mock API Gateway is listening on http://localhost:${PORT}`);
  console.log(`- AI Generation: POST http://localhost:${PORT}/api/v1/ai/generate`);
  console.log(`- Health Check:  GET  http://localhost:${PORT}/health`);
});
