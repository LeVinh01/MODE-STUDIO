<?php

namespace App\Http\Requests\Admin;

use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminProductUpdateRequest extends FormRequest
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
        $productId = $this->route('id') ?? $this->route('product');

        return [
            'name'             => ['sometimes', 'required', 'string', 'max:255'],
            'slug'             => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                Rule::unique('products', 'slug')->ignore($productId),
            ],
            'description'      => ['nullable', 'string'],
            'material'         => ['nullable', 'string', 'max:255'],
            'gender'           => ['sometimes', 'required', 'string', Rule::enum(ProductGender::class)],
            'category_id'      => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'brand_id'         => ['sometimes', 'required', 'integer', 'exists:brands,id'],
            'base_price'       => ['sometimes', 'required', 'integer', 'min:0', 'max:999999999999'],
            'compare_at_price' => ['nullable', 'integer', 'max:999999999999'],
            'status'           => ['sometimes', 'nullable', 'string', Rule::enum(ProductStatus::class)],
            'is_featured'      => ['nullable', 'boolean'],
            'published_at'     => ['nullable', 'date'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $compareAtPrice = $this->input('compare_at_price');
            if ($compareAtPrice !== null) {
                $basePrice = $this->input('base_price');
                if ($basePrice === null) {
                    $productId = $this->route('id') ?? $this->route('product');
                    $product = Product::find($productId);
                    $basePrice = $product?->base_price;
                }
                if ($basePrice !== null && (int) $compareAtPrice < (int) $basePrice) {
                    $validator->errors()->add(
                        'compare_at_price',
                        'Giá niêm yết so sánh phải lớn hơn hoặc bằng giá bán.'
                    );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'name.required'             => 'Vui lòng nhập tên sản phẩm.',
            'name.max'                  => 'Tên sản phẩm tối đa 255 ký tự.',
            'slug.unique'               => 'Slug đã tồn tại, vui lòng chọn slug khác.',
            'slug.max'                  => 'Đường dẫn (slug) tối đa 255 ký tự.',
            'gender.required'           => 'Vui lòng chọn giới tính.',
            'gender.enum'               => 'Giới tính không hợp lệ.',
            'gender.Illuminate\Validation\Rules\Enum' => 'Giới tính không hợp lệ.',
            'category_id.required'      => 'Vui lòng chọn danh mục.',
            'category_id.exists'        => 'Danh mục không tồn tại.',
            'category_id.integer'       => 'Mã danh mục không hợp lệ.',
            'brand_id.required'         => 'Vui lòng chọn thương hiệu.',
            'brand_id.exists'           => 'Thương hiệu không tồn tại.',
            'brand_id.integer'          => 'Mã thương hiệu không hợp lệ.',
            'base_price.required'       => 'Vui lòng nhập giá gốc.',
            'base_price.integer'        => 'Giá gốc phải là số nguyên.',
            'base_price.min'            => 'Giá gốc không được âm.',
            'base_price.max'            => 'Giá gốc vượt quá giới hạn cho phép.',
            'compare_at_price.integer'  => 'Giá niêm yết so sánh phải là số nguyên.',
            'compare_at_price.max'      => 'Giá niêm yết so sánh vượt quá giới hạn cho phép.',
            'status.enum'               => 'Trạng thái sản phẩm không hợp lệ.',
            'status.Illuminate\Validation\Rules\Enum' => 'Trạng thái sản phẩm không hợp lệ.',
            'published_at.date'         => 'Ngày xuất bản không đúng định dạng ngày giờ.',
        ];
    }
}
