<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminVariantUpdateRequest extends FormRequest
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
            'color_id'  => ['sometimes', 'required', 'integer', 'exists:colors,id'],
            'size_id'   => ['sometimes', 'required', 'integer', 'exists:sizes,id'],
            'sku'       => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'note'      => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'color_id.required' => 'Vui lòng chọn màu sắc.',
            'color_id.exists'   => 'Màu sắc không tồn tại.',
            'color_id.integer'  => 'Mã màu sắc không hợp lệ.',
            'size_id.required'  => 'Vui lòng chọn kích cỡ.',
            'size_id.exists'    => 'Kích cỡ không tồn tại.',
            'size_id.integer'   => 'Mã kích cỡ không hợp lệ.',
            'sku.max'           => 'Mã SKU tối đa 100 ký tự.',
            'note.max'          => 'Ghi chú tối đa 255 ký tự.',
        ];
    }
}
