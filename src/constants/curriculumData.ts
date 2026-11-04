/** Jira Task: [SCRUM-44] - Tích hợp AI Generation Service & Đồng bộ chuẩn hóa dữ liệu học thuật */
import { BloomLevel, Question, QuestionOption, SourceChunk } from '../types';

export interface ChapterKnowledge {
  chapterName: string;
  pageNumber: number;
  textSnippet: string;
  relevanceScore: number;
  templates: {
    level: BloomLevel;
    question: string;
    options: QuestionOption[];
    correctAnswerId: string;
    explanation: string;
  }[];
}

export interface TextbookKnowledge {
  id: string;
  name: string;
  chapters: Record<string, ChapterKnowledge>;
}

export const ACADEMIC_CURRICULUM: Record<string, TextbookKnowledge> = {
  'doc-kinh-te-vi-mo-2025': {
    id: 'doc-kinh-te-vi-mo-2025',
    name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapters: {
      'Chương 1': {
        chapterName: 'Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng',
        pageNumber: 15,
        textSnippet:
          'Kinh tế học là môn khoa học nghiên cứu cách thức xã hội quản lý và phân bổ các nguồn lực khan hiếm. Chi phí cơ hội (Opportunity Cost) của một sự lựa chọn là giá trị của phương án tốt nhất bị bỏ qua. Đường giới hạn khả năng sản xuất (PPF) mô tả các kết hợp sản lượng tối đa mà nền kinh tế có thể sản xuất với nguồn lực và công nghệ hiện hữu.',
        relevanceScore: 97,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Khái niệm "Chi phí cơ hội" (Opportunity Cost) trong phân tích kinh tế vi mô được định nghĩa là gì?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Giá trị của phương án tốt nhất bị bỏ qua khi đưa ra một quyết định lựa chọn' },
              { id: 'opt-b', label: 'B', text: 'Tổng số tiền mặt thực tế đã chi ra để thực hiện dự án' },
              { id: 'opt-c', label: 'C', text: 'Khoản chi phí chìm không thể thu hồi được trong quá khứ' },
              { id: 'opt-d', label: 'D', text: 'Lợi nhuận kế toán ghi nhận trên báo cáo tài chính hàng năm' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Chi phí cơ hội đo lường giá trị của cơ hội tốt nhất tiếp theo phải hy sinh để chọn phương án hiện tại.',
          },
          {
            level: 'Thông hiểu',
            question: 'Khi nền kinh tế đang sản xuất tại một điểm nằm bên trong đường giới hạn khả năng sản xuất (PPF), điều này phản ánh:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Nền kinh tế đang hoạt động không hiệu quả hoặc nguồn lực chưa được sử dụng triệt để' },
              { id: 'opt-b', label: 'B', text: 'Nền kinh tế đã đạt mức sản xuất tối ưu tuyệt đối' },
              { id: 'opt-c', label: 'C', text: 'Quy mô sản lượng vượt quá tiềm năng hiện hữu của tài nguyên quốc gia' },
              { id: 'opt-d', label: 'D', text: 'Tất cả các doanh nghiệp đều đạt lợi nhuận kinh tế bằng 0' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Mọi điểm nằm phía trong đường PPF đều phản ánh sự lãng phí nguồn lực hoặc nguồn lực không được sử dụng hết.',
          },
          {
            level: 'Vận dụng',
            question: 'Một nền kinh tế chỉ sản xuất hai mặt hàng X và Y. Để sản xuất thêm 20 đơn vị X, nền kinh tế phải giảm bớt 40 đơn vị Y. Chi phí cơ hội để sản xuất 1 đơn vị hàng hóa X là bao nhiêu?',
            options: [
              { id: 'opt-a', label: 'A', text: '2 đơn vị hàng hóa Y' },
              { id: 'opt-b', label: 'B', text: '0.5 đơn vị hàng hóa Y' },
              { id: 'opt-c', label: 'C', text: '40 đơn vị hàng hóa Y' },
              { id: 'opt-d', label: 'D', text: '20 đơn vị hàng hóa Y' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Chi phí cơ hội của 1X = 40Y / 20X = 2 đơn vị Y.',
          },
          {
            level: 'Phân tích',
            question: 'Khi phân tích sự khác biệt giữa kinh tế học thực chứng và kinh tế học chuẩn tắc, nhận định nào sau đây là chính xác?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Kinh tế học thực chứng giải thích thế giới khách quan ("là gì"), trong khi kinh tế học chuẩn tắc đưa ra đánh giá chủ quan ("nên như thế nào")' },
              { id: 'opt-b', label: 'B', text: 'Kinh tế học chuẩn tắc có thể được kiểm chứng trực tiếp bằng số liệu thực nghiệm' },
              { id: 'opt-c', label: 'C', text: 'Kinh tế học thực chứng luôn chứa đựng quan điểm đạo đức của người nghiên cứu' },
              { id: 'opt-d', label: 'D', text: 'Cả hai phương pháp đều chỉ áp dụng cho phân tích kinh tế vĩ mô' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Thực chứng (Positive) dựa trên thực tế có thể kiểm chứng; Chuẩn tắc (Normative) chứa đựng phán xét giá trị.',
          },
        ],
      },

      'Chương 2': {
        chapterName: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
        pageNumber: 42,
        textSnippet:
          'Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa tăng lên thì lượng cầu giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.',
        relevanceScore: 98,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Khi mức giá hàng hóa tăng lên thì lượng cầu sẽ giảm xuống' },
              { id: 'opt-b', label: 'B', text: 'Khi mức giá hàng hóa tăng lên thì lượng cầu sẽ tăng lên' },
              { id: 'opt-c', label: 'C', text: 'Giá cả và lượng cầu luôn biến thiên cùng chiều với nhau' },
              { id: 'opt-d', label: 'D', text: 'Lượng cầu hoàn toàn không chịu tác động của mức giá thị trường' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Quy luật cầu phản ánh mối quan hệ nghịch biến giữa giá cả và lượng cầu của một hàng hóa.',
          },
          {
            level: 'Thông hiểu',
            question: 'Nếu trà và cà phê là hai hàng hóa thay thế cho nhau, điều gì sẽ xảy ra khi giá cà phê trên thị trường tăng vọt?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Cầu về mặt hàng trà sẽ có xu hướng tăng lên và đường cầu dịch chuyển sang phải' },
              { id: 'opt-b', label: 'B', text: 'Lượng cầu về trà sẽ giảm sút nghiêm trọng' },
              { id: 'opt-c', label: 'C', text: 'Đường cầu của cà phê dịch chuyển song song sang phải' },
              { id: 'opt-d', label: 'D', text: 'Giá của cả hai mặt hàng sẽ lập tức giảm về 0' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Vì là hàng hóa thay thế, giá cà phê tăng làm người tiêu dùng chuyển sang dùng trà, làm tăng cầu về trà.',
          },
          {
            level: 'Vận dụng',
            question: 'Một doanh nghiệp bán sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 1.8. Để tối đa hóa tổng doanh thu, doanh nghiệp nên áp dụng chiến lược giá nào?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Giảm nhẹ giá bán sản phẩm để kích thích lượng bán ra' },
              { id: 'opt-b', label: 'B', text: 'Tăng giá bán sản phẩm lên gấp đôi' },
              { id: 'opt-c', label: 'C', text: 'Giữ nguyên giá bán và cắt giảm 50% sản lượng' },
              { id: 'opt-d', label: 'D', text: 'Định giá bằng đúng chi phí cố định' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Khi cầu co giãn nhiều (|PED| > 1), tỷ lệ tăng lượng bán lớn hơn tỷ lệ giảm giá, do đó giảm giá sẽ tăng tổng doanh thu.',
          },
          {
            level: 'Phân tích',
            question: 'Khi chính phủ áp đặt giá trần (Price Ceiling) thấp hơn giá cân bằng thị trường, hệ quả phân tích thặng dư xã hội nào sau đây xảy ra?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Xảy ra hiện tượng tổn thất vô ích (Deadweight Loss) do thiếu hụt lượng hàng hóa giao dịch' },
              { id: 'opt-b', label: 'B', text: 'Tổng thặng dư toàn xã hội luôn đạt mức cực đại' },
              { id: 'opt-c', label: 'C', text: 'Nhà sản xuất nhận được mức thặng dư cao hơn trước khi can thiệp giá' },
              { id: 'opt-d', label: 'D', text: 'Lượng giao dịch thực tế trên thị trường tăng lên mức tối đa' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Giá trần làm giảm lượng cung từ người bán, gây thiếu hụt và tạo ra tổn thất vô ích cho toàn xã hội.',
          },
        ],
      },

      'Chương 3': {
        chapterName: 'Chương 3: Lý thuyết hành vi người tiêu dùng và Lợi ích biên',
        pageNumber: 85,
        textSnippet:
          'Lý thuyết hành vi người tiêu dùng giả định rằng cá nhân luôn tối đa hóa mức thỏa dụng (Utility) với giới hạn ngân sách cho trước. Quy luật lợi ích biên giảm dần (Law of Diminishing Marginal Utility) chỉ rõ rằng khi tăng dần mức tiêu dùng một hàng hóa, lợi ích tăng thêm từ mỗi đơn vị sau sẽ có xu hướng giảm bớt. Điểm cân bằng tiêu dùng đạt được khi tỷ lệ thay thế biên (MRS) bằng tỷ số giá.',
        relevanceScore: 95,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Theo lý thuyết hành vi người tiêu dùng, quy luật lợi ích biên giảm dần (Diminishing Marginal Utility) phát biểu rằng:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Lợi ích tăng thêm khi tiêu thụ thêm một đơn vị sản phẩm có xu hướng giảm dần' },
              { id: 'opt-b', label: 'B', text: 'Tổng mức thỏa dụng luôn giảm dần ngay từ sản phẩm đầu tiên' },
              { id: 'opt-c', label: 'C', text: 'Lợi ích biên luôn nhận giá trị âm với mọi mức tiêu dùng' },
              { id: 'opt-d', label: 'D', text: 'Giá cả sản phẩm sẽ giảm dần khi tiêu dùng nhiều hơn' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Quy luật lợi ích biên giảm dần chỉ ra rằng MU giảm khi lượng tiêu thụ Q tăng.',
          },
          {
            level: 'Thông hiểu',
            question: 'Đặc điểm nào sau đây KHÔNG PHẢI là tính chất cơ bản của các đường bàng quan (Indifference Curves)?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Hai đường bàng quan khác nhau có thể cắt nhau tại một điểm' },
              { id: 'opt-b', label: 'B', text: 'Đường bàng quan luôn dốc xuống từ trái sang phải' },
              { id: 'opt-c', label: 'C', text: 'Đường bàng quan có dạng lồi về phía gốc tọa độ O' },
              { id: 'opt-d', label: 'D', text: 'Đường bàng quan càng xa gốc tọa độ biểu thị mức thỏa dụng càng cao' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Do tính bắc cầu trong sở thích của người tiêu dùng, hai đường bàng quan không bao giờ cắt nhau.',
          },
          {
            level: 'Vận dụng',
            question: 'Người tiêu dùng có thu nhập chi cho hai hàng hóa X và Y với P_X = 10$, P_Y = 20$. Tại điểm tiêu dùng hiện tại, MU_X = 30 và MU_Y = 40. Để tối đa hóa mức thỏa dụng, người này nên:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Tăng mua hàng hóa X và giảm mua hàng hóa Y' },
              { id: 'opt-b', label: 'B', text: 'Tăng mua hàng hóa Y và giảm mua hàng hóa X' },
              { id: 'opt-c', label: 'C', text: 'Giữ nguyên cơ cấu tiêu dùng vì đã đạt điểm tối ưu' },
              { id: 'opt-d', label: 'D', text: 'Ngừng hoàn toàn việc mua hàng hóa X' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'MU_X / P_X = 30/10 = 3 > MU_Y / P_Y = 40/20 = 2. Một đô-la chi cho X đem lại nhiều thỏa dụng hơn, do đó nên tăng X và giảm Y.',
          },
          {
            level: 'Phân tích',
            question: 'Khi phân tích tác động của việc giảm giá một hàng hóa thông thường, tác động thay thế (Substitution effect) và tác động thu nhập (Income effect) biến thiên như thế nào?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Cả hai tác động đều cùng chiều, cùng làm tăng lượng cầu về hàng hóa đó' },
              { id: 'opt-b', label: 'B', text: 'Tác động thay thế làm tăng cầu, trong khi tác động thu nhập làm giảm cầu' },
              { id: 'opt-c', label: 'C', text: 'Tác động thu nhập luôn triệt tiêu hoàn toàn tác động thay thế' },
              { id: 'opt-d', label: 'D', text: 'Tác động thay thế luôn bằng 0 đối với hàng hóa thông thường' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Đối với hàng hóa thông thường, giá giảm khiến tác động thay thế và tác động thu nhập đều dương, làm tăng lượng cầu.',
          },
        ],
      },

      'Chương 4': {
        chapterName: 'Chương 4: Lý thuyết sản xuất, Chi phí và Tối đa hóa lợi nhuận',
        pageNumber: 128,
        textSnippet:
          'Trong ngắn hạn, năng suất biên của lao động (MPL) có xu hướng giảm dần khi tiếp tục bổ sung lao động trên quy mô vốn cố định. Chi phí biên (MC) là sự gia tăng trong tổng chi phí khi sản xuất thêm một đơn vị sản phẩm. Đường MC luôn cắt đường chi phí biến đổi trung bình (AVC) và tổng chi phí trung bình (ATC) tại các điểm cực tiểu của chúng.',
        relevanceScore: 96,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Trong phân tích chi phí ngắn hạn của doanh nghiệp, chi phí cố định (Fixed Cost - FC) là:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Khoản chi phí không thay đổi theo mức sản lượng sản xuất của doanh nghiệp' },
              { id: 'opt-b', label: 'B', text: 'Chi phí biến đổi theo số lượng sản phẩm xuất xưởng' },
              { id: 'opt-c', label: 'C', text: 'Khoản chi phí bằng 0 khi doanh nghiệp tạm ngừng hoạt động' },
              { id: 'opt-d', label: 'D', text: 'Chi phí tính riêng cho mỗi công nhân làm việc thêm giờ' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Chi phí cố định (như tiền thuê mặt bằng, khấu hao máy móc) không phụ thuộc vào sản lượng Q.',
          },
          {
            level: 'Thông hiểu',
            question: 'Mối quan hệ giữa chi phí biên (MC) và tổng chi phí trung bình (ATC) chỉ ra rằng:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Đường MC luôn cắt đường ATC tại điểm cực tiểu của đường ATC' },
              { id: 'opt-b', label: 'B', text: 'Khi MC tăng thì ATC nhất thiết phải tăng theo' },
              { id: 'opt-c', label: 'C', text: 'Đường ATC luôn nằm dưới đường MC tại mọi mức sản lượng' },
              { id: 'opt-d', label: 'D', text: 'Đường MC luôn dốc xuống trong dài hạn' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Khi MC < ATC thì ATC giảm; khi MC > ATC thì ATC tăng; do đó MC cắt ATC tại điểm cực tiểu.',
          },
          {
            level: 'Vận dụng',
            question: 'Một doanh nghiệp có hàm tổng chi phí ngắn hạn TC = Q^2 + 10Q + 100. Hàm chi phí biên (MC) và chi phí cố định (FC) là:',
            options: [
              { id: 'opt-a', label: 'A', text: 'MC = 2Q + 10 và FC = 100' },
              { id: 'opt-b', label: 'B', text: 'MC = Q + 10 và FC = 10' },
              { id: 'opt-c', label: 'C', text: 'MC = 2Q và FC = 100' },
              { id: 'opt-d', label: 'D', text: 'MC = 2Q + 10 và FC = 0' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'MC = d(TC)/dQ = 2Q + 10. Khi Q = 0, TC = FC = 100.',
          },
          {
            level: 'Phân tích',
            question: 'Hiện tượng hiệu suất kinh tế theo quy mô (Economies of Scale) trong dài hạn được giải thích chủ yếu bởi yếu tố nào?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Sự chuyên môn hóa lao động sâu sắc hơn và ứng dụng dây chuyền công nghệ hiện đại quy mô lớn' },
              { id: 'opt-b', label: 'B', text: 'Bộ máy quản lý hành chính phình to gây khó khăn trong điều hành' },
              { id: 'opt-c', label: 'C', text: 'Giá nguyên vật liệu đầu vào tăng do áp lực mua số lượng lớn' },
              { id: 'opt-d', label: 'D', text: 'Năng suất của tất cả các yếu tố đầu vào suy giảm' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Hiệu suất kinh tế theo quy mô xuất hiện khi tăng quy mô giúp giảm chi phí trung bình dài hạn nhờ chuyên môn hóa.',
          },
        ],
      },

      'Chương 5': {
        chapterName: 'Chương 5: Cấu trúc thị trường: Cạnh tranh hoàn hảo và Độc quyền',
        pageNumber: 165,
        textSnippet:
          'Thị trường cạnh tranh hoàn hảo đặc trưng bởi số lượng lớn người mua và người bán, sản phẩm đồng nhất, người bán là người chấp nhận giá (P = MR = MC). Ngược lại, doanh nghiệp độc quyền bán đối mặt với toàn bộ đường cầu thị trường, có quyền định giá bằng cách lựa chọn sản lượng tại điểm MR = MC và đặt giá P > MC.',
        relevanceScore: 97,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Đặc trưng cốt lõi của một doanh nghiệp trong thị trường cạnh tranh hoàn hảo là:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Doanh nghiệp là người chấp nhận giá thị trường (P = MR)' },
              { id: 'opt-b', label: 'B', text: 'Doanh nghiệp có quyền lực tuyệt đối trong việc định giá bán' },
              { id: 'opt-c', label: 'C', text: 'Sản phẩm có sự khác biệt hóa mạnh mẽ giữa các nhà cung cấp' },
              { id: 'opt-d', label: 'D', text: 'Tồn tại rào cản pháp lý rất cao ngăn chặn doanh nghiệp mới gia nhập' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Trong cạnh tranh hoàn hảo, không doanh nghiệp nào đủ lớn để tác động lên giá, họ chấp nhận mức giá cân bằng.',
          },
          {
            level: 'Thông hiểu',
            question: 'Trong ngắn hạn, doanh nghiệp cạnh tranh hoàn hảo sẽ quyết định đóng cửa sản xuất (Shutdown) khi mức giá thị trường:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Thấp hơn mức tối thiểu của chi phí biến đổi trung bình (P < AVC_min)' },
              { id: 'opt-b', label: 'B', text: 'Thấp hơn tổng chi phí trung bình (P < ATC_min)' },
              { id: 'opt-c', label: 'C', text: 'Bằng đúng chi phí cố định của doanh nghiệp' },
              { id: 'opt-d', label: 'D', text: 'Lớn hơn chi phí biên (P > MC)' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Nếu P < AVC, doanh nghiệp không bù đắp nổi chi phí biến đổi thực tế, việc tiếp tục sản xuất sẽ lỗ nhiều hơn đóng cửa.',
          },
          {
            level: 'Vận dụng',
            question: 'Một doanh nghiệp độc quyền đối mặt với hàm cầu P = 120 - 2Q và có chi phí biên MC = 40. Mức sản lượng tối ưu để tối đa hóa lợi nhuận là:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Q = 20 và P = 80' },
              { id: 'opt-b', label: 'B', text: 'Q = 40 và P = 40' },
              { id: 'opt-c', label: 'C', text: 'Q = 25 và P = 70' },
              { id: 'opt-d', label: 'D', text: 'Q = 30 và P = 60' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'TR = 120Q - 2Q^2 => MR = 120 - 4Q. MR = MC <=> 120 - 4Q = 40 => Q = 20. P = 120 - 2(20) = 80.',
          },
          {
            level: 'Phân tích',
            question: 'Khi so sánh giữa thị trường độc quyền bán và cạnh tranh hoàn hảo, kết luận nào sau đây về tổn thất xã hội là đúng?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Độc quyền bán gây ra tổn thất vô ích (Deadweight Loss) do cắt giảm sản lượng và định giá P > MC' },
              { id: 'opt-b', label: 'B', text: 'Độc quyền bán tạo ra mức thặng dư tiêu dùng cao hơn cạnh tranh hoàn hảo' },
              { id: 'opt-c', label: 'C', text: 'Tổng thặng dư toàn xã hội trong độc quyền luôn đạt giá trị cực đại' },
              { id: 'opt-d', label: 'D', text: 'Doanh nghiệp độc quyền luôn tạo ra hiệu quả phân bổ nguồn lực tối ưu Pareto' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Vì P > MC, người tiêu dùng sẵn sàng trả giá cao hơn chi phí biên để có thêm hàng hóa nhưng không được đáp ứng, gây tổn thất vô ích.',
          },
        ],
      },
    },
  },

  'doc-tri-tue-nhan-tao-2026': {
    id: 'doc-tri-tue-nhan-tao-2026',
    name: 'GiaoTrinh_TriTueNhanTao_2026.pdf',
    chapters: {
      'Chương 1': {
        chapterName: 'Chương 1: Tổng quan về Trí tuệ nhân tạo & Intelligent Agents',
        pageNumber: 18,
        textSnippet:
          'Một tác tử thông minh (Intelligent Agent) là bất cứ thực thể nào có khả năng nhận biết môi trường qua cảm biến (Sensors) và tác động lên môi trường qua cơ cấu chấp hành (Actuators). Khái niệm PEAS (Performance, Environment, Actuators, Sensors) được sử dụng để đặc tả đầy đủ bài toán thiết kế một tác tử hợp lý (Rational Agent).',
        relevanceScore: 98,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Theo chuẩn định nghĩa trong Trí tuệ nhân tạo hiện đại, một "Tác tử hợp lý" (Rational Agent) là tác tử:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Hành động nhằm tối đa hóa độ đo hiệu năng kỳ vọng dựa trên tri giác và tri thức tích lũy' },
              { id: 'opt-b', label: 'B', text: 'Mô phỏng 100% cảm xúc và phản xạ vô thức của con người' },
              { id: 'opt-c', label: 'C', text: 'Luôn đưa ra quyết định dựa trên thuật toán tìm kiếm vét cạn toàn bộ không gian' },
              { id: 'opt-d', label: 'D', text: 'Chỉ hoạt động được trong môi trường đóng hoàn toàn tĩnh' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Rational Agent hành động để đạt kết quả tốt nhất có thể dựa trên thông tin nó tiếp nhận được.',
          },
          {
            level: 'Thông hiểu',
            question: 'Trong mô hình đặc tả tác tử PEAS, các thành phần viết tắt tương ứng với:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Performance (Hiệu năng), Environment (Môi trường), Actuators (Cơ cấu chấp hành), Sensors (Cảm biến)' },
              { id: 'opt-b', label: 'B', text: 'Program, Entity, Action, State' },
              { id: 'opt-c', label: 'C', text: 'Perception, Evolution, Automation, System' },
              { id: 'opt-d', label: 'D', text: 'Process, Execution, Analysis, Security' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'PEAS là khung chuẩn để định nghĩa bài toán tác tử: Performance measure, Environment, Actuators, Sensors.',
          },
          {
            level: 'Vận dụng',
            question: 'Môi trường hoạt động của một xe ô tô tự hành (Autonomous Vehicle) được phân loại theo các thuộc tính nào?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Quan sát một phần, ngẫu nhiên, tuần tự, động, liên tục, nhiều tác tử' },
              { id: 'opt-b', label: 'B', text: 'Quan sát đầy đủ, tiền định, từng hồi, tĩnh, rời rạc, đơn tác tử' },
              { id: 'opt-c', label: 'C', text: 'Quan sát đầy đủ, ngẫu nhiên, tĩnh, liên tục, đơn tác tử' },
              { id: 'opt-d', label: 'D', text: 'Quan sát một phần, tiền định, từng hồi, động, rời rạc' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Giao thông thực tế luôn thay đổi liên tục, có nhiều phương tiện (multi-agent), bị che khuất và ngẫu nhiên.',
          },
          {
            level: 'Phân tích',
            question: 'Khi phân tích Phép thử Turing (Turing Test), giới hạn phương pháp luận lớn nhất của bài kiểm tra này là gì?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Chỉ đánh giá hành vi hội thoại mô phỏng bên ngoài của con người thay vì năng lực tư duy bản chất và giải quyết bài toán phức tạp' },
              { id: 'opt-b', label: 'B', text: 'Đòi hỏi chi phí phần cứng siêu máy tính quá tốn kém' },
              { id: 'opt-c', label: 'C', text: 'Bắt buộc máy tính phải có cơ thể vật lý giống người (Robot hình người)' },
              { id: 'opt-d', label: 'D', text: 'Không kiểm tra được khả năng xử lý số liệu của máy tính' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Turing Test chỉ đo lường sự bắt chước hành vi con người (acting humanly) thay vì tư duy hợp lý (thinking rationally).',
          },
        ],
      },

      'Chương 2': {
        chapterName: 'Chương 2: Không gian trạng thái và Thuật toán tìm kiếm Heuristic (A*, IDA*)',
        pageNumber: 65,
        textSnippet:
          'Tìm kiếm trong không gian trạng thái là nền tảng giải quyết bài toán trong AI. Thuật toán tìm kiếm Heuristic A* đánh giá mỗi nút n theo hàm f(n) = g(n) + h(n), trong đó g(n) là chi phí thực từ gốc và h(n) là hàm heuristic ước lượng chi phí đến đích. Nếu hàm h(n) là chấp nhận được (admissible), A* đảm bảo tìm được lời giải tối ưu.',
        relevanceScore: 99,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Trong thuật toán tìm kiếm Heuristic A*, hàm đánh giá tổng chi phí ước lượng của một nút n được tính theo công thức:',
            options: [
              { id: 'opt-a', label: 'A', text: 'f(n) = g(n) + h(n)' },
              { id: 'opt-b', label: 'B', text: 'f(n) = g(n) - h(n)' },
              { id: 'opt-c', label: 'C', text: 'f(n) = g(n) * h(n)' },
              { id: 'opt-d', label: 'D', text: 'f(n) = max(g(n), h(n))' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'f(n) = g(n) (chi phí đã đi) + h(n) (chi phí ước lượng còn lại tới đích).',
          },
          {
            level: 'Thông hiểu',
            question: 'Một hàm heuristic h(n) được gọi là "chấp nhận được" (Admissible Heuristic) khi và chỉ khi:',
            options: [
              { id: 'opt-a', label: 'A', text: 'h(n) không bao giờ đánh giá vượt quá chi phí thực tế nhỏ nhất từ nút n đến đích (h(n) <= h*(n))' },
              { id: 'opt-b', label: 'B', text: 'h(n) luôn nhận giá trị lớn hơn hoặc bằng chi phí thực tế' },
              { id: 'opt-c', label: 'C', text: 'h(n) nhận giá trị bằng 0 tại tất cả các nút trên đồ thị' },
              { id: 'opt-d', label: 'D', text: 'h(n) là hàm hằng số không phụ thuộc vào trạng thái đích' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Tính chấp nhận được (không đánh giá cao hơn thực tế) là điều kiện cần để A* tìm được lời giải tối ưu.',
          },
          {
            level: 'Vận dụng',
            question: 'Tại một bước duyệt của A*, nút A có g(A) = 5, h(A) = 3; nút B có g(B) = 3, h(B) = 6. Thuật toán A* sẽ chọn mở rộng nút nào tiếp theo?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Nút A vì f(A) = 8 nhỏ hơn f(B) = 9' },
              { id: 'opt-b', label: 'B', text: 'Nút B vì g(B) = 3 nhỏ hơn g(A) = 5' },
              { id: 'opt-c', label: 'C', text: 'Nút B vì h(B) = 6 lớn hơn h(A) = 3' },
              { id: 'opt-d', label: 'D', text: 'Cả hai nút ngẫu nhiên do cùng mức chi phí' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'f(A) = 5 + 3 = 8; f(B) = 3 + 6 = 9. Thuật toán A* luôn ưu tiên mở rộng nút có f(n) nhỏ nhất.',
          },
          {
            level: 'Phân tích',
            question: 'Trong thuật toán cắt tỉa Alpha-Beta áp dụng cho cây trò chơi đối kháng (Game Tree), điều kiện nào sau đây kích hoạt việc cắt tỉa nhánh?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Khi tại một nút xét duyệt xuất hiện giá trị alpha >= beta' },
              { id: 'opt-b', label: 'B', text: 'Khi giá trị alpha < beta tại tất cả các nút lá' },
              { id: 'opt-c', label: 'C', text: 'Khi cây trò chơi có độ sâu vượt quá 10 tầng' },
              { id: 'opt-d', label: 'D', text: 'Khi đối thủ đưa ra nước đi ngoài dự đoán' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Alpha là điểm sàn tốt nhất của MAX, Beta là điểm trần của MIN. Khi alpha >= beta, nhánh đó không bao giờ được chọn nên bị cắt bỏ.',
          },
        ],
      },

      'Chương 3': {
        chapterName: 'Chương 3: Cơ sở Học máy và Mạng nơ-ron nhân tạo',
        pageNumber: 142,
        textSnippet:
          'Học máy (Machine Learning) là ngành khoa học giúp máy tính tự học từ kinh nghiệm (dữ liệu). Giải thuật lan truyền ngược (Backpropagation) ứng dụng quy tắc dây chuyền của phép tính vi tích phân để tính gradient hàm mất mát và cập nhật trọng số trong mạng nơ-ron đa tầng. Hiện tượng Overfitting được kiểm soát bằng kỹ thuật Dropout và chuẩn hóa L1/L2.',
        relevanceScore: 96,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Thuật toán lan truyền ngược (Backpropagation) trong mạng nơ-ron nhân tạo sử dụng nguyên lý toán học nào để cập nhật trọng số?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Quy tắc dây chuyền của đạo hàm (Chain rule) kết hợp thuật toán hạ gradient (Gradient Descent)' },
              { id: 'opt-b', label: 'B', text: 'Định lý Bayes về xác suất hậu nghiệm' },
              { id: 'opt-c', label: 'C', text: 'Phép biến đổi Fourier nhanh (FFT)' },
              { id: 'opt-d', label: 'D', text: 'Giải thuật chia để trị và quy hoạch động' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Backpropagation tính gradient đạo hàm riêng của hàm Loss theo từng trọng số qua chain rule từ tầng cuối ngược về trước.',
          },
          {
            level: 'Thông hiểu',
            question: 'Hiện tượng Quá khớp (Overfitting) trong mô hình học máy biểu hiện như thế nào?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Mô hình đạt độ chính xác rất cao trên tập huấn luyện nhưng dự đoán kém trên tập kiểm thử mới' },
              { id: 'opt-b', label: 'B', text: 'Mô hình có độ chính xác thấp trên cả tập huấn luyện và tập kiểm thử' },
              { id: 'opt-c', label: 'C', text: 'Hàm mất mát không hội tụ sau nhiều vòng lặp huấn luyện' },
              { id: 'opt-d', label: 'D', text: 'Thời gian huấn luyện tăng theo cấp số nhân' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Overfitting xảy ra khi mô hình "học vẹt" cả nhiễu trong dữ liệu train, mất khả năng khái quát hóa (generalization).',
          },
          {
            level: 'Vận dụng',
            question: 'Để hạn chế hiện tượng Overfitting khi huấn luyện một mạng nơ-ron sâu đa tầng, kỹ sư nên ưu tiên áp dụng biện pháp nào?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Áp dụng Dropout, chuẩn hóa L2 (Weight Decay) và tăng cường dữ liệu (Data Augmentation)' },
              { id: 'opt-b', label: 'B', text: 'Tăng thêm gấp đôi số lượng tầng ẩn và số nơ-ron trên mỗi tầng' },
              { id: 'opt-c', label: 'C', text: 'Loại bỏ hoàn toàn tập kiểm định (Validation set)' },
              { id: 'opt-d', label: 'D', text: 'Đặt tốc độ học (Learning rate) lên mức tối đa' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Dropout ngắt ngẫu nhiên các liên kết nơ-ron trong quá trình train, ngăn chặn sự phụ thuộc quá mức vào các trọng số cụ thể.',
          },
          {
            level: 'Phân tích',
            question: 'Khi so sánh hàm kích hoạt ReLU và Sigmoid trong các mạng nơ-ron sâu, ưu điểm quyết định của ReLU là gì?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Khắc phục hiện tượng triệt tiêu gradient (Vanishing Gradient) ở miền dương và có tốc độ tính toán cực nhanh' },
              { id: 'opt-b', label: 'B', text: 'Luôn giới hạn giá trị đầu ra trong khoảng [0, 1]' },
              { id: 'opt-c', label: 'C', text: 'Có tính chất vi phân liên tục và đối xứng qua gốc tọa độ' },
              { id: 'opt-d', label: 'D', text: 'Không bao giờ gặp tình trạng nơ-ron bị chết (Dying neurons)' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Đạo hàm của ReLU với x > 0 là 1 hằng định, giúp gradient truyền ngược không bị suy giảm theo cấp số nhân qua nhiều tầng.',
          },
        ],
      },

      'Chương 4': {
        chapterName: 'Chương 4: Xử lý ngôn ngữ tự nhiên (NLP) & Kiến trúc Transformer/RAG',
        pageNumber: 215,
        textSnippet:
          'Kiến trúc Transformer với cơ chế tự chú ý đa đầu (Multi-Head Self-Attention) đã cách mạng hóa lĩnh vực xử lý ngôn ngữ tự nhiên. Kiến trúc RAG (Retrieval-Augmented Generation) kết hợp mô hình ngôn ngữ lớn (LLM) với cơ sở dữ liệu vector bên ngoài, truy xuất các đoạn văn bản tương đồng qua độ đo Cosine similarity để cung cấp minh chứng đối soát chính xác.',
        relevanceScore: 98,
        templates: [
          {
            level: 'Nhận biết',
            question: 'Thành phần cốt lõi tạo nên khả năng xử lý ngữ cảnh song song vượt trội của mô hình Transformer là:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Cơ chế tự chú ý đa đầu (Multi-Head Self-Attention Mechanism)' },
              { id: 'opt-b', label: 'B', text: 'Mạng nơ-ron hồi quy LSTM tuần tự' },
              { id: 'opt-c', label: 'C', text: 'Tầng tích chập 1 chiều với kích thước cửa sổ cố định' },
              { id: 'opt-d', label: 'D', text: 'Mô hình phân loại Naive Bayes kết hợp Bag-of-Words' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Self-Attention tính toán mối tương quan giữa tất cả các từ trong câu đồng thời, không cần xử lý tuần tự từng từ như RNN/LSTM.',
          },
          {
            level: 'Thông hiểu',
            question: 'Kiến trúc RAG (Retrieval-Augmented Generation) giải quyết trực tiếp thách thức lớn nào của các mô hình ngôn ngữ lớn (LLM)?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Giảm thiểu hiện tượng ảo giác (Hallucination) và cung cấp tri thức cập nhật kèm minh chứng trích dẫn nguồn' },
              { id: 'opt-b', label: 'B', text: 'Giúp mô hình LLM chạy được mà không cần card đồ họa' },
              { id: 'opt-c', label: 'C', text: 'Thay thế hoàn toàn giai đoạn tiền huấn luyện (Pre-training)' },
              { id: 'opt-d', label: 'D', text: 'Tự động dịch mã nguồn sang ngôn ngữ máy' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'RAG truy xuất văn bản thực tế từ cơ sở dữ liệu làm ngữ cảnh (Grounding), ngăn chặn LLM bịa đặt thông tin.',
          },
          {
            level: 'Vận dụng',
            question: 'Trong quy trình xây dựng hệ thống RAG phục vụ sinh đề thi từ giáo trình, thứ tự các bước chuẩn là:',
            options: [
              { id: 'opt-a', label: 'A', text: 'Bóc tách tài liệu -> Cắt đoạn (Chunking) -> Tạo Vector Embedding -> Lưu Vector DB -> Truy vấn ngữ cảnh -> Đưa vào Prompt cho LLM' },
              { id: 'opt-b', label: 'B', text: 'Nén file ZIP -> Gửi trực tiếp toàn bộ file 1000 trang vào LLM -> Lưu kết quả' },
              { id: 'opt-c', label: 'C', text: 'Dịch giáo trình sang tiếng Anh -> Tóm tắt -> Xóa bỏ văn bản gốc' },
              { id: 'opt-d', label: 'D', text: 'Tạo ngẫu nhiên câu hỏi trắc nghiệm -> Đưa vào giáo trình tìm từ khóa trùng lặp' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Đây là pipeline chuẩn của Retrieval-Augmented Generation: Document Parsing -> Chunking -> Embedding -> Vector Search -> Generation.',
          },
          {
            level: 'Phân tích',
            question: 'Khi đo lường độ tương đồng ngữ nghĩa giữa câu truy vấn và các đoạn văn bản trong Vector Database, độ đo Cosine Similarity có ưu thế gì?',
            options: [
              { id: 'opt-a', label: 'A', text: 'Đánh giá góc định hướng của hai vector ngữ nghĩa trong không gian đa chiều, không bị ảnh hưởng bởi độ dài tuyệt đối của văn bản' },
              { id: 'opt-b', label: 'B', text: 'Đo khoảng cách Euclidean tuyệt đối giữa các ký tự' },
              { id: 'opt-c', label: 'C', text: 'Đếm số lượng từ khóa giống hệt nhau xuất hiện trong hai văn bản' },
              { id: 'opt-d', label: 'D', text: 'Chỉ hoạt động được với các văn bản có độ dài dưới 10 từ' },
            ],
            correctAnswerId: 'opt-a',
            explanation: 'Cosine similarity = (A . B) / (||A|| * ||B||), chuẩn hóa theo độ dài vector nên phản ánh hướng ngữ nghĩa thuần túy.',
          },
        ],
      },
    },
  },
};

/**
 * Tìm kiếm tri thức và bộ câu hỏi phù hợp nhất dựa trên ID giáo trình và tên chương mục
 */
export function findKnowledgeForChapter(bookIdOrName: string, chapterTitle: string): ChapterKnowledge {
  // 1. Xác định giáo trình
  let book = ACADEMIC_CURRICULUM[bookIdOrName];
  if (!book) {
    if (bookIdOrName.toLowerCase().includes('tri-tue-nhan-tao') || bookIdOrName.toLowerCase().includes('ai')) {
      book = ACADEMIC_CURRICULUM['doc-tri-tue-nhan-tao-2026'];
    } else {
      book = ACADEMIC_CURRICULUM['doc-kinh-te-vi-mo-2025'];
    }
  }

  // 2. Xác định chương mục (Chương 1, Chương 2, Chương 3, Chương 4, Chương 5)
  const normalizedTitle = chapterTitle.toLowerCase();
  for (const [key, knowledge] of Object.entries(book.chapters)) {
    const k = key.toLowerCase();
    if (normalizedTitle.includes(k) || normalizedTitle.includes(knowledge.chapterName.toLowerCase().slice(0, 10))) {
      return knowledge;
    }
  }

  // Fallback to first chapter of the book
  const firstKey = Object.keys(book.chapters)[0];
  return book.chapters[firstKey];
}
