<?php

namespace App\Http\Requests\Admin;

use App\Enums\ProductStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminProductIndexRequest extends FormRequest
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
            'status'      => ['nullable', 'string', Rule::enum(ProductStatus::class)],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id'    => ['nullable', 'integer', 'exists:brands,id'],
            'search'      => ['nullable', 'string', 'max:150'],
            'page'        => ['nullable', 'integer', 'min:1'],
            'per_page'    => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.Illuminate\Validation\Rules\Enum' => 'Trạng thái sản phẩm không hợp lệ.',
            'status.enum'                             => 'Trạng thái sản phẩm không hợp lệ.',
            'category_id.exists'                      => 'Danh mục không tồn tại.',
            'category_id.integer'                     => 'Mã danh mục không hợp lệ.',
            'brand_id.exists'                         => 'Thương hiệu không tồn tại.',
            'brand_id.integer'                        => 'Mã thương hiệu không hợp lệ.',
            'search.max'                              => 'Từ khóa tìm kiếm tối đa 150 ký tự.',
            'page.integer'                            => 'Số trang phải là số nguyên.',
            'page.min'                                => 'Số trang phải từ 1 trở lên.',
            'per_page.integer'                        => 'Số lượng sản phẩm mỗi trang phải là số nguyên.',
            'per_page.min'                            => 'Số lượng sản phẩm mỗi trang phải từ 1 trở lên.',
            'per_page.max'                            => 'Số lượng sản phẩm mỗi trang tối đa là 50.',
        ];
    }
}
