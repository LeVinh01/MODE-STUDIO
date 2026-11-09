<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminProductImageUploadRequest extends FormRequest
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
            'image'      => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'color_id'   => ['nullable', 'integer', 'exists:colors,id'],
            'alt_text'   => ['nullable', 'string', 'max:255'],
            'is_main'    => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required'     => 'Vui lòng chọn tệp hình ảnh để tải lên.',
            'image.file'         => 'Tệp tải lên không hợp lệ.',
            'image.image'        => 'Tệp tải lên phải là hình ảnh.',
            'image.mimes'        => 'Hình ảnh chỉ chấp nhận định dạng jpeg, png, jpg, webp (không hỗ trợ SVG).',
            'image.max'          => 'Kích thước hình ảnh tối đa là 2MB.',
            'color_id.exists'    => 'Màu sắc không tồn tại.',
            'color_id.integer'   => 'Mã màu sắc không hợp lệ.',
            'alt_text.max'       => 'Văn bản thay thế tối đa 255 ký tự.',
            'sort_order.integer' => 'Thứ tự hiển thị phải là số nguyên.',
            'sort_order.min'     => 'Thứ tự hiển thị không được âm.',
        ];
    }
}
