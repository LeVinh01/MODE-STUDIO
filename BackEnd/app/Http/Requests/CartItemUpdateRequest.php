<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartItemUpdateRequest extends FormRequest
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
            'quantity' => ['required', 'integer', 'min:1', "max:{$maxQuantity}"],
        ];
    }

    public function messages(): array
    {
        $maxQuantity = config('shop.cart.max_item_quantity', 20);

        return [
            'quantity.required' => 'Vui lòng nhập số lượng.',
            'quantity.integer'  => 'Số lượng phải là số nguyên.',
            'quantity.min'      => 'Số lượng phải từ 1 trở lên.',
            'quantity.max'      => "Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$maxQuantity}.",
        ];
    }
}
