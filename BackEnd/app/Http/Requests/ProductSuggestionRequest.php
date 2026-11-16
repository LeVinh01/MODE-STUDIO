<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductSuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('q') && is_string($this->q)) {
            $this->merge(['q' => trim($this->q)]);
        }
    }

    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:2', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'q.required' => 'Vui lòng nhập từ khóa tìm kiếm.',
            'q.string'   => 'Từ khóa tìm kiếm phải là chuỗi ký tự.',
            'q.min'      => 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.',
            'q.max'      => 'Từ khóa tìm kiếm không được vượt quá 150 ký tự.',
        ];
    }
}
