<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => strtolower(trim((string) $this->input('email'))),
            ]);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email'                 => ['required', 'string', 'email'],
            'token'                 => ['required', 'string'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required'                 => 'Email là bắt buộc.',
            'email.string'                   => 'Email phải là chuỗi ký tự.',
            'email.email'                    => 'Địa chỉ email không đúng định dạng.',
            'token.required'                 => 'Mã token đặt lại mật khẩu là bắt buộc.',
            'token.string'                   => 'Mã token phải là chuỗi ký tự.',
            'password.required'              => 'Mật khẩu là bắt buộc.',
            'password.string'                => 'Mật khẩu phải là chuỗi ký tự.',
            'password.min'                   => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'password.confirmed'             => 'Xác nhận mật khẩu không khớp.',
            'password_confirmation.required' => 'Xác nhận mật khẩu là bắt buộc.',
            'password_confirmation.string'   => 'Xác nhận mật khẩu phải là chuỗi ký tự.',
        ];
    }
}
