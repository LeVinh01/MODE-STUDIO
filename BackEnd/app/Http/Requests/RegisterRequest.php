<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Chuẩn hóa dữ liệu trước khi validate: trim và chuyển email về chữ thường
     */
    protected function prepareForValidation(): void
    {
        $mergeData = [];

        if ($this->has('email')) {
            $mergeData['email'] = strtolower(trim((string) $this->input('email')));
        }

        if ($this->has('full_name')) {
            $mergeData['full_name'] = trim((string) $this->input('full_name'));
        }

        if ($this->has('phone')) {
            $rawPhone = $this->input('phone');
            $mergeData['phone'] = $rawPhone !== null ? trim((string) $rawPhone) : null;
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
            'email'     => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'password'  => ['required', 'string', 'min:8', 'confirmed'],
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
            'email.required'     => 'Email là bắt buộc.',
            'email.string'       => 'Email phải là chuỗi ký tự.',
            'email.email'        => 'Email không đúng định dạng.',
            'email.max'          => 'Email không được vượt quá 150 ký tự.',
            'email.unique'       => 'Email này đã được sử dụng.',
            'phone.string'       => 'Số điện thoại phải là chuỗi ký tự.',
            'phone.max'          => 'Số điện thoại không được vượt quá 20 ký tự.',
            'password.required'  => 'Mật khẩu là bắt buộc.',
            'password.string'    => 'Mật khẩu phải là chuỗi ký tự.',
            'password.min'       => 'Mật khẩu phải có tối thiểu 8 ký tự.',
            'password.confirmed' => 'Xác nhận mật khẩu không khớp.',
        ];
    }
}
