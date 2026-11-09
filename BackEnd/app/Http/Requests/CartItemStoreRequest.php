<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CartItemStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxQuantity = config('shop.cart.max_item_quantity', 20);

        return [
            'variant_id' => [
                'required',
                'integer',
                Rule::exists('product_variants', 'id')->whereNull('deleted_at'),
            ],
            'quantity'   => ['required', 'integer', 'min:1', "max:{$maxQuantity}"],
        ];
    }

    public function messages(): array
    {
        $maxQuantity = config('shop.cart.max_item_quantity', 20);

        return [
            'variant_id.required' => 'Vui lòng chọn biến thể sản phẩm.',
            'variant_id.integer'  => 'Mã biến thể sản phẩm không hợp lệ.',
            'variant_id.exists'   => 'Biến thể sản phẩm không tồn tại.',
            'quantity.required'   => 'Vui lòng nhập số lượng.',
            'quantity.integer'    => 'Số lượng phải là số nguyên.',
            'quantity.min'        => 'Số lượng phải từ 1 trở lên.',
            'quantity.max'        => "Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$maxQuantity}.",
        ];
    }
}
