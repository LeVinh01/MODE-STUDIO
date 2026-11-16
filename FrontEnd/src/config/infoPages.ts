import { STORE_INFO, STORE_POLICIES } from './store'
import { SIZE_MEASUREMENT_TIPS } from './sizeGuide'

export interface InfoPageSection {
  title?: string
  paragraphs?: string[]
  bulletPoints?: string[]
  isContactCard?: boolean
  isStoreCard?: boolean
  isSizeTable?: boolean
}

export interface InfoPageConfig {
  id: string
  title: string
  subtitle?: string
  breadcrumbLabel: string
  sections: InfoPageSection[]
}

// Lưu ý: Toàn bộ nội dung dưới đây là nội dung mẫu chuẩn thương mại điện tử thời trang may đo, chờ chủ cửa hàng duyệt và cập nhật chính thức khi vận hành thực tế.

export const INFO_PAGES_CONFIG: Record<string, InfoPageConfig> = {
  // 1. Chính sách đổi trả (/policy/returns)
  'policy-returns': {
    id: 'policy-returns',
    title: 'Chính Sách Đổi Trả Sản Phẩm',
    subtitle: 'Cam kết chất lượng phục vụ và đảm bảo sự hài lòng tuyệt đối của quý khách',
    breadcrumbLabel: 'Chính sách đổi trả',
    sections: [
      {
        title: '1. Thời Hạn Đổi Trả',
        paragraphs: [
          // Nội dung mẫu: Thời hạn đổi trả mẫu 7 ngày theo tiêu chuẩn mua sắm thời trang
          `MODE STUDIO hỗ trợ đổi size hoặc đổi mẫu trong vòng 7 ngày kể từ ngày quý khách nhận được kiện hàng thành công từ đối tác vận chuyển.`,
        ],
      },
      {
        title: '2. Điều Kiện Áp Dụng Đổi Trả',
        paragraphs: [
          'Để được hỗ trợ đổi trả thuận tiện và nhanh chóng nhất, sản phẩm cần đáp ứng các điều kiện tiêu chuẩn sau:',
        ],
        bulletPoints: [
          'Sản phẩm còn nguyên tem mác, nhãn bảo hành và bao bì nguyên vẹn của MODE STUDIO.',
          'Sản phẩm chưa qua giặt tẩy, chưa qua sử dụng, không dính mùi nước hoa hoặc các hóa mỹ phẩm lạ.',
          'Sản phẩm không bị rách, sờn chỉ, đứt cúc hoặc biến dạng do tác động bên ngoài.',
          'Có thông tin mã đơn hàng hoặc số điện thoại đặt hàng hợp lệ trên hệ thống.',
        ],
      },
      {
        title: '3. Quy Trình Thực Hiện Đổi Trả',
        paragraphs: [
          `Quý khách vui lòng liên hệ hotline hỗ trợ ${STORE_INFO.hotline} hoặc gửi email tới ${STORE_INFO.email} kèm mã đơn hàng và hình ảnh sản phẩm cần hỗ trợ.`,
          'Chuyên viên chăm sóc khách hàng của MODE STUDIO sẽ hướng dẫn nhân viên giao nhận đến tận nơi tiếp nhận kiện hàng đổi trả chu đáo và giao lại trang phục vừa vặn cho quý khách.',
        ],
      },
    ],
  },

  // 2. Hướng dẫn chọn size (/size-guide)
  'size-guide': {
    id: 'size-guide',
    title: 'Hướng Dẫn Chọn Size & Bảng Quy Đổi',
    subtitle: 'Tìm kiếm kích cỡ may đo hoàn hảo chuẩn xác cho vóc dáng của bạn',
    breadcrumbLabel: 'Hướng dẫn chọn size',
    sections: [
      {
        title: 'Bảng Thông Số Kích Cỡ Chuẩn',
        paragraphs: [
          'Dưới đây là bảng quy đổi số đo kích cỡ tiêu chuẩn (cm) áp dụng cho các dòng sản phẩm may đo sẵn của MODE STUDIO:',
        ],
        isSizeTable: true,
      },
      {
        title: 'Cách Đo Kích Thước Cơ Thể Chính Xác',
        bulletPoints: SIZE_MEASUREMENT_TIPS,
      },
    ],
  },

  // 3. Giao hàng & vận chuyển (/shipping)
  shipping: {
    id: 'shipping',
    title: 'Chính Sách Giao Hàng & Vận Chuyển',
    subtitle: 'Quy trình đóng gói sang trọng và thời gian giao nhận toàn quốc',
    breadcrumbLabel: 'Giao hàng & Vận chuyển',
    sections: [
      {
        title: '1. Cước Phí Vận Chuyển Tiêu Chuẩn',
        paragraphs: [
          // Nội dung mẫu: phí ship 30.000 đ, miễn phí từ 2.000.000 đ
          `Phí vận chuyển tiêu chuẩn cho mọi đơn hàng toàn quốc là ${(
            STORE_POLICIES.standardShippingFee
          ).toLocaleString('vi-VN')} đ.`,
          `MODE STUDIO MIỄN PHÍ VẬN CHUYỂN cho mọi đơn hàng có tổng giá trị từ ${(
            STORE_POLICIES.freeShippingThreshold
          ).toLocaleString('vi-VN')} đ trở lên.`,
        ],
      },
      {
        title: '2. Thời Gian Giao Hàng Dự Kiến',
        paragraphs: [
          'Kiện hàng thời trang được đội ngũ kho MODE STUDIO kiểm tra chất lượng và đóng gói cẩn trọng trước khi bàn giao đơn vị vận chuyển:',
        ],
        bulletPoints: [
          'Khu vực nội thành Hà Nội & TP. Hồ Chí Minh: Dự kiến giao nhận từ 1 - 2 ngày làm việc.',
          'Các tỉnh, thành phố khác: Dự kiến giao nhận từ 2 - 4 ngày làm việc.',
          'Khu vực huyện xã vùng sâu: Dự kiến giao nhận từ 3 - 5 ngày làm việc.',
        ],
      },
      {
        title: '3. Phương Thức Thanh Toán Khi Nhận Hàng',
        paragraphs: [
          // Nội dung mẫu: hiện tại cửa hàng hỗ trợ phương thức thanh toán khi nhận hàng (COD)
          'Hiện tại, hệ thống hỗ trợ phương thức Thanh toán khi nhận hàng (COD). Quý khách có quyền đồng kiểm tra bao bì bên ngoài kiện hàng cùng nhân viên giao phát và thanh toán tiền mặt trực tiếp khi nhận sản phẩm.',
        ],
      },
    ],
  },

  // 4. Câu hỏi thường gặp (/faq)
  faq: {
    id: 'faq',
    title: 'Câu Hỏi Thường Gặp (FAQ)',
    subtitle: 'Giải đáp những thắc mắc phổ biến về mua sắm và sản phẩm tại MODE STUDIO',
    breadcrumbLabel: 'Câu hỏi thường gặp',
    sections: [
      {
        title: '1. Làm thế nào để đặt hàng tại website MODE STUDIO?',
        paragraphs: [
          'Quý khách chỉ cần chọn sản phẩm ưng ý, chọn màu sắc và kích cỡ phù hợp, sau đó bấm "Thêm vào giỏ hàng" hoặc chuyển thẳng tới trang "Thanh toán". Điền địa chỉ nhận hàng và xác nhận đặt đơn.',
        ],
      },
      {
        title: '2. Tôi có thể kiểm tra sản phẩm trước khi thanh toán không?',
        paragraphs: [
          'Có. Với phương thức thanh toán khi nhận hàng (COD), quý khách hoàn toàn có thể kiểm tra tình trạng đóng gói bên ngoài của kiện hàng trước khi thanh toán cho nhân viên giao vận.',
        ],
      },
      {
        title: '3. Phí vận chuyển được tính như thế nào?',
        paragraphs: [
          `Đơn hàng có tổng trị giá từ ${(
            STORE_POLICIES.freeShippingThreshold
          ).toLocaleString('vi-VN')} đ được miễn phí giao hàng toàn quốc. Đơn hàng dưới mức này có cước phí tiêu chuẩn là ${(
            STORE_POLICIES.standardShippingFee
          ).toLocaleString('vi-VN')} đ.`,
        ],
      },
      {
        title: '4. Tôi cần làm gì nếu trang phục mặc không vừa vặn?',
        paragraphs: [
          `MODE STUDIO hỗ trợ đổi kích cỡ hoặc đổi mẫu trong vòng 7 ngày kể từ khi quý khách nhận hàng. Vui lòng liên hệ hotline ${STORE_INFO.hotline} để nhân viên tiếp nhận và hỗ trợ đổi tận nơi chu đáo.`,
        ],
      },
    ],
  },

  // 5. Câu chuyện thương hiệu (/about)
  about: {
    id: 'about',
    title: 'Câu Chuyện Thương Hiệu',
    subtitle: 'Hành trình kiến tạo chuẩn mực thời trang may đo thanh lịch và trường tồn',
    breadcrumbLabel: 'Về MODE STUDIO',
    sections: [
      {
        title: 'Khởi Nguồn Cảm Hứng',
        paragraphs: [
          'Được thành lập với khát vọng tôn vinh vẻ đẹp tinh tế của trang phục may đo hiện đại, MODE STUDIO hướng tới việc kiến tạo tủ đồ vượt thời gian cho những cá nhân yêu chuộng sự chỉn chu và tối giản.',
          'Mỗi thiết kế của chúng tôi là sự giao thoa hài hòa giữa kỹ thuật cắt may truyền thống chuẩn mực và hơi thở thẩm mỹ đương đại. Chúng tôi tin rằng trang phục không chỉ để mặc, mà là một ngôn ngữ biểu đạt sự tự tin và phong thái của người sở hữu.',
        ],
      },
      {
        title: 'Chất Liệu Thượng Hạng',
        paragraphs: [
          'Chúng tôi ưu tiên tuyển chọn các dòng sợi tự nhiên thượng hạng như lụa tơ tằm, len lông cừu nguyên chất (Wool 130s), đũi dệt thoi và cotton hữu cơ. Sự êm ái trên làn da cùng độ rũ tự nhiên là cam kết chất lượng hàng đầu của MODE STUDIO.',
        ],
      },
    ],
  },

  // 6. Triết lý thiết kế (/editorial)
  editorial: {
    id: 'editorial',
    title: 'Triết Lý Thiết Kế & Nghệ Thuật May Đo',
    subtitle: 'Nét tối giản sang trọng được đúc kết từ kỹ nghệ chế tác tinh xảo',
    breadcrumbLabel: 'Triết lý thiết kế',
    sections: [
      {
        title: 'Tối Giản Nhưng Không Đơn Điệu',
        paragraphs: [
          'Phong cách thiết kế của MODE STUDIO bám sát triết lý "Less is More" - loại bỏ các chi tiết rườm rà không cần thiết để tập trung vào phom dáng kiến trúc và đường may chuẩn xác đến từng milimet.',
          'Từng chiếc ve áo, đường xẻ lưng hay nếp ly quần đều được tính toán tỉ mỉ nhằm tôn vinh vóc dáng người mặc một cách tự nhiên và thoải mái nhất.',
        ],
      },
      {
        title: 'Bền Vững Trong Từng Đường Kim',
        paragraphs: [
          'Thời trang nhanh dần qua đi, nhưng giá trị của một trang phục may đo tinh tế sẽ luôn ở lại. Bằng cách sử dụng chất liệu tự nhiên bền bỉ và gam màu trung tính nhã nhặn, các thiết kế của MODE STUDIO đồng hành cùng bạn qua nhiều mùa thời trang mà không bao giờ lỗi mốt.',
        ],
      },
    ],
  },

  // 7. Hệ thống showroom (/stores)
  stores: {
    id: 'stores',
    title: 'Hệ Thống Showroom & Không Gian Trải Nghiệm',
    subtitle: 'Trải nghiệm không gian mua sắm may đo sang trọng và dịch vụ tư vấn cá nhân hóa',
    breadcrumbLabel: 'Hệ thống showroom',
    sections: [
      {
        title: 'Showroom Chính Thức Tại Hà Nội',
        paragraphs: [
          'Không gian showroom MODE STUDIO được bài trí theo phong cách tối giản thanh lịch, nơi quý khách có thể trực tiếp chạm vào các chất liệu vải cao cấp và nhận tư vấn fitting phom dáng từ các chuyên gia thời trang:',
        ],
        isStoreCard: true,
      },
      {
        title: 'Dịch Vụ Tại Showroom',
        bulletPoints: [
          'Tư vấn phối đồ và định hình phong cách cá nhân hoàn toàn miễn phí.',
          'Đo đạc và chỉnh sửa trang phục theo số đo riêng.',
          'Thưởng thức trà cao cấp trong không gian âm nhạc thư thái.',
        ],
      },
    ],
  },

  // 8. Liên hệ hợp tác (/contact)
  contact: {
    id: 'contact',
    title: 'Liên Hệ & Hợp Tác',
    subtitle: 'Kết nối cùng bộ phận chăm sóc khách hàng và đối tác của MODE STUDIO',
    breadcrumbLabel: 'Liên hệ',
    sections: [
      {
        title: 'Thông Tin Liên Lạc Chính Thức',
        paragraphs: [
          'Quý khách hoặc đối tác có nhu cầu liên hệ, vui lòng sử dụng các kênh thông tin chính thức dưới đây. Đội ngũ chăm sóc khách hàng luôn sẵn sàng lắng nghe và phản hồi tận tâm:',
        ],
        isContactCard: true,
      },
    ],
  },
}
