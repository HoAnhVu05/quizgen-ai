/**
 * Vietnamese Legacy Font Normalizer (VNI-Windows, TCVN3 / ABC -> Unicode UTF-8 NFC)
 * Xử lý lỗi font tiếng Việt lịch sử trên các tài liệu giáo trình, slide bài giảng cũ.
 */

// Bảng ánh xạ ký tự 2 byte và 1 byte của VNI-Windows sang Unicode NFC chuẩn
const VNI_PAIRS: [string, string][] = [
  // Chữ hoa 2 ký tự ghép VNI
  ['AÁ', 'Ấ'], ['AÀ', 'Ầ'], ['AẢ', 'Ẩ'], ['AÃ', 'Ẫ'], ['AẠ', 'Ậ'],
  ['AÉ', 'Ắ'], ['AÈ', 'Ằ'], ['AẺ', 'Ẳ'], ['AẼ', 'Ẵ'], ['AẸ', 'Ặ'],
  ['AÅ', 'Ẩ'], ['AÄ', 'Ậ'], ['AÊ', 'Ă'], ['AÂ', 'Â'],
  ['EÁ', 'Ế'], ['EÀ', 'Ề'], ['EẢ', 'Ể'], ['EÃ', 'Ễ'], ['EẠ', 'Ệ'],
  ['EÅ', 'Ể'], ['EÄ', 'Ệ'], ['EÂ', 'Ê'],
  ['OÁ', 'Ố'], ['OÀ', 'Ồ'], ['OẢ', 'Ổ'], ['OÃ', 'Ỗ'], ['OẠ', 'Ộ'],
  ['OÅ', 'Ổ'], ['OÄ', 'Ộ'], ['OÂ', 'Ô'],
  ['ÔÁ', 'Ớ'], ['ÔÀ', 'Ờ'], ['ÔẢ', 'Ở'], ['ÔÃ', 'Ỡ'], ['ÔẠ', 'Ợ'],
  ['ÔÙ', 'Ớ'], ['ÔØ', 'Ờ'], ['ÔÛ', 'Ở'], ['ÔÕ', 'Ỡ'], ['ÔÏ', 'Ợ'],
  ['ÖÁ', 'Ứ'], ['ÖÀ', 'Ừ'], ['ÖẢ', 'Ử'], ['ÖÃ', 'Ữ'], ['ÖẠ', 'Ự'],
  ['ÖÙ', 'Ứ'], ['ÖØ', 'Ừ'], ['ÖÛ', 'Ử'], ['ÖÕ', 'Ữ'], ['ÖÏ', 'Ự'],
  ['UÁ', 'Ú'], ['UÀ', 'Ù'], ['UẢ', 'Ủ'], ['UÃ', 'Ũ'], ['UẠ', 'Ụ'],
  ['UÙ', 'Ú'], ['UØ', 'Ù'], ['UÛ', 'Ủ'], ['UÕ', 'Ũ'], ['UÏ', 'Ụ'],
  ['AÙ', 'Á'], ['AØ', 'À'], ['AÛ', 'Ả'], ['AÕ', 'Ã'], ['AÏ', 'Ạ'],
  ['EÙ', 'É'], ['EØ', 'È'], ['EÛ', 'Ẻ'], ['EÕ', 'Ẽ'], ['EÏ', 'Ẹ'],
  ['OÙ', 'Ó'], ['OØ', 'Ò'], ['OÛ', 'Ỏ'], ['OÕ', 'Õ'], ['OÏ', 'Ọ'],
  ['YÙ', 'Ý'], ['YØ', 'Ỳ'], ['YÛ', 'Ỷ'], ['YÕ', 'Ỹ'],

  // Chữ thường 2 ký tự ghép VNI
  ['aù', 'á'], ['aø', 'à'], ['aû', 'ả'], ['aõ', 'ã'], ['aï', 'ạ'],
  ['aê', 'ă'], ['aé', 'ắ'], ['aè', 'ằ'], ['aú', 'ẳ'], ['aü', 'ẵ'], ['aë', 'ặ'],
  ['aâ', 'â'], ['aá', 'ấ'], ['aà', 'ầ'], ['aå', 'ẩ'], ['aã', 'ẫ'], ['aä', 'ậ'],
  ['eù', 'é'], ['eø', 'è'], ['eû', 'ẻ'], ['eõ', 'ẽ'], ['eï', 'ẹ'],
  ['eâ', 'ê'], ['eá', 'ế'], ['eà', 'ề'], ['eå', 'ể'], ['eã', 'ễ'], ['eä', 'ệ'],
  ['où', 'ó'], ['oø', 'ò'], ['oû', 'ỏ'], ['oõ', 'õ'], ['oï', 'ọ'],
  ['oâ', 'ô'], ['oá', 'ố'], ['oà', 'ồ'], ['oå', 'ổ'], ['oã', 'ỗ'], ['oä', 'ộ'],
  ['ôù', 'ớ'], ['ôø', 'ờ'], ['ôû', 'ở'], ['ôõ', 'ỡ'], ['ôï', 'ợ'],
  ['uù', 'ú'], ['uø', 'ù'], ['uû', 'ủ'], ['uõ', 'ũ'], ['uï', 'ụ'],
  ['öù', 'ứ'], ['öø', 'ừ'], ['öû', 'ử'], ['öõ', 'ữ'], ['öï', 'ự'],
  ['yù', 'ý'], ['yø', 'ỳ'], ['yû', 'ỷ'], ['yõ', 'ỹ'],

  // Ký tự đặc biệt và cụm từ đặc trưng VNI
  ['CHUYEÅN', 'CHUYỂN'], ['CHUYEẢN', 'CHUYỂN'],
  ['DAÀM', 'DẦM'], ['CHÒU', 'CHỊU'], ['UOÁN', 'UỐN'],
  ['Ñ', 'Đ'], ['ñ', 'đ'],
  ['æ', 'ỉ'], ['î', 'ỵ'], ['Î', 'Ỵ']
];

/**
 * Chuẩn hóa các chuỗi văn bản hoặc tiêu đề chương mục bị lỗi mã font VNI-Windows/TCVN3 sang Unicode chuẩn.
 */
export function normalizeVietnameseLegacyFont(text: string): string {
  if (!text) return '';
  let result = text;

  // 1. Kiểm tra dấu hiệu chuỗi chứa mã ký tự VNI đặc trưng
  const hasVniSign = /(?:CHUYE|VÒ|CHÒU|DAÀM|UOÁN|EÅ|EẢ|[a-z][ùøûõï]|[A-Z][ÙØÛÕÏ])/;
  if (hasVniSign.test(result)) {
    // Thay thế từ đơn độc lập
    result = result.replace(/\bVÒ\b/g, 'VỊ');
    result = result.replace(/\bCHÒU\b/g, 'CHỊU');
    result = result.replace(/\bDAÀM\b/g, 'DẦM');
    result = result.replace(/\bUOÁN\b/g, 'UỐN');
    result = result.replace(/\bCHUYEÅN\b|\bCHUYEẢN\b/g, 'CHUYỂN');

    for (const [pattern, replacement] of VNI_PAIRS) {
      if (result.includes(pattern)) {
        result = result.split(pattern).join(replacement);
      }
    }
  }

  // 2. Chuẩn hóa dạng dựng sẵn Unicode NFC
  try {
    result = result.normalize('NFC');
  } catch {}

  return result.trim();
}
