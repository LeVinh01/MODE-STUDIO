/**
 * Bảng thông số quy đổi kích cỡ chuẩn MODE STUDIO
 * Nguồn chân lý duy nhất (Single Source of Truth) phục vụ Modal Size Guide trên PDP và trang /size-guide
 */

export interface SizeGuideRow {
  size: string
  bust: string // Vòng ngực (cm)
  waist: string // Vòng eo (cm)
  hips: string // Vòng mông (cm)
  height: string // Chiều cao gợi ý (cm)
  weight: string // Cân nặng gợi ý (kg)
}

export const SIZE_GUIDE_DATA: SizeGuideRow[] = [
  {
    size: 'S',
    bust: '82 - 86',
    waist: '64 - 68',
    hips: '88 - 92',
    height: '150 - 160',
    weight: '43 - 48',
  },
  {
    size: 'M',
    bust: '86 - 90',
    waist: '68 - 72',
    hips: '92 - 96',
    height: '155 - 165',
    weight: '49 - 54',
  },
  {
    size: 'L',
    bust: '90 - 94',
    waist: '72 - 76',
    hips: '96 - 100',
    height: '160 - 170',
    weight: '55 - 60',
  },
  {
    size: 'XL',
    bust: '94 - 98',
    waist: '76 - 80',
    hips: '100 - 104',
    height: '165 - 175',
    weight: '61 - 66',
  },
]

export const SIZE_MEASUREMENT_TIPS = [
  'Vòng ngực: Đo quanh điểm nở nang nhất của ngực, giữ thước dây ngang bằng phẳng phía sau lưng.',
  'Vòng eo: Đo quanh phần hẹp nhất của vòng eo, thường cách rốn khoảng 2-3 cm phía trên.',
  'Vòng mông: Khép hai chân đứng thẳng, đo quanh điểm nở nang nhất của vòng mông.',
  'Gợi ý từ xưởng may: Nếu số đo của bạn nằm ở khoảng giao giữa hai kích cỡ, MODE STUDIO khuyên bạn nên chọn kích cỡ lớn hơn để có trải nghiệm vừa vặn, thanh lịch nhất.',
]
