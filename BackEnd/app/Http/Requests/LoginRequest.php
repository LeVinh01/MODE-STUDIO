<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Chuẩn hóa email: trim và chuyển về chữ thường
     */
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
            'email'    => ['required', 'string', 'email', 'max:150'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required'    => 'Email là bắt buộc.',
            'email.string'      => 'Email phải là chuỗi ký tự.',
            'email.email'       => 'Email không đúng định dạng.',
            'email.max'         => 'Email không được vượt quá 150 ký tự.',
            'password.required' => 'Mật khẩu là bắt buộc.',
            'password.string'   => 'Mật khẩu phải là chuỗi ký tự.',
        ];
    }
}
