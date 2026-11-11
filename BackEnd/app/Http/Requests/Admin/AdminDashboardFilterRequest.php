<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class AdminDashboardFilterRequest extends FormRequest
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
            'from'     => ['nullable', 'date_format:Y-m-d'],
            'to'       => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'group_by' => ['nullable', 'string', 'in:day,month'],
            'limit'    => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'from.date_format'   => 'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.',
            'to.date_format'     => 'Ngày kết thúc không đúng định dạng YYYY-MM-DD.',
            'to.after_or_equal'  => 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.',
            'group_by.in'        => 'Tham số group_by chỉ chấp nhận day hoặc month.',
            'limit.integer'      => 'Giới hạn số lượng phải là số nguyên.',
            'limit.min'          => 'Giới hạn số lượng tối thiểu là 1.',
            'limit.max'          => 'Giới hạn số lượng tối đa là 50.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $fromStr = $this->input('from');
            $toStr = $this->input('to');

            if ($fromStr && $toStr && !$validator->errors()->has('from') && !$validator->errors()->has('to')) {
                $from = Carbon::createFromFormat('Y-m-d', $fromStr, 'Asia/Ho_Chi_Minh');
                $to = Carbon::createFromFormat('Y-m-d', $toStr, 'Asia/Ho_Chi_Minh');

                if ($from->diffInDays($to) > 366) {
                    $validator->errors()->add('to', 'Khoảng thời gian tra cứu không được vượt quá 366 ngày.');
                }
            }
        });
    }

    /**
     * Lấy khoảng thời gian tính theo giờ Việt Nam và quy đổi sang UTC
     *
     * @return array{from: string, to: string, start_utc: Carbon, end_utc: Carbon}
     */
    public function getDateRange(): array
    {
        $nowVn = Carbon::now('Asia/Ho_Chi_Minh');

        $toVnStr = $this->filled('to')
            ? (string) $this->input('to')
            : $nowVn->format('Y-m-d');

        $fromVnStr = $this->filled('from')
            ? (string) $this->input('from')
            : Carbon::createFromFormat('Y-m-d', $toVnStr, 'Asia/Ho_Chi_Minh')->subDays(29)->format('Y-m-d');

        $startUtc = Carbon::createFromFormat('Y-m-d', $fromVnStr, 'Asia/Ho_Chi_Minh')
            ->startOfDay()
            ->setTimezone('UTC');

        $endUtc = Carbon::createFromFormat('Y-m-d', $toVnStr, 'Asia/Ho_Chi_Minh')
            ->endOfDay()
            ->setTimezone('UTC');

        return [
            'from'      => $fromVnStr,
            'to'        => $toVnStr,
            'start_utc' => $startUtc,
            'end_utc'   => $endUtc,
        ];
    }
}
