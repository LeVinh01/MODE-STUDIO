<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderStoreRequest extends FormRequest
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
            'recipient_name'   => ['required', 'string', 'max:150'],
            'recipient_phone'  => ['required', 'string', 'regex:/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/'],
            'shipping_address' => ['required', 'string', 'max:500'],
            'note'             => ['nullable', 'string', 'max:1000'],
            'payment_method'   => ['required', 'string', 'in:cod,vnpay'],
        ];
    }

    public function messages(): array
    {
        return [
            'recipient_name.required'   => 'Vui lòng nhập họ tên người nhận.',
            'recipient_name.string'     => 'Họ tên người nhận không hợp lệ.',
            'recipient_name.max'        => 'Họ tên người nhận không được vượt quá 150 ký tự.',
            'recipient_phone.required'  => 'Vui lòng nhập số điện thoại người nhận.',
            'recipient_phone.regex'     => 'Số điện thoại người nhận không hợp lệ (yêu cầu số điện thoại Việt Nam 10 chữ số).',
            'shipping_address.required' => 'Vui lòng nhập địa chỉ nhận hàng.',
            'shipping_address.max'      => 'Địa chỉ nhận hàng không được vượt quá 500 ký tự.',
            'note.max'                  => 'Ghi chú đơn hàng không được vượt quá 1000 ký tự.',
            'payment_method.required'   => 'Vui lòng chọn phương thức thanh toán.',
            'payment_method.in'         => 'Phương thức thanh toán không hợp lệ.',
        ];
    }
}
