<?php

namespace App\Http\Requests;

use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderIndexRequest extends FormRequest
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
            'status'   => ['nullable', 'string', Rule::enum(OrderStatus::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page'     => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.Illuminate\Validation\Rules\Enum' => 'Trạng thái đơn hàng không hợp lệ.',
            'status.enum'                             => 'Trạng thái đơn hàng không hợp lệ.',
            'status.string'                           => 'Trạng thái đơn hàng không hợp lệ.',
            'per_page.integer'                        => 'Số lượng đơn hàng mỗi trang phải là số nguyên.',
            'per_page.min'                            => 'Số lượng đơn hàng mỗi trang phải từ 1 trở lên.',
            'per_page.max'                            => 'Số lượng đơn hàng mỗi trang tối đa là 50.',
            'page.integer'                            => 'Số trang phải là số nguyên.',
            'page.min'                                => 'Số trang phải từ 1 trở lên.',
        ];
    }
}
