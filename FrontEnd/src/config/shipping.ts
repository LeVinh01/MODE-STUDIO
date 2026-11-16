export const SHIPPING_CARRIERS = [
  'GHN',
  'GHTK',
  'Viettel Post',
  'J&T Express',
  'Khác',
] as const

export type ShippingCarrier = (typeof SHIPPING_CARRIERS)[number]
