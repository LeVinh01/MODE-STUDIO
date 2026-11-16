<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminDashboardFilterRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * Tổng quan chỉ số KPI và phân bổ trạng thái đơn hàng
     * GET /api/admin/dashboard/summary
     */
    public function summary(AdminDashboardFilterRequest $request): JsonResponse
    {
        $range = $request->getDateRange();

        // 1. Doanh thu và số đơn ĐÃ GIAO trong kỳ (căn cứ thời điểm giao hàng)
        $deliveredStats = Order::query()
            ->where('status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(paid_at, updated_at) >= ?', [$range['start_utc']])
            ->whereRaw('COALESCE(paid_at, updated_at) <= ?', [$range['end_utc']])
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as delivered_count')
            ->first();

        $revenue = (int) ($deliveredStats->total_revenue ?? 0);
        $deliveredOrdersCount = (int) ($deliveredStats->delivered_count ?? 0);
        $averageOrderValue = $deliveredOrdersCount > 0 ? (int) round($revenue / $deliveredOrdersCount) : 0;

        // 2. Tổng số đơn hàng hợp lệ (không tính đơn hủy) phát sinh trong kỳ (căn cứ ngày tạo)
        $ordersCount = Order::query()
            ->where('status', '!=', OrderStatus::Cancelled->value)
            ->whereBetween('created_at', [$range['start_utc'], $range['end_utc']])
            ->count();

        // 3. Phân bổ theo toàn bộ 5 trạng thái đơn hàng phát sinh trong kỳ
        $statusCounts = Order::query()
            ->whereBetween('created_at', [$range['start_utc'], $range['end_utc']])
            ->selectRaw('status, COUNT(id) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $ordersByStatus = [
            'pending'   => (int) ($statusCounts[OrderStatus::Pending->value] ?? 0),
            'confirmed' => (int) ($statusCounts[OrderStatus::Confirmed->value] ?? 0),
            'shipping'  => (int) ($statusCounts[OrderStatus::Shipping->value] ?? 0),
            'delivered' => (int) ($statusCounts[OrderStatus::Delivered->value] ?? 0),
            'cancelled' => (int) ($statusCounts[OrderStatus::Cancelled->value] ?? 0),
        ];

        // Tỷ lệ hủy đơn: số đơn hủy trong kỳ (theo ngày tạo) / tổng đơn tạo trong kỳ * 100 (làm tròn 1 số lẻ)
        $totalOrdersCreated = array_sum($ordersByStatus);
        $cancelledOrdersCount = $ordersByStatus['cancelled'];
        $cancellationRate = $totalOrdersCreated > 0
            ? (float) round(($cancelledOrdersCount / $totalOrdersCreated) * 100, 1)
            : 0.0;

        // 4. Khách hàng mới đăng ký tài khoản trong kỳ
        $newCustomersCount = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'customer'))
            ->whereBetween('created_at', [$range['start_utc'], $range['end_utc']])
            ->count();

        // 5. Số biến thể tồn kho thấp (dùng chung scope với AdminStockController)
        $lowStockThreshold = (int) config('shop.stock.low_stock_threshold', 10);
        $lowStockVariantsCount = ProductVariant::lowStock($lowStockThreshold)->count();

        return response()->json([
            'data' => [
                'from'                     => $range['from'],
                'to'                       => $range['to'],
                'revenue'                  => $revenue,
                'delivered_orders_count'   => $deliveredOrdersCount,
                'average_order_value'      => $averageOrderValue,
                'orders_count'             => $ordersCount,
                'cancellation_rate'        => $cancellationRate,
                'orders_by_status'         => $ordersByStatus,
                'new_customers_count'      => $newCustomersCount,
                'low_stock_variants_count' => $lowStockVariantsCount,
            ],
        ], 200);
    }

    /**
     * Chuỗi xu hướng doanh thu và số đơn theo ngày hoặc tháng
     * GET /api/admin/dashboard/revenue
     */
    public function revenue(AdminDashboardFilterRequest $request): JsonResponse
    {
        $range = $request->getDateRange();
        $groupBy = $request->input('group_by', 'day') === 'month' ? 'month' : 'day';

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        // Biểu thức chuyển múi giờ sang GMT+7 trước khi trích xuất ngày/tháng
        $dateFormatExpr = $isSqlite
            ? ($groupBy === 'month'
                ? "strftime('%Y-%m', datetime(COALESCE(paid_at, updated_at), '+7 hours'))"
                : "strftime('%Y-%m-%d', datetime(COALESCE(paid_at, updated_at), '+7 hours'))")
            : ($groupBy === 'month'
                ? "DATE_FORMAT(DATE_ADD(COALESCE(paid_at, updated_at), INTERVAL 7 HOUR), '%Y-%m')"
                : "DATE_FORMAT(DATE_ADD(COALESCE(paid_at, updated_at), INTERVAL 7 HOUR), '%Y-%m-%d')");

        $rows = Order::query()
            ->where('status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(paid_at, updated_at) >= ?', [$range['start_utc']])
            ->whereRaw('COALESCE(paid_at, updated_at) <= ?', [$range['end_utc']])
            ->selectRaw("{$dateFormatExpr} as period_date, COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as orders_count")
            ->groupBy('period_date')
            ->orderBy('period_date', 'asc')
            ->get()
            ->keyBy('period_date');

        // Sinh mốc thời gian liên tục và điền 0 cho ngày trống
        $timeline = [];
        if ($groupBy === 'day') {
            $fromCarbon = Carbon::createFromFormat('Y-m-d', $range['from'], 'Asia/Ho_Chi_Minh')->startOfDay();
            $toCarbon = Carbon::createFromFormat('Y-m-d', $range['to'], 'Asia/Ho_Chi_Minh')->startOfDay();

            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $key = $cursor->format('Y-m-d');
                $record = $rows->get($key);

                $timeline[] = [
                    'date'         => $key,
                    'label'        => $cursor->format('d/m'),
                    'revenue'      => (int) ($record->total_revenue ?? 0),
                    'orders_count' => (int) ($record->orders_count ?? 0),
                ];
            }
        } else {
            $fromCarbon = Carbon::createFromFormat('Y-m-d', $range['from'], 'Asia/Ho_Chi_Minh')->startOfMonth();
            $toCarbon = Carbon::createFromFormat('Y-m-d', $range['to'], 'Asia/Ho_Chi_Minh')->startOfMonth();

            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addMonth()) {
                $key = $cursor->format('Y-m');
                $record = $rows->get($key);

                $timeline[] = [
                    'date'         => $key,
                    'label'        => $cursor->format('m/Y'),
                    'revenue'      => (int) ($record->total_revenue ?? 0),
                    'orders_count' => (int) ($record->orders_count ?? 0),
                ];
            }
        }

        return response()->json([
            'data' => [
                'from'     => $range['from'],
                'to'       => $range['to'],
                'group_by' => $groupBy,
                'timeline' => $timeline,
            ],
        ], 200);
    }

    /**
     * Danh sách sản phẩm bán chạy nhất theo số lượng và doanh thu (từ các đơn đã giao)
     * GET /api/admin/dashboard/top-products
     */
    public function topProducts(AdminDashboardFilterRequest $request): JsonResponse
    {
        $range = $request->getDateRange();
        $limit = (int) $request->input('limit', 5);

        // Tuân thủ triệt để MySQL ONLY_FULL_GROUP_BY: gom theo product_id, các cột snapshot dùng hàm tập hợp MAX()
        $products = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) >= ?', [$range['start_utc']])
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) <= ?', [$range['end_utc']])
            ->select([
                'order_items.product_id',
                DB::raw("COALESCE(MAX(order_items.product_name), 'Sản phẩm đã xóa') as product_name"),
                DB::raw('MAX(order_items.image_url) as image_url'),
                DB::raw('CAST(COALESCE(SUM(order_items.quantity), 0) AS UNSIGNED) as total_quantity'),
                DB::raw('CAST(COALESCE(SUM(order_items.line_total), 0) AS UNSIGNED) as total_revenue'),
            ])
            ->groupBy('order_items.product_id')
            ->orderByDesc('total_quantity')
            ->orderByDesc('total_revenue')
            ->orderByRaw('COALESCE(order_items.product_id, 0) DESC')
            ->limit($limit)
            ->get();

        $data = $products->map(function ($item) {
            return [
                'product_id'     => $item->product_id !== null ? (int) $item->product_id : null,
                'product_name'   => (string) $item->product_name,
                'image_url'      => $item->image_url ? (string) $item->image_url : null,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue'  => (int) $item->total_revenue,
            ];
        });

        return response()->json([
            'data' => $data,
        ], 200);
    }
}
