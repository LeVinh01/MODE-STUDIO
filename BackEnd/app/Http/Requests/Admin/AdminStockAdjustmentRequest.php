<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminStockAdjustmentRequest extends FormRequest
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
        $type = $this->input('type');
        $minQuantity = ($type === 'set') ? 0 : 1;

        return [
            'type'     => ['required', 'string', 'in:set,increment,decrement'],
            'quantity' => ['required', 'integer', "min:{$minQuantity}", 'max:1000000'],
            'reason'   => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.required'     => 'Vui lòng chọn loại điều chỉnh tồn kho.',
            'type.in'           => 'Loại điều chỉnh chỉ có thể là set, increment hoặc decrement.',
            'quantity.required' => 'Vui lòng nhập số lượng điều chỉnh.',
            'quantity.integer'  => 'Số lượng điều chỉnh phải là số nguyên.',
            'quantity.min'      => 'Số lượng điều chỉnh không hợp lệ.',
            'quantity.max'      => 'Số lượng điều chỉnh vượt quá giới hạn.',
            'reason.required'   => 'Vui lòng nhập lý do điều chỉnh.',
            'reason.max'        => 'Lý do điều chỉnh tối đa 255 ký tự.',
        ];
    }
}
