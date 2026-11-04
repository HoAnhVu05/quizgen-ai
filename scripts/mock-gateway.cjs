const http = require('http');
const url = require('url');

const PORT = 8000;

// ============================================================================
// ACADEMIC USER DATABASE (Strict Authentication & In-Memory Store)
// ============================================================================
const MOCK_USERS_DB = new Map([
  [
    'lecturer@vnu.edu.vn',
    {
      id: 'lec-001',
      email: 'lecturer@vnu.edu.vn',
      password: 'academic123',
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
      password: 'academic123',
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
    'admin.khaothi@vnu.edu.vn',
    {
      id: 'admin-001',
      email: 'admin.khaothi@vnu.edu.vn',
      password: 'admin123',
      full_name: 'ThS. Lê Hoàng Nam',
      fullName: 'ThS. Lê Hoàng Nam',
      academic_title: 'ThS.',
      academicTitle: 'ThS.',
      university: 'Đại học Quốc gia',
      department: 'Phòng Khảo thi & Đảm bảo Chất lượng',
      role: 'admin',
      roleLabel: 'Quản trị Khảo thi',
    },
  ],
]);

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
            q: 'Trong thuật toán tìm kiếm Heuristic A*, hàm đánh giá tổng chi phí ước lượng của một nút n được tính theo công thức:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'f(n) = g(n) + h(n)' },
              { id: 'opt-b', label: 'B', text: 'f(n) = g(n) - h(n)' },
              { id: 'opt-c', label: 'C', text: 'f(n) = g(n) * h(n)' },
              { id: 'opt-d', label: 'D', text: 'f(n) = max(g(n), h(n))' },
            ],
            correct: 'opt-a',
            exp: 'f(n) = g(n) (chi phí đã đi) + h(n) (chi phí ước lượng còn lại tới đích).',
          },
          'Thông hiểu': {
            q: 'Một hàm heuristic h(n) được gọi là "chấp nhận được" (Admissible Heuristic) khi và chỉ khi:',
            opts: [
              { id: 'opt-a', label: 'A', text: 'h(n) không bao giờ đánh giá vượt quá chi phí thực tế nhỏ nhất từ nút n đến đích (h(n) <= h*(n))' },
              { id: 'opt-b', label: 'B', text: 'h(n) luôn nhận giá trị lớn hơn hoặc bằng chi phí thực tế' },
              { id: 'opt-c', label: 'C', text: 'h(n) nhận giá trị bằng 0 tại tất cả các nút trên đồ thị' },
              { id: 'opt-d', label: 'D', text: 'h(n) là hàm hằng số không phụ thuộc vào trạng thái đích' },
            ],
            correct: 'opt-a',
            exp: 'Tính chấp nhận được (không đánh giá cao hơn thực tế) là điều kiện cần để A* tìm được lời giải tối ưu.',
          },
          'Vận dụng': {
            q: 'Tại một bước duyệt của A*, nút A có g(A) = 5, h(A) = 3; nút B có g(B) = 3, h(B) = 6. Thuật toán A* sẽ chọn mở rộng nút nào tiếp theo?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Nút A vì f(A) = 8 nhỏ hơn f(B) = 9' },
              { id: 'opt-b', label: 'B', text: 'Nút B vì g(B) = 3 nhỏ hơn g(A) = 5' },
              { id: 'opt-c', label: 'C', text: 'Nút B vì h(B) = 6 lớn hơn h(A) = 3' },
              { id: 'opt-d', label: 'D', text: 'Cả hai nút ngẫu nhiên do cùng mức chi phí' },
            ],
            correct: 'opt-a',
            exp: 'f(A) = 5 + 3 = 8; f(B) = 3 + 6 = 9. Thuật toán A* luôn ưu tiên mở rộng nút có f(n) nhỏ nhất.',
          },
          'Phân tích': {
            q: 'Trong thuật toán cắt tỉa Alpha-Beta áp dụng cho cây trò chơi đối kháng (Game Tree), điều kiện nào sau đây kích hoạt việc cắt tỉa nhánh?',
            opts: [
              { id: 'opt-a', label: 'A', text: 'Khi tại một nút xét duyệt xuất hiện giá trị alpha >= beta' },
              { id: 'opt-b', label: 'B', text: 'Khi giá trị alpha < beta tại tất cả các nút lá' },
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
};

function resolveChapterData(bookId, chapterStr) {
  let book = CURRICULUM_DATABASE[bookId];
  if (!book) {
    if (String(bookId).toLowerCase().includes('tri-tue-nhan-tao') || String(bookId).toLowerCase().includes('ai')) {
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
        created_at: 'Vừa sinh AI (Gemini Pro)',
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

  req.on('end', () => {
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

    // Documents
    if (pathname.startsWith('/api/v1/documents')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        {
          id: 'doc-kinh-te-vi-mo-2025',
          name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
          status: 'ready',
          totalPages: 184,
          chaptersCount: 5,
          chapters: [
            'Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng',
            'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
            'Chương 3: Lý thuyết hành vi người tiêu dùng và Lợi ích biên',
            'Chương 4: Lý thuyết sản xuất, Chi phí và Tối đa hóa lợi nhuận',
            'Chương 5: Cấu trúc thị trường: Cạnh tranh hoàn hảo và Độc quyền',
          ],
        },
        {
          id: 'doc-tri-tue-nhan-tao-2026',
          name: 'GiaoTrinh_TriTueNhanTao_2026.pdf',
          status: 'ready',
          totalPages: 240,
          chaptersCount: 4,
          chapters: [
            'Chương 1: Tổng quan về Trí tuệ nhân tạo & Intelligent Agents',
            'Chương 2: Không gian trạng thái và Thuật toán tìm kiếm Heuristic (A*, IDA*)',
            'Chương 3: Cơ sở Học máy và Mạng nơ-ron nhân tạo',
            'Chương 4: Xử lý ngôn ngữ tự nhiên (NLP) & Kiến trúc Transformer/RAG',
          ],
        },
      ]));
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
        res.end(JSON.stringify({ detail: 'Tài khoản email này chưa được đăng ký trong hệ thống Khảo thí ĐHQG.' }));
        return;
      }

      if (user.password !== password) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Mật khẩu học thuật không chính xác.' }));
        return;
      }

      // Đăng nhập thành công -> Trả về JWT Token và User Profile
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        access_token: `mock-jwt-${user.id}-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 86400,
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
      }));
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
      res.end(JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        academic_title: newUser.academic_title,
        university: newUser.university,
        department: newUser.department,
        role: newUser.role,
        access_token: `mock-jwt-${newUser.id}-${Date.now()}`,
        token_type: 'bearer',
        is_active: true,
        created_at: new Date().toISOString(),
      }));
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
        if (token.includes(u.id)) {
          foundUser = u;
          break;
        }
      }
      if (!foundUser) {
        foundUser = Array.from(MOCK_USERS_DB.values())[0];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: foundUser.id,
        email: foundUser.email,
        full_name: foundUser.full_name,
        academic_title: foundUser.academic_title,
        university: foundUser.university,
        department: foundUser.department,
        role: foundUser.role,
        is_active: true,
        created_at: new Date().toISOString(),
      }));
      return;
    }

    // Auth Logout
    if (pathname === '/api/v1/auth/logout') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Đăng xuất thành công, token đã bị thu hồi.' }));
      return;
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
