<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class AdminCategoryStoreRequest extends FormRequest
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

        if ($this->filled('slug') && is_string($this->slug)) {
            $this->merge(['slug' => Str::slug($this->slug)]);
        } elseif ($this->has('name') && is_string($this->name)) {
            $this->merge(['slug' => Str::slug($this->name)]);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:120'],
            'slug'        => ['required', 'string', 'max:150', 'unique:categories,slug'],
            'parent_id'   => ['nullable', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'      => 'Vui lòng nhập tên danh mục.',
            'name.max'           => 'Tên danh mục tối đa 120 ký tự.',
            'slug.required'      => 'Vui lòng cung cấp slug cho danh mục.',
            'slug.max'           => 'Slug tối đa 150 ký tự.',
            'slug.unique'        => 'Slug danh mục này đã tồn tại trong hệ thống.',
            'parent_id.exists'   => 'Danh mục cha không tồn tại.',
            'parent_id.integer'  => 'Mã danh mục cha không hợp lệ.',
            'description.max'    => 'Mô tả tối đa 1000 ký tự.',
            'sort_order.integer' => 'Thứ tự hiển thị phải là số nguyên.',
            'sort_order.min'     => 'Thứ tự hiển thị không được âm.',
        ];
    }
}
