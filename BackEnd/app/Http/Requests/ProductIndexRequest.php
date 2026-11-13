<?php

namespace App\Http\Requests;

use App\Enums\ProductGender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Chuyển chuỗi comma-separated color/size thành mảng số nguyên để validate
        if ($this->has('color') && is_string($this->color)) {
            $colors = array_filter(array_map('trim', explode(',', $this->color)), fn($val) => $val !== '');
            $this->merge(['color_ids' => $colors]);
        }

        if ($this->has('size') && is_string($this->size)) {
            $sizes = array_filter(array_map('trim', explode(',', $this->size)), fn($val) => $val !== '');
            $this->merge(['size_ids' => $sizes]);
        }
    }

    public function rules(): array
    {
        return [
            'category'   => ['sometimes', 'string', 'max:150'],
            'brand'      => ['sometimes', 'string', 'max:150'],
            'color'      => ['sometimes', 'string'],
            'color_ids'  => ['sometimes', 'array'],
            'color_ids.*'=> ['integer', 'min:1'],
            'size'       => ['sometimes', 'string'],
            'size_ids'   => ['sometimes', 'array'],
            'size_ids.*' => ['integer', 'min:1'],
            'min_price'  => ['sometimes', 'integer', 'min:0'],
            'max_price'  => ['sometimes', 'integer', 'min:0', 'gte:min_price'],
            'gender'     => ['sometimes', 'string', Rule::enum(ProductGender::class)],
            'search'     => ['sometimes', 'nullable', 'string', 'max:150'],
            'q'          => ['sometimes', 'nullable', 'string', 'max:150'],
            'featured'   => ['sometimes', 'boolean'],
            'sort'       => ['sometimes', 'string', Rule::in(['newest', 'price_asc', 'price_desc', 'best_selling'])],
            'per_page'   => ['sometimes', 'integer', 'min:1', 'max:48'],
            'page'       => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'search.string' => 'Từ khóa tìm kiếm phải là chuỗi ký tự.',
            'search.max'    => 'Từ khóa tìm kiếm không được vượt quá 150 ký tự.',
            'q.string'      => 'Từ khóa tìm kiếm phải là chuỗi ký tự.',
            'q.max'         => 'Từ khóa tìm kiếm không được vượt quá 150 ký tự.',
            'category.max'  => 'Slug danh mục không được vượt quá 150 ký tự.',
            'brand.max'     => 'Slug thương hiệu không được vượt quá 150 ký tự.',
            'min_price.min' => 'Giá tối thiểu không được âm.',
            'max_price.min' => 'Giá tối đa không được âm.',
            'max_price.gte' => 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.',
        ];
    }
}
