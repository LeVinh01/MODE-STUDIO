<?php

return [
    'cart' => [
        // Giới hạn số lượng tối đa cho mỗi dòng sản phẩm trong giỏ hàng
        'max_item_quantity' => (int) env('CART_MAX_ITEM_QUANTITY', 20),
    ],

    'shipping' => [
        // Ngưỡng miễn phí vận chuyển (khớp FrontEnd STORE_POLICIES: 2.000.000 đ)
        'free_threshold' => (int) env('SHIPPING_FREE_THRESHOLD', 2000000),

        // Phí vận chuyển tiêu chuẩn cho đơn dưới ngưỡng (mặc định 30.000 đ)
        'standard_fee'   => (int) env('SHIPPING_STANDARD_FEE', 30000),
    ],
];
