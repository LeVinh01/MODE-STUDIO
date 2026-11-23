<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class AdminDashboardItemPerformanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('from') && $this->filled('to') && (!$this->filled('range') || $this->input('range') === '')) {
            $this->merge(['range' => 'custom']);
        }
    }

    public function rules(): array
    {
        return [
            'target_type' => ['required', 'string', 'in:product,category'],
            'target_id'   => ['required', 'integer', 'min:0'],
            'range'       => ['nullable', 'string', 'in:7d,30d,90d,this_month,this_quarter,this_year,custom'],
            'from'        => ['nullable', 'required_if:range,custom', 'date_format:Y-m-d'],
            'to'          => ['nullable', 'required_if:range,custom', 'date_format:Y-m-d', 'after_or_equal:from'],
            'granularity' => ['nullable', 'string', 'in:auto,day,week,month'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('range') === 'custom' && $this->filled('from') && $this->filled('to')) {
                try {
                    $from = Carbon::createFromFormat('Y-m-d', $this->input('from'))->startOfDay();
                    $to = Carbon::createFromFormat('Y-m-d', $this->input('to'))->startOfDay();
                    if ($from->diffInDays($to) > 366) {
                        $validator->errors()->add('to', 'Khoảng thời gian tùy chọn không được vượt quá 366 ngày.');
                    }
                } catch (\Exception $e) {
                    // Handled by date_format rule
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'target_type.required' => 'Vui lòng chọn loại mặt hàng (product hoặc category).',
            'target_type.in'       => 'Loại mặt hàng phải là product hoặc category.',
            'target_id.required'   => 'Vui lòng cung cấp ID mặt hàng.',
            'target_id.integer'    => 'ID mặt hàng phải là số nguyên.',
            'range.in'             => 'Khoảng thời gian không hợp lệ.',
            'from.required_if'     => 'Vui lòng chọn ngày bắt đầu khi chọn tùy biến ngày.',
            'to.required_if'       => 'Vui lòng chọn ngày kết thúc khi chọn tùy biến ngày.',
            'to.after_or_equal'    => 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.',
            'granularity.in'       => 'Chu kỳ tổng hợp phải là auto, day, week hoặc month.',
        ];
    }
}
