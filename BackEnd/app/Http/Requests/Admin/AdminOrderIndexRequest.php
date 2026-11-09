<?php

namespace App\Http\Requests\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminOrderIndexRequest extends FormRequest
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
            'status'         => ['nullable', 'string', Rule::enum(OrderStatus::class)],
            'payment_status' => ['nullable', 'string', Rule::enum(PaymentStatus::class)],
            'from'           => ['nullable', 'date_format:Y-m-d'],
            'to'             => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'search'         => ['nullable', 'string', 'max:150'],
            'page'           => ['nullable', 'integer', 'min:1'],
            'per_page'       => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.Illuminate\Validation\Rules\Enum' => 'Trạng thái đơn hàng không hợp lệ.',
            'status.enum'                             => 'Trạng thái đơn hàng không hợp lệ.',
            'status.string'                           => 'Trạng thái đơn hàng không hợp lệ.',
            'payment_status.Illuminate\Validation\Rules\Enum' => 'Trạng thái thanh toán không hợp lệ.',
            'payment_status.enum'                             => 'Trạng thái thanh toán không hợp lệ.',
            'payment_status.string'                           => 'Trạng thái thanh toán không hợp lệ.',
            'from.date_format'                        => 'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.',
            'to.date_format'                          => 'Ngày kết thúc không đúng định dạng YYYY-MM-DD.',
            'to.after_or_equal'                       => 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.',
            'search.string'                           => 'Từ khóa tìm kiếm không hợp lệ.',
            'search.max'                              => 'Từ khóa tìm kiếm tối đa 150 ký tự.',
            'page.integer'                            => 'Số trang phải là số nguyên.',
            'page.min'                                => 'Số trang phải từ 1 trở lên.',
            'per_page.integer'                        => 'Số lượng đơn hàng mỗi trang phải là số nguyên.',
            'per_page.min'                            => 'Số lượng đơn hàng mỗi trang phải từ 1 trở lên.',
            'per_page.max'                            => 'Số lượng đơn hàng mỗi trang tối đa là 50.',
        ];
    }
}
