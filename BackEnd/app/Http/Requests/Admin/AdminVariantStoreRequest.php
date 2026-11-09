<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminVariantStoreRequest extends FormRequest
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
        return [
            'color_id'       => ['required', 'integer', 'exists:colors,id'],
            'size_id'        => ['required', 'integer', 'exists:sizes,id'],
            'sku'            => ['nullable', 'string', 'max:100'],
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'is_active'      => ['nullable', 'boolean'],
            'note'           => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'color_id.required'       => 'Vui lòng chọn màu sắc.',
            'color_id.exists'         => 'Màu sắc không tồn tại.',
            'color_id.integer'        => 'Mã màu sắc không hợp lệ.',
            'size_id.required'        => 'Vui lòng chọn kích cỡ.',
            'size_id.exists'          => 'Kích cỡ không tồn tại.',
            'size_id.integer'         => 'Mã kích cỡ không hợp lệ.',
            'sku.max'                 => 'Mã SKU tối đa 100 ký tự.',
            'stock_quantity.required' => 'Vui lòng nhập số lượng tồn kho ban đầu.',
            'stock_quantity.integer'  => 'Số lượng tồn kho phải là số nguyên.',
            'stock_quantity.min'      => 'Số lượng tồn kho không được âm.',
            'stock_quantity.max'      => 'Số lượng tồn kho vượt quá giới hạn.',
            'note.max'                => 'Ghi chú tối đa 255 ký tự.',
        ];
    }
}
