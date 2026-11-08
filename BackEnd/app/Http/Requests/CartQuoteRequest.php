<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartQuoteRequest extends FormRequest
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
            'items'              => ['present', 'array', 'max:50'],
            'items.*.variant_id' => ['required', 'integer'],
            'items.*.quantity'   => ['required', 'integer', 'min:1', "max:{$maxQuantity}"],
        ];
    }

    public function messages(): array
    {
        $maxQuantity = config('shop.cart.max_item_quantity', 20);

        return [
            'items.present'              => 'Vui lòng cung cấp danh sách sản phẩm.',
            'items.array'                => 'Danh sách sản phẩm phải là một mảng.',
            'items.max'                  => 'Danh sách sản phẩm trong một lần tính giá không được vượt quá 50 mục.',
            'items.*.variant_id.required'=> 'Vui lòng cung cấp mã biến thể cho từng sản phẩm.',
            'items.*.variant_id.integer' => 'Mã biến thể phải là số nguyên.',
            'items.*.quantity.required'  => 'Vui lòng cung cấp số lượng cho từng sản phẩm.',
            'items.*.quantity.integer'   => 'Số lượng phải là số nguyên.',
            'items.*.quantity.min'       => 'Số lượng của mỗi sản phẩm phải từ 1 trở lên.',
            'items.*.quantity.max'       => "Số lượng tối đa cho mỗi sản phẩm là {$maxQuantity}.",
        ];
    }
}
