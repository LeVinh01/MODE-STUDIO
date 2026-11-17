<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminColorStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && is_string($this->name)) {
            $this->merge(['name' => trim($this->name)]);
        }
        if ($this->has('hex_code') && is_string($this->hex_code)) {
            $this->merge(['hex_code' => strtolower(trim($this->hex_code))]);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:50', 'unique:colors,name'],
            'hex_code' => [
                'required',
                'string',
                'regex:/^#([A-Fa-f0-9]{6})$/',
                'unique:colors,hex_code',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => 'Vui lòng nhập tên màu sắc.',
            'name.string'       => 'Tên màu sắc phải là chuỗi ký tự.',
            'name.max'          => 'Tên màu sắc tối đa 50 ký tự.',
            'name.unique'       => 'Tên màu sắc này đã tồn tại trong hệ thống.',
            'hex_code.required' => 'Vui lòng nhập mã màu Hex.',
            'hex_code.regex'    => 'Mã màu phải có định dạng #RRGGBB hợp lệ (ví dụ: #111111).',
            'hex_code.unique'   => 'Mã màu Hex này đã tồn tại trong hệ thống.',
        ];
    }
}
