<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Chuẩn hóa dữ liệu trước khi validate: trim họ tên và số điện thoại
     */
    protected function prepareForValidation(): void
    {
        $mergeData = [];

        if ($this->has('full_name')) {
            $mergeData['full_name'] = trim((string) $this->input('full_name'));
        }

        if ($this->has('phone')) {
            $rawPhone = $this->input('phone');
            $mergeData['phone'] = $rawPhone !== null && trim((string) $rawPhone) !== ''
                ? trim((string) $rawPhone)
                : null;
        }

        if (!empty($mergeData)) {
            $this->merge($mergeData);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:150'],
            'phone'     => ['nullable', 'string', 'regex:/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => 'Họ và tên là bắt buộc.',
            'full_name.string'   => 'Họ và tên phải là chuỗi ký tự.',
            'full_name.max'      => 'Họ và tên không được vượt quá 150 ký tự.',
            'phone.string'       => 'Số điện thoại phải là chuỗi ký tự.',
            'phone.regex'        => 'Số điện thoại không hợp lệ (yêu cầu số điện thoại Việt Nam 10 chữ số).',
        ];
    }
}
