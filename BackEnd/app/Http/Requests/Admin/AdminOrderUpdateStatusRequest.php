<?php

namespace App\Http\Requests\Admin;

use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminOrderUpdateStatusRequest extends FormRequest
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
            'status' => ['required', 'string', Rule::enum(OrderStatus::class)],
            'reason' => ['nullable', 'string', 'max:500', 'required_if:status,' . OrderStatus::Cancelled->value],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required'                         => 'Vui lòng chọn trạng thái đơn hàng.',
            'status.Illuminate\Validation\Rules\Enum' => 'Trạng thái đơn hàng không hợp lệ.',
            'status.enum'                             => 'Trạng thái đơn hàng không hợp lệ.',
            'status.string'                           => 'Trạng thái đơn hàng không hợp lệ.',
            'reason.required_if'                      => 'Lý do hủy đơn hàng là bắt buộc khi quản trị viên hủy đơn.',
            'reason.string'                           => 'Lý do hủy đơn không hợp lệ.',
            'reason.max'                              => 'Lý do hủy đơn không được vượt quá 500 ký tự.',
        ];
    }
}
