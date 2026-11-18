<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminCategoryImageUploadRequest extends FormRequest
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
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048', // Tối đa 2MB (2048 KB)
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Vui lòng chọn tệp hình ảnh để tải lên.',
            'image.file'     => 'Tệp tải lên không hợp lệ.',
            'image.image'    => 'Tệp tải lên phải là hình ảnh.',
            'image.mimes'    => 'Hình ảnh đại diện phải có định dạng JPG, JPEG, PNG hoặc WEBP.',
            'image.max'      => 'Dung lượng hình ảnh đại diện tối đa là 2MB.',
        ];
    }
}
