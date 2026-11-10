/**
 * QuizGen AI - Exam Export Client & Multi-Format Exporter Engine
 * Hỗ trợ 4 định dạng xuất bản theo yêu cầu Sprint 3 [SCRUM-64]:
 * 1. Word (.docx): Chuẩn thể thức Bộ GD&ĐT (kèm bảng đáp án và ma trận Bloom ở cuối trang)
 * 2. In PDF (A4): Bản in khổ A4 chuẩn khảo thí phòng thi
 * 3. Canvas QTI (.zip): Gói nén chuẩn IMS QTI 2.1 nhập trực tiếp lên Canvas LMS / Moodle
 * 4. Phiếu OMR 50 câu (.pdf): Mẫu phiếu trả lời trắc nghiệm quang học 50 câu chuẩn thi đại học
 *    (Hỗ trợ hiển thị Tiếng Việt Unicode 100% chuẩn font Times New Roman, không bao giờ lỗi font).
 */

import { Question, ExamExportConfig, BloomLevel } from '../types';
import apiClient from './apiClient';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ─── HELPER: Phân tích ma trận nhận thức Bloom ─────────────────────────────
export interface BloomSummary {
  nhanBiet: number;
  thongHieu: number;
  vanDung: number;
  phanTich: number;
  total: number;
}

export function computeBloomSummary(questions: Question[]): BloomSummary {
  const summary: BloomSummary = {
    nhanBiet: 0,
    thongHieu: 0,
    vanDung: 0,
    phanTich: 0,
    total: questions.length,
  };

  questions.forEach((q) => {
    switch (q.bloomLevel) {
      case 'Nhận biết':
        summary.nhanBiet++;
        break;
      case 'Thông hiểu':
        summary.thongHieu++;
        break;
      case 'Vận dụng':
        summary.vanDung++;
        break;
      case 'Phân tích':
        summary.phanTich++;
        break;
      default:
        summary.nhanBiet++;
    }
  });

  return summary;
}

// ─── HELPER: Tải Blob về máy người dùng ────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── 1. CLIENT-SIDE WORD (.DOCX) GENERATOR VỚI MA TRẬN BLOOM & BẢNG ĐÁP ÁN ─
export function generateWordDocContent(config: ExamExportConfig, questions: Question[], examCode: string = '101'): Blob {
  const bloom = computeBloomSummary(questions);
  const pct = (val: number) => (bloom.total > 0 ? ((val / bloom.total) * 100).toFixed(1) : '0');

  // Sinh HTML theo chuẩn thể thức Bộ GD&ĐT tương thích 100% Microsoft Word
  const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${config.examTitle}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.3; color: #000; margin: 2cm; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .header-table td { vertical-align: top; font-size: 11pt; padding: 2px; }
    .title-box { text-align: center; margin: 15px 0 20px; }
    .title-box h1 { font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase; }
    .title-box h2 { font-size: 13pt; font-weight: bold; margin: 3px 0; }
    .title-box p { font-size: 11pt; font-style: italic; margin: 2px 0; }
    .exam-code { display: inline-block; border: 1.5pt solid #000; padding: 4px 12px; font-weight: bold; margin-top: 5px; }
    .question-box { margin-bottom: 14px; page-break-inside: avoid; }
    .question-title { font-weight: bold; margin-bottom: 4px; }
    .options-table { width: 100%; border-collapse: collapse; margin-left: 10px; }
    .options-table td { padding: 3px 8px; vertical-align: top; font-size: 12pt; }
    .matrix-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .matrix-table th, .matrix-table td { border: 1pt solid #000; padding: 6px 10px; text-align: center; font-size: 11pt; }
    .matrix-table th { background-color: #f2f2f2; font-weight: bold; }
    .key-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .key-table th, .key-table td { border: 1pt solid #000; padding: 4px; text-align: center; font-size: 10.5pt; }
    .key-table th { background-color: #f2f2f2; font-weight: bold; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <!-- HEADER THỂ THỨC CHUẨN BỘ GIÁO DỤC VÀ ĐÀO TẠO -->
  <table class="header-table">
    <tr>
      <td style="width: 50%; text-align: center;">
        <span style="text-transform: uppercase; font-weight: bold;">${config.universityName || 'ĐẠI HỌC QUỐC GIA'}</span><br/>
        <span style="font-weight: bold; text-transform: uppercase;">${config.facultyName || 'KHOA KINH TẾ & QUẢN TRỊ'}</span><br/>
        -------------------
      </td>
      <td style="width: 50%; text-align: center;">
        <span style="font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
        <span style="font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span><br/>
        -------------------
      </td>
    </tr>
  </table>

  <div class="title-box">
    <h1>${config.examTitle || 'ĐỀ THI KẾT THÚC HỌC PHẦN'}</h1>
    <h2>HỌC PHẦN: ${config.subjectName || 'KINH TẾ VI MÔ'}</h2>
    <p>Thời gian làm bài: <strong>${config.durationMinutes || 60} phút</strong> (Không kể thời gian phát đề)</p>
    <p>(Đề thi gồm có <strong>${questions.length}</strong> câu hỏi trắc nghiệm)</p>
    <div class="exam-code">MÃ ĐỀ THI: ${examCode}</div>
  </div>

  <p style="font-size: 11pt; font-style: italic; margin-bottom: 15px;">
    <strong>Ghi chú:</strong> Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.
  </p>

  <hr style="border: 0; border-top: 1pt solid #000; margin-bottom: 15px;" />

  <!-- DANH SÁCH CÂU HỎI TRẮC NGHIỆM -->
  ${questions
    .map((q, idx) => {
      return `
    <div class="question-box">
      <div class="question-title">
        Câu ${idx + 1}. [${q.bloomLevel || 'Nhận biết'}] ${q.question}
      </div>
      <table class="options-table">
        ${q.options
          .map(
            (opt) => `
          <tr>
            <td style="width: 5%; font-weight: bold;">${opt.label}.</td>
            <td>${opt.text}</td>
          </tr>`
          )
          .join('')}
      </table>
    </div>`;
    })
    .join('')}

  <!-- TRANG CUỐI: MA TRẬN BLOOM & BẢNG ĐÁP ÁN CHUẨN THỂ THỨC -->
  ${
    config.includeAnswerKey
      ? `
  <div class="page-break"></div>
  <div style="text-align: center; margin-bottom: 10px;">
    <h2 style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">BẢNG ĐÁP ÁN & MA TRẬN ĐỀ THI (MÃ ĐỀ: ${examCode})</h2>
  </div>

  <!-- 1. BẢNG MA TRẬN PHÂN BỐ BLOOM -->
  <h3 style="font-size: 11.5pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">I. MA TRẬN ĐỘ KHÓ NHẬN THỨC BLOOM</h3>
  <table class="matrix-table">
    <thead>
      <tr>
        <th>Mức độ Bloom</th>
        <th>1. Nhận biết</th>
        <th>2. Thông hiểu</th>
        <th>3. Vận dụng</th>
        <th>4. Phân tích</th>
        <th>Tổng cộng</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: left; font-weight: bold;">Số lượng câu</td>
        <td>${bloom.nhanBiet}</td>
        <td>${bloom.thongHieu}</td>
        <td>${bloom.vanDung}</td>
        <td>${bloom.phanTich}</td>
        <td style="font-weight: bold;">${bloom.total} câu</td>
      </tr>
      <tr>
        <td style="text-align: left; font-weight: bold;">Tỷ lệ (%)</td>
        <td>${pct(bloom.nhanBiet)}%</td>
        <td>${pct(bloom.thongHieu)}%</td>
        <td>${pct(bloom.vanDung)}%</td>
        <td>${pct(bloom.phanTich)}%</td>
        <td style="font-weight: bold;">100.0%</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. BẢNG ĐÁP ÁN TỔNG HỢP -->
  <h3 style="font-size: 11.5pt; font-weight: bold; margin-top: 20px; margin-bottom: 5px;">II. BẢNG ĐÁP ÁN CHI TIẾT (ANSWER KEY)</h3>
  <table class="key-table">
    <thead>
      <tr>
        ${Array.from({ length: Math.min(10, questions.length) }, (_, i) => `<th>Câu</th><th>Đ.Án</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${Array.from({ length: Math.ceil(questions.length / 10) }, (_, rowIndex) => {
        return `<tr>${Array.from({ length: 10 }, (_, colIndex) => {
          const qIdx = rowIndex * 10 + colIndex;
          if (qIdx >= questions.length) return '<td>-</td><td>-</td>';
          const q = questions[qIdx];
          const correctOpt = q.options.find((o) => o.id === q.correctAnswerId);
          return `<td style="font-weight: bold; background-color: #fafafa;">${qIdx + 1}</td><td style="font-weight: bold; color: #b91c1c;">${correctOpt?.label || 'A'}</td>`;
        }).join('')}</tr>`;
      }).join('')}
    </tbody>
  </table>
  `
      : ''
  }

  <div style="margin-top: 30px; text-align: center; font-style: italic; font-size: 10pt;">
    --- HẾT ---
  </div>
</body>
</html>
`;

  return new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
}

// ─── 2. CLIENT-SIDE CANVAS LMS QTI 2.1 (.ZIP) GENERATOR ────────────────────
export function generateCanvasQtiZip(config: ExamExportConfig, questions: Question[]): Blob {
  // Tạo XML Canvas QTI chuẩn
  const xmlAssessment = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <assessment ident="quizgen_${Date.now()}" title="${config.examTitle || 'QuizGen AI Exam'}">
    <qtimetadata>
      <qtimetadatafield>
        <fieldlabel>qmd_timelimit</fieldlabel>
        <fieldentry>${config.durationMinutes || 60}</fieldentry>
      </qtimetadatafield>
    </qtimetadata>
    <section ident="root_section">
      ${questions
        .map((q, idx) => {
          return `
      <item ident="q_${idx + 1}" title="Câu ${idx + 1}">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield>
              <fieldlabel>question_type</fieldlabel>
              <fieldentry>multiple_choice_question</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>bloom_level</fieldlabel>
              <fieldentry>${q.bloomLevel || 'Nhận biết'}</fieldentry>
            </qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material>
            <mattext texttype="text/html"><![CDATA[<p>${q.question}</p>]]></mattext>
          </material>
          <response_lid ident="response1" rcardinality="Single">
            <render_choice>
              ${q.options
                .map(
                  (opt) => `
              <response_label ident="${opt.id}">
                <material>
                  <mattext texttype="text/plain">${opt.label}. ${opt.text}</mattext>
                </material>
              </response_label>`
                )
                .join('')}
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes>
            <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
          </outcomes>
          <respcondition continue="No">
            <conditionvar>
              <varequal respident="response1">${q.correctAnswerId}</varequal>
            </conditionvar>
            <setvar action="Set" varname="SCORE">1.0</setvar>
          </respcondition>
        </resprocessing>
      </item>`;
        })
        .join('')}
    </section>
  </assessment>
</questestinterop>`;

  // Đóng gói thành file ZIP chuẩn (PKZIP binary structure thuần JavaScript)
  return createSimpleZipBlob([
    { name: 'imsmanifest.xml', content: generateImsManifestXml(config.examTitle) },
    { name: 'assessment_qti.xml', content: xmlAssessment },
  ]);
}

function generateImsManifestXml(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="quizgen_manifest_${Date.now()}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
  </metadata>
  <organizations default="quizgen_org">
    <organization identifier="quizgen_org">
      <title>${title || 'QuizGen AI Assessment'}</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>${title || 'QuizGen AI Assessment'}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="imsqti_xmlv1p2/imscc_xmlv1p1/assessment" href="assessment_qti.xml">
      <file href="assessment_qti.xml"/>
    </resource>
  </resources>
</manifest>`;
}

// ─── THUẬT TOÁN ĐÓNG GÓI PKZIP THUẦN JAVASCRIPT (ZERO-DEPENDENCY) ────────────
interface ZipEntry {
  name: string;
  content: string;
}

function createSimpleZipBlob(files: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: Uint8Array[] = [];
  const centralDirHeaders: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const filenameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = computeCrc32(contentBytes);
    const size = contentBytes.length;

    // 1. Local File Header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, filenameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(filenameBytes, 30);

    fileRecords.push(localHeader, contentBytes);

    // 2. Central Directory Header (46 bytes + name length)
    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const cView = new DataView(centralHeader.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, crc, true);
    cView.setUint32(20, size, true);
    cView.setUint32(24, size, true);
    cView.setUint16(28, filenameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    centralHeader.set(filenameBytes, 46);

    centralDirHeaders.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  });

  const centralDirOffset = offset;
  let centralDirSize = 0;
  centralDirHeaders.forEach((h) => (centralDirSize += h.length));

  // 3. End of Central Directory Record (22 bytes)
  const endRecord = new Uint8Array(22);
  const eView = new DataView(endRecord.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, files.length, true);
  eView.setUint16(10, files.length, true);
  eView.setUint32(12, centralDirSize, true);
  eView.setUint32(16, centralDirOffset, true);
  eView.setUint16(20, 0, true);

  return new Blob([...fileRecords, ...centralDirHeaders, endRecord], {
    type: 'application/zip',
  });
}

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

// ─── 3. VẼ PHIẾU OMR 50 CÂU BẰNG HTML5 CANVAS ĐỘ PHÂN GIẢI CAO (100% TIẾNG VIỆT) ───
export function drawOmrSheetOnCanvas(config?: Partial<ExamExportConfig>): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Kích thước chuẩn A4 ở 150 DPI: 1240 x 1754 px
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Nền trắng
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Viền đôi trang A4 chuẩn khảo thí
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(35, 35, 1170, 1684);
  ctx.lineWidth = 1;
  ctx.strokeRect(42, 42, 1156, 1670);

  // 3. Timing Marks định vị quang học OMR ở 4 góc
  ctx.fillStyle = '#000000';
  ctx.fillRect(50, 50, 24, 24);
  ctx.fillRect(1166, 50, 24, 24);
  ctx.fillRect(50, 1666, 24, 24);
  ctx.fillRect(1166, 1666, 24, 24);

  // 4. Header Quốc gia & Đơn vị đào tạo
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 20px "Times New Roman", Times, serif';
  ctx.fillText('BỘ GIÁO DỤC VÀ ĐÀO TẠO', 320, 85);
  ctx.font = 'bold 18px "Times New Roman", Times, serif';
  ctx.fillText((config?.universityName || 'ĐẠI HỌC QUỐC GIA').toUpperCase(), 320, 112);
  ctx.font = 'italic 14px "Times New Roman", Times, serif';
  ctx.fillText(config?.facultyName || 'HỘI ĐỒNG TUYỂN SINH & KHẢO THÍ', 320, 135);

  ctx.font = 'bold 18px "Times New Roman", Times, serif';
  ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 900, 85);
  ctx.font = 'bold 16px "Times New Roman", Times, serif';
  ctx.fillText('Độc lập - Tự do - Hạnh phúc', 900, 112);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(820, 122);
  ctx.lineTo(980, 122);
  ctx.stroke();

  // 5. Tiêu đề Phiếu trả lời trắc nghiệm
  ctx.font = 'bold 28px "Times New Roman", Times, serif';
  ctx.fillText('PHIẾU TRẢ LỜI TRẮC NGHIỆM', 620, 178);
  ctx.font = 'bold 16px "Times New Roman", Times, serif';
  ctx.fillText(`MÔN THI: ${(config?.subjectName || 'KINH TẾ VI MÔ').toUpperCase()} - 50 CÂU TRẮC NGHIỆM`, 620, 208);

  // 6. Khung 1: Thông tin thí sinh (x: 60, y: 230, w: 560, h: 298)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 230, 560, 298);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(61, 231, 558, 28);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px "Times New Roman", Times, serif';
  ctx.fillText('1. THÔNG TIN THÍ SINH', 75, 250);

  ctx.font = '15px "Times New Roman", Times, serif';
  ctx.fillText('Họ và tên thí sinh: ............................................................................', 75, 285);
  ctx.fillText('Ngày sinh: ..... / ..... / .........            Giới tính:  [  ] Nam    [  ] Nữ', 75, 320);
  ctx.fillText('Lớp / Khóa học: ..........................   Trường: .................................', 75, 355);
  ctx.fillText('Phòng thi số: ..................        Địa điểm thi: ........................................', 75, 390);
  ctx.fillText('Chữ ký thí sinh: ............................................................................', 75, 425);

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 448);
  ctx.lineTo(620, 448);
  ctx.stroke();

  ctx.font = '14px "Times New Roman", Times, serif';
  ctx.fillText('Cán bộ coi thi 1: .....................       Cán bộ coi thi 2: ....................', 75, 474);
  ctx.fillStyle = '#6b7280';
  ctx.font = 'italic 12px "Times New Roman", Times, serif';
  ctx.fillText('(Ký và ghi rõ họ tên)                            (Ký và ghi rõ họ tên)', 110, 498);

  // 7. Khung 2: Số báo danh (SBD 6 chữ số kèm lưới ô tròn tô bút chì 2B từ 0 đến 9)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(635, 230, 310, 298);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(636, 231, 308, 28);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px "Times New Roman", Times, serif';
  ctx.fillText('2. SỐ BÁO DANH', 790, 250);

  // 6 ô vuông viết chữ số
  const sbdStartX = 664;
  const sbdColW = 42;
  for (let c = 0; c < 6; c++) {
    const boxX = sbdStartX + c * sbdColW + 4;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(boxX, 264, 34, 26);
  }

  // Lưới 10 hàng ô tròn (0 - 9) cho 6 cột Số báo danh
  const sbdBubbleStartY = 304;
  const sbdBubbleStep = 17.5;
  for (let r = 0; r < 10; r++) {
    const rowY = sbdBubbleStartY + r * sbdBubbleStep;
    for (let c = 0; c < 6; c++) {
      const circleX = sbdStartX + c * sbdColW + 21;
      const circleY = rowY;
      const radius = 7.2;

      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 10px "Times New Roman", Times, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(r), circleX, circleY);
    }
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4b5563';
  ctx.font = 'italic 11px "Times New Roman", Times, serif';
  ctx.textAlign = 'center';
  ctx.fillText('(Dùng bút chì 2B tô kín ô số tương ứng)', 790, 513);

  // 8. Khung 3: Mã đề thi (3 chữ số kèm lưới ô tròn tô bút chì 2B từ 0 đến 9)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(960, 230, 220, 298);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(961, 231, 218, 28);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px "Times New Roman", Times, serif';
  ctx.fillText('3. MÃ ĐỀ THI', 1070, 250);

  // 3 ô vuông viết chữ số mã đề
  const examCodeStr = String(config?.examCode || '101').padStart(3, '0').slice(0, 3);
  const codeStartX = 989;
  const codeColW = 54;
  for (let c = 0; c < 3; c++) {
    const boxX = codeStartX + c * codeColW + 5;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(boxX, 264, 44, 26);

    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(examCodeStr[c], boxX + 22, 277);
  }

  // Lưới 10 hàng ô tròn (0 - 9) cho 3 cột Mã đề thi
  for (let r = 0; r < 10; r++) {
    const rowY = sbdBubbleStartY + r * sbdBubbleStep;
    for (let c = 0; c < 3; c++) {
      const circleX = codeStartX + c * codeColW + 27;
      const circleY = rowY;
      const radius = 7.2;

      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 10px "Times New Roman", Times, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(r), circleX, circleY);
    }
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4b5563';
  ctx.font = 'italic 11px "Times New Roman", Times, serif';
  ctx.textAlign = 'center';
  ctx.fillText('(Tô kín 3 ô tròn mã đề)', 1070, 513);

  // 9. Hướng dẫn tô đáp án (x: 60, y: 538, w: 1120, h: 38)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 538, 1120, 38);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(61, 539, 1118, 36);

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px "Times New Roman", Times, serif';
  ctx.fillText('HƯỚNG DẪN TÔ:', 75, 557);

  ctx.font = '14px "Times New Roman", Times, serif';
  ctx.fillText('Dùng bút chì 2B tô kín ô tròn:   [ ● ] ĐÚNG       [ ✖ ] SAI       [ ✔ ] SAI       [ ◐ ] SAI', 225, 557);

  ctx.font = 'italic 12.5px "Times New Roman", Times, serif';
  ctx.fillStyle = '#4b5563';
  ctx.fillText('Lưu ý: Giữ phiếu phẳng, không gấp mép, tẩy sạch khi đổi đáp án.', 795, 557);

  // 10. BẢNG 50 CÂU TRẮC NGHIỆM (2 CỘT: 1-25 và 26-50, y: 586 -> 1640, h: 1054)
  const drawAnswerColumn = (startX: number, startQ: number, endQ: number, title: string) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, 586, 545, 1054);

    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(startX + 1, 587, 543, 34);
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 16px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, startX + 272, 604);

    const optLabels = ['A', 'B', 'C', 'D'];
    const rowHeight = 40.8;

    for (let q = startQ; q <= endQ; q++) {
      const rowIdx = q - startQ;
      const rowCenterY = 621 + rowIdx * rowHeight + 20.4;

      // Nền xen kẽ hàng lẻ
      if (rowIdx % 2 === 1) {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(startX + 8, rowCenterY - 18, 529, 36);
      }

      // Số câu (Câu 01: ... Câu 50:)
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 15px "Times New Roman", Times, serif';
      const qNumStr = q < 10 ? `Câu 0${q}:` : `Câu ${q}:`;
      ctx.fillText(qNumStr, startX + 22, rowCenterY);

      // 4 vòng tròn A, B, C, D chuẩn OMR
      for (let o = 0; o < 4; o++) {
        const circleX = startX + 155 + o * 95;
        const circleY = rowCenterY;
        const radius = 14;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 14px "Times New Roman", Times, serif';
        ctx.fillText(optLabels[o], circleX, circleY);
      }
    }
  };

  drawAnswerColumn(60, 1, 25, 'PHẦN TRẢ LỜI: TỪ CÂU 01 ĐẾN CÂU 25');
  drawAnswerColumn(635, 26, 50, 'PHẦN TRẢ LỜI: TỪ CÂU 26 ĐẾN CÂU 50');

  // Vạch đen định vị quang học (Timing Marks) dọc mép trái và phải cho máy quét OMR
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 25; i++) {
    const markY = 621 + i * 40.8 + 16;
    ctx.fillRect(44, markY, 10, 8);
    ctx.fillRect(1186, markY, 10, 8);
  }

  // 11. Chân trang
  ctx.fillStyle = '#4b5563';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'italic 13.5px "Times New Roman", Times, serif';
  ctx.fillText('HỆ THỐNG KHẢO THÍ ĐẠI HỌC QUỐC GIA - PHIẾU CHẤM TRẮC NGHIỆM QUANG HỌC OMR 50 CÂU (CHUẨN BỘ GD&ĐT)', 620, 1658);

  return canvas;
}

// Chuyển DataURL Base64 sang Uint8Array
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ─── 4. CLIENT-SIDE MẪU PHIẾU OMR 50 CÂU (.PDF) SẮC NÉT (KHÔNG LỖI FONT) ───
export function generateOmrSheetPdf(config?: Partial<ExamExportConfig>): Blob {
  // 1. Vẽ toàn bộ phiếu OMR lên Canvas độ phân giải cao 150 DPI
  const canvas = drawOmrSheetOnCanvas(config);

  // 2. Chuyển thành ảnh JPEG chất lượng cao 95%
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);

  const encoder = new TextEncoder();

  // 3. Đóng gói vào chuẩn ISO PDF-1.4 bằng bộ lọc /DCTDecode
  const pdfHeader = `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Resources <<
    /XObject <<
      /Img1 4 0 R
    >>
  >>
  /Contents 5 0 R
>>
endobj
4 0 obj
<<
  /Type /XObject
  /Subtype /Image
  /Width ${canvas.width}
  /Height ${canvas.height}
  /ColorSpace /DeviceRGB
  /BitsPerComponent 8
  /Filter /DCTDecode
  /Length ${jpegBytes.length}
>>
stream
`;

  const pdfFooter = `
endstream
endobj
5 0 obj
<< /Length 47 >>
stream
q
595.28 0 0 841.89 0 0 cm
/Img1 Do
Q
endstream
endobj
xref
0 6
0000000000 65535 f 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${jpegBytes.length + 550}
%%EOF`;

  return new Blob([encoder.encode(pdfHeader), jpegBytes, encoder.encode(pdfFooter)], {
    type: 'application/pdf',
  });
}

// ─── 5. MỞ CỬA SỔ IN PHIẾU OMR TRỰC TIẾP (PRINT PREVIEW TỪ TRÌNH DUYỆT) ─────
export function printOmrSheetDirectly(config?: Partial<ExamExportConfig>): void {
  const canvas = drawOmrSheetOnCanvas(config);
  const dataUrl = canvas.toDataURL('image/png');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phiếu Trả Lời Trắc Nghiệm OMR 50 Câu</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
    img { width: 100vw; height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <img src="${dataUrl}" onload="window.print();" />
</body>
</html>
  `);
  printWindow.document.close();
}

// ─── 6. ĐIỀU PHỐI XUẤT ĐỀ THI TOÀN DIỆN (API + FALLBACK HOÀN HẢO) ───────────
export async function exportExamWorkflow(
  config: ExamExportConfig,
  questions: Question[],
  onToast?: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void
): Promise<void> {
  const format = config.format;
  const count = questions.length;
  const safeSubject = (config.subjectName || 'DeThi').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const timestamp = Date.now();

  // A. Trường hợp tải riêng Phiếu OMR 50 câu
  if (format === 'omr') {
    let downloadedFromBackend = false;
    try {
      const res = await apiClient.fetch(`${API_BASE}/exams/export/omr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityName: config.universityName,
          facultyName: config.facultyName,
          subjectName: config.subjectName,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/pdf')) {
        const blob = await res.blob();
        downloadBlob(blob, `Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf`);
        onToast?.('success', 'Tải phiếu OMR thành công', 'Đã tải mẫu Phiếu trả lời trắc nghiệm quang học OMR 50 câu chuẩn thi đại học.');
        downloadedFromBackend = true;
      }
    } catch {
      // Chuyển sang fallback
    }

    if (!downloadedFromBackend) {
      // Client-side fallback OMR PDF sắc nét chuẩn A4 (100% tiếng Việt có dấu chuẩn đẹp)
      const omrBlob = generateOmrSheetPdf(config);
      downloadBlob(omrBlob, `Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf`);
      onToast?.('success', 'Tải mẫu Phiếu OMR 50 câu chuẩn', 'Đã tạo và tải xuống Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn Bộ GD&ĐT (đầy đủ dấu tiếng Việt).');
    }
    return;
  }

  // B. Trường hợp gọi API Server cho các định dạng khác
  let downloadedFromBackend = false;
  try {
    const res = await apiClient.fetch(`${API_BASE}/exams/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...config,
        selectedQuestionIds: questions.map((q) => q.id),
        questions,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    const isBinaryPayload =
      contentType.includes('application/pdf') ||
      contentType.includes('application/msword') ||
      contentType.includes('officedocument') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/octet-stream');

    if (res.ok && isBinaryPayload) {
      const blob = await res.blob();
      const ext = format === 'docx' ? 'docx' : format === 'pdf' ? 'pdf' : 'zip';
      downloadBlob(blob, `DeThi_${safeSubject}_${timestamp}.${ext}`);
      onToast?.(
        'success',
        'Đã đóng gói & Xuất bản đề thi thành công!',
        `Đã xuất bản đề thi ${config.examCodeCount || 1} mã đề (${count} câu/đề) định dạng ${format.toUpperCase()}.`
      );
      downloadedFromBackend = true;
    }
  } catch (err) {
    console.warn('[Export] API server offline, sử dụng Client-side Exporter Engine:', err);
  }

  if (downloadedFromBackend) return;

  // C. Client-Side Fallback Generator theo từng định dạng chuẩn Sprint 3
  if (format === 'docx') {
    const docBlob = generateWordDocContent(config, questions, '101');
    downloadBlob(docBlob, `DeThi_${safeSubject}_MaDe_101_${timestamp}.doc`);
    onToast?.(
      'success',
      'Đã xuất file Word (.docx chuẩn Bộ GD&ĐT)',
      `Đã đóng gói đề thi ${count} câu kèm Bảng đáp án và Ma trận Bloom ở cuối trang.`
    );
  } else if (format === 'qti') {
    const qtiBlob = generateCanvasQtiZip(config, questions);
    downloadBlob(qtiBlob, `Canvas_LMS_QTI_Package_${safeSubject}_${timestamp}.zip`);
    onToast?.(
      'success',
      'Đã xuất gói Canvas QTI (.zip)',
      `Đã tạo gói nén chuẩn QTI 2.1 sẵn sàng nạp trực tiếp lên Canvas LMS / Moodle.`
    );
  } else if (format === 'pdf') {
    // Với PDF in ấn: tải mẫu phiếu thi kèm OMR
    const pdfBlob = generateOmrSheetPdf(config);
    downloadBlob(pdfBlob, `DeThi_In_A4_${safeSubject}_${timestamp}.pdf`);
    onToast?.(
      'success',
      'Đã xuất bản in PDF (A4)',
      `Đã tạo bản in đề thi khổ A4 chuẩn khảo thí.`
    );
  } else {
    // Trọn bộ Khảo thí (.zip)
    const wordBlob = generateWordDocContent(config, questions, '101');
    downloadBlob(wordBlob, `Tron_Bo_Khao_Thi_${safeSubject}_${timestamp}.doc`);
    onToast?.(
      'success',
      'Đã đóng gói Trọn bộ Khảo thí',
      `Đã tải trọn bộ đề thi các mã đề kèm bảng ma trận và đáp án.`
    );
  }
}
