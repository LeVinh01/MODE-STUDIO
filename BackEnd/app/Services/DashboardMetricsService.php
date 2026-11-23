<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardMetricsService
{
    /**
     * Xác định khoảng thời gian hiện tại và kỳ trước tương đương (cùng độ dài, liền trước)
     *
     * @return array{
     *   range: string,
     *   current: array{from: string, to: string, start_utc: Carbon, end_utc: Carbon, duration_days: int},
     *   previous: array{from: string, to: string, start_utc: Carbon, end_utc: Carbon, duration_days: int}
     * }
     */
    public function resolveDateRanges(string $rangeKey = '30d', ?string $customFrom = null, ?string $customTo = null): array
    {
        $nowVn = Carbon::now('Asia/Ho_Chi_Minh');

        switch ($rangeKey) {
            case '7d':
                $duration = 7;
                $currentToVn = $nowVn->copy()->endOfDay();
                $currentFromVn = $nowVn->copy()->subDays(6)->startOfDay();
                break;

            case '90d':
                $duration = 90;
                $currentToVn = $nowVn->copy()->endOfDay();
                $currentFromVn = $nowVn->copy()->subDays(89)->startOfDay();
                break;

            case 'this_month':
                $currentFromVn = $nowVn->copy()->startOfMonth()->startOfDay();
                $currentToVn = $nowVn->copy()->endOfDay();
                $duration = (int) $currentFromVn->diffInDays($currentToVn) + 1;
                break;

            case 'this_quarter':
                $currentFromVn = $nowVn->copy()->firstOfQuarter()->startOfDay();
                $currentToVn = $nowVn->copy()->endOfDay();
                $duration = (int) $currentFromVn->diffInDays($currentToVn) + 1;
                break;

            case 'this_year':
                $currentFromVn = $nowVn->copy()->startOfYear()->startOfDay();
                $currentToVn = $nowVn->copy()->endOfDay();
                $duration = (int) $currentFromVn->diffInDays($currentToVn) + 1;
                break;

            case 'custom':
                if ($customFrom && $customTo) {
                    $currentFromVn = Carbon::createFromFormat('Y-m-d', $customFrom, 'Asia/Ho_Chi_Minh')->startOfDay();
                    $currentToVn = Carbon::createFromFormat('Y-m-d', $customTo, 'Asia/Ho_Chi_Minh')->endOfDay();
                } else {
                    $currentToVn = $nowVn->copy()->endOfDay();
                    $currentFromVn = $nowVn->copy()->subDays(29)->startOfDay();
                }
                $duration = (int) $currentFromVn->diffInDays($currentToVn) + 1;
                break;

            case '30d':
            default:
                $rangeKey = '30d';
                $duration = 30;
                $currentToVn = $nowVn->copy()->endOfDay();
                $currentFromVn = $nowVn->copy()->subDays(29)->startOfDay();
                break;
        }

        // Kỳ trước tương đương (cùng độ dài $duration ngày, kết thúc ngay trước ngày bắt đầu kỳ hiện tại)
        $previousToVn = $currentFromVn->copy()->subDay()->endOfDay();
        $previousFromVn = $previousToVn->copy()->subDays($duration - 1)->startOfDay();

        return [
            'range' => $rangeKey,
            'current' => [
                'from'          => $currentFromVn->format('Y-m-d'),
                'to'            => $currentToVn->format('Y-m-d'),
                'start_utc'     => $currentFromVn->copy()->setTimezone('UTC'),
                'end_utc'       => $currentToVn->copy()->setTimezone('UTC'),
                'duration_days' => $duration,
            ],
            'previous' => [
                'from'          => $previousFromVn->format('Y-m-d'),
                'to'            => $previousToVn->format('Y-m-d'),
                'start_utc'     => $previousFromVn->copy()->setTimezone('UTC'),
                'end_utc'       => $previousToVn->copy()->setTimezone('UTC'),
                'duration_days' => $duration,
            ],
        ];
    }

    /**
     * Tính toán bộ 4 KPI chính cho 1 khoảng thời gian
     *
     * @param array{from: string, to: string, start_utc: Carbon, end_utc: Carbon} $period
     * @return array{
     *   revenue: int,
     *   orders_count: int,
     *   total_orders_count: int,
     *   delivered_orders_count: int,
     *   cancelled_orders_count: int,
     *   average_order_value: int,
     *   cancellation_rate: float
     * }
     */
    public function getKpisForPeriod(array $period): array
    {
        $startUtc = $period['start_utc'];
        $endUtc = $period['end_utc'];

        // 1. Doanh thu và số đơn ĐÃ GIAO (Delivered)
        $deliveredStats = Order::query()
            ->where('status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(paid_at, updated_at) >= ?', [$startUtc])
            ->whereRaw('COALESCE(paid_at, updated_at) <= ?', [$endUtc])
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as delivered_count')
            ->first();

        $revenue = (int) ($deliveredStats->total_revenue ?? 0);
        $deliveredOrdersCount = (int) ($deliveredStats->delivered_count ?? 0);

        // Giá trị đơn trung bình (AOV) = Doanh thu / số đơn đã giao
        $averageOrderValue = $deliveredOrdersCount > 0
            ? (int) round($revenue / $deliveredOrdersCount)
            : 0;

        // 2. Thống kê theo ngày tạo (created_at trong kỳ)
        $statusCounts = Order::query()
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->selectRaw('status, COUNT(id) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $cancelledOrdersCount = (int) ($statusCounts[OrderStatus::Cancelled->value] ?? 0);
        $totalOrdersCreated = array_sum($statusCounts);

        // Số đơn hàng hợp lệ (không bao gồm đơn hủy)
        $nonCancelledOrdersCount = $totalOrdersCreated - $cancelledOrdersCount;

        // Tỷ lệ hủy đơn: số đơn hủy / tổng đơn tạo trong kỳ * 100
        $cancellationRate = $totalOrdersCreated > 0
            ? (float) round(($cancelledOrdersCount / $totalOrdersCreated) * 100, 1)
            : 0.0;

        return [
            'revenue'                => $revenue,
            'orders_count'           => $nonCancelledOrdersCount,
            'total_orders_count'     => $totalOrdersCreated,
            'delivered_orders_count' => $deliveredOrdersCount,
            'cancelled_orders_count' => $cancelledOrdersCount,
            'average_order_value'    => $averageOrderValue,
            'cancellation_rate'      => $cancellationRate,
        ];
    }

    /**
     * Tính phần trăm biến động so với kỳ trước: ((current - previous) / previous) * 100
     * Trả về null nếu kỳ trước = 0 hoặc null.
     */
    public function calculateDelta(?float $current, ?float $previous): ?float
    {
        if ($previous === null || $previous == 0) {
            return null;
        }

        return (float) round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Chuỗi thời gian doanh thu (daily nếu <= 31 ngày, weekly nếu <= 120 ngày, monthly nếu > 120 ngày)
     */
    public function getRevenueTimeSeries(array $currentPeriod): array
    {
        $durationDays = $currentPeriod['duration_days'];
        if ($durationDays <= 31) {
            $groupBy = 'day';
        } elseif ($durationDays <= 120) {
            $groupBy = 'week';
        } else {
            $groupBy = 'month';
        }

        $startUtc = $currentPeriod['start_utc'];
        $endUtc = $currentPeriod['end_utc'];

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $dateFormatExpr = $isSqlite
            ? "strftime('%Y-%m-%d', datetime(COALESCE(paid_at, updated_at), '+7 hours'))"
            : "DATE_FORMAT(DATE_ADD(COALESCE(paid_at, updated_at), INTERVAL 7 HOUR), '%Y-%m-%d')";

        $rows = Order::query()
            ->where('status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(paid_at, updated_at) >= ?', [$startUtc])
            ->whereRaw('COALESCE(paid_at, updated_at) <= ?', [$endUtc])
            ->selectRaw("{$dateFormatExpr} as day_date, COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as orders_count")
            ->groupBy('day_date')
            ->pluck('total_revenue', 'day_date')
            ->all();

        $fromCarbon = Carbon::createFromFormat('Y-m-d', $currentPeriod['from'], 'Asia/Ho_Chi_Minh')->startOfDay();
        $toCarbon = Carbon::createFromFormat('Y-m-d', $currentPeriod['to'], 'Asia/Ho_Chi_Minh')->endOfDay();

        $timeline = [];

        if ($groupBy === 'day') {
            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $dayKey = $cursor->format('Y-m-d');
                $timeline[] = [
                    'date'    => $dayKey,
                    'label'   => $cursor->format('d/m'),
                    'revenue' => (int) ($rows[$dayKey] ?? 0),
                ];
            }
        } elseif ($groupBy === 'week') {
            $weekBuckets = [];
            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $dayKey = $cursor->format('Y-m-d');
                $dayRevenue = (int) ($rows[$dayKey] ?? 0);

                $weekStart = $cursor->copy()->startOfWeek(Carbon::MONDAY);
                $weekKey = $weekStart->format('Y-m-d');

                if (!isset($weekBuckets[$weekKey])) {
                    $weekBuckets[$weekKey] = [
                        'date'    => $weekKey,
                        'label'   => 'T' . $cursor->isoWeek() . ' (' . $weekStart->format('d/m') . ')',
                        'revenue' => 0,
                    ];
                }
                $weekBuckets[$weekKey]['revenue'] += $dayRevenue;
            }
            $timeline = array_values($weekBuckets);
        } else {
            $monthBuckets = [];
            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $dayKey = $cursor->format('Y-m-d');
                $dayRevenue = (int) ($rows[$dayKey] ?? 0);

                $monthKey = $cursor->format('Y-m');

                if (!isset($monthBuckets[$monthKey])) {
                    $monthBuckets[$monthKey] = [
                        'date'    => $monthKey . '-01',
                        'label'   => 'Thg ' . $cursor->format('m/Y'),
                        'revenue' => 0,
                    ];
                }
                $monthBuckets[$monthKey]['revenue'] += $dayRevenue;
            }
            $timeline = array_values($monthBuckets);
        }

        return [
            'granularity' => $groupBy,
            'timeline'    => $timeline,
        ];
    }

    /**
     * Top 5 sản phẩm bán chạy nhất theo số lượng và theo doanh thu (từ các đơn đã giao)
     */
    public function getTopProducts(array $currentPeriod): array
    {
        $startUtc = $currentPeriod['start_utc'];
        $endUtc = $currentPeriod['end_utc'];

        $items = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) >= ?', [$startUtc])
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) <= ?', [$endUtc])
            ->select([
                'order_items.product_id',
                DB::raw("COALESCE(MAX(order_items.product_name), 'Sản phẩm đã xóa') as product_name"),
                DB::raw('MAX(order_items.image_url) as image_url'),
                DB::raw('CAST(COALESCE(SUM(order_items.quantity), 0) AS UNSIGNED) as total_quantity'),
                DB::raw('CAST(COALESCE(SUM(order_items.line_total), 0) AS UNSIGNED) as total_revenue'),
            ])
            ->groupBy('order_items.product_id')
            ->get();

        $byQuantity = $items->sortByDesc('total_quantity')->take(5)->values()->map(fn ($item) => [
            'product_id'     => $item->product_id !== null ? (int) $item->product_id : null,
            'product_name'   => (string) $item->product_name,
            'image_url'      => $item->image_url ? (string) $item->image_url : null,
            'total_quantity' => (int) $item->total_quantity,
            'total_revenue'  => (int) $item->total_revenue,
        ])->all();

        $byRevenue = $items->sortByDesc('total_revenue')->take(5)->values()->map(fn ($item) => [
            'product_id'     => $item->product_id !== null ? (int) $item->product_id : null,
            'product_name'   => (string) $item->product_name,
            'image_url'      => $item->image_url ? (string) $item->image_url : null,
            'total_quantity' => (int) $item->total_quantity,
            'total_revenue'  => (int) $item->total_revenue,
        ])->all();

        return [
            'by_quantity' => $byQuantity,
            'by_revenue'  => $byRevenue,
        ];
    }

    /**
     * Doanh thu theo danh mục: Nhóm chính (Root groups) và Theo loại sản phẩm (Leaf categories).
     * Phân bổ chính xác các sản phẩm gán trực tiếp vào danh mục cha mà không làm mất doanh thu.
     * Tổng của cả hai nhóm luôn chính xác bằng tổng doanh thu các đơn đã giao.
     */
    public function getRevenueByCategory(array $currentPeriod): array
    {
        $startUtc = $currentPeriod['start_utc'];
        $endUtc = $currentPeriod['end_utc'];

        // 1. Tải toàn bộ cây danh mục
        $allCategories = Category::all()->keyBy('id');

        // 2. Lấy dữ liệu chi tiết các sản phẩm từ các đơn hàng đã giao
        $items = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
            ->where('orders.status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) >= ?', [$startUtc])
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) <= ?', [$endUtc])
            ->select([
                'order_items.product_id',
                'order_items.quantity',
                'order_items.line_total',
                'products.category_id',
            ])
            ->get();

        $totalRevenue = (int) $items->sum('line_total');
        $totalUnits = (int) $items->sum('quantity');

        $rootAgg = [];
        $leafAgg = [];

        // Tìm danh mục gốc (parent_id is null)
        $getRootCategory = function (?int $catId) use ($allCategories) {
            if (!$catId || !$allCategories->has($catId)) {
                return null;
            }
            $curr = $allCategories->get($catId);
            $depth = 0;
            while ($curr && $curr->parent_id && $depth < 10) {
                $curr = $allCategories->get($curr->parent_id);
                $depth++;
            }
            return $curr;
        };

        foreach ($items as $item) {
            $catId = $item->category_id ? (int) $item->category_id : null;
            $cat = $catId ? $allCategories->get($catId) : null;
            $qty = (int) $item->quantity;
            $rev = (int) $item->line_total;

            // --- 1. Root Groups ---
            $rootCat = $getRootCategory($catId);
            $rootKey = $rootCat ? (int) $rootCat->id : 0;
            $rootName = $rootCat ? $rootCat->name : 'Khác / Chưa phân loại';

            if (!isset($rootAgg[$rootKey])) {
                $rootAgg[$rootKey] = [
                    'category_id'   => $rootCat ? (int) $rootCat->id : null,
                    'category_name' => $rootName,
                    'units_sold'    => 0,
                    'revenue'       => 0,
                ];
            }
            $rootAgg[$rootKey]['units_sold'] += $qty;
            $rootAgg[$rootKey]['revenue'] += $rev;

            // --- 2. Leaf Categories ---
            if ($cat) {
                $isRoot = $cat->parent_id === null;
                $leafKey = (int) $cat->id;
                // Nếu sản phẩm gán trực tiếp vào danh mục cha, thêm hậu tố "(Chung)"
                $leafName = $isRoot ? "{$cat->name} (Chung)" : $cat->name;
                $leafId = (int) $cat->id;
            } else {
                $leafKey = 0;
                $leafName = 'Khác / Chưa phân loại';
                $leafId = null;
            }

            if (!isset($leafAgg[$leafKey])) {
                $leafAgg[$leafKey] = [
                    'category_id'   => $leafId,
                    'category_name' => $leafName,
                    'units_sold'    => 0,
                    'revenue'       => 0,
                ];
            }
            $leafAgg[$leafKey]['units_sold'] += $qty;
            $leafAgg[$leafKey]['revenue'] += $rev;
        }

        // Xếp hạng Root groups
        $sortedRoot = collect($rootAgg)->sortByDesc('revenue')->values();
        $rootGroups = [];
        foreach ($sortedRoot as $idx => $r) {
            $rev = $r['revenue'];
            $rootGroups[] = [
                'rank'          => $idx + 1,
                'category_id'   => $r['category_id'],
                'category_name' => $r['category_name'],
                'units_sold'    => $r['units_sold'],
                'revenue'       => $rev,
                'percent'       => $totalRevenue > 0 ? (float) round(($rev / $totalRevenue) * 100, 1) : 0.0,
            ];
        }

        // Xếp hạng Leaf categories
        $sortedLeaf = collect($leafAgg)->sortByDesc('revenue')->values();
        $leafCategories = [];
        foreach ($sortedLeaf as $idx => $l) {
            $rev = $l['revenue'];
            $leafCategories[] = [
                'rank'          => $idx + 1,
                'category_id'   => $l['category_id'],
                'category_name' => $l['category_name'],
                'units_sold'    => $l['units_sold'],
                'revenue'       => $rev,
                'percent'       => $totalRevenue > 0 ? (float) round(($rev / $totalRevenue) * 100, 1) : 0.0,
            ];
        }

        return [
            'root_groups'             => $rootGroups,
            'leaf_categories'         => $leafCategories,
            'total_delivered_revenue' => $totalRevenue,
            'total_units_sold'        => $totalUnits,
        ];
    }

    /**
     * Phân bổ trạng thái đơn hàng (cho biểu đồ Donut)
     */
    public function getOrderStatusBreakdown(array $currentPeriod): array
    {
        $startUtc = $currentPeriod['start_utc'];
        $endUtc = $currentPeriod['end_utc'];

        $statusCounts = Order::query()
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->selectRaw('status, COUNT(id) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $total = array_sum($statusCounts);

        $labels = [
            'pending'   => 'Chờ xử lý',
            'confirmed' => 'Đã xác nhận',
            'shipping'  => 'Đang giao',
            'delivered' => 'Đã giao',
            'cancelled' => 'Đã hủy',
        ];

        $breakdown = [];
        foreach ($labels as $status => $label) {
            $cnt = (int) ($statusCounts[$status] ?? 0);
            $breakdown[] = [
                'status'  => $status,
                'label'   => $label,
                'count'   => $cnt,
                'percent' => $total > 0 ? (float) round(($cnt / $total) * 100, 1) : 0.0,
            ];
        }

        return [
            'total_orders' => $total,
            'items'        => $breakdown,
        ];
    }

    /**
     * Phân bổ phương thức thanh toán
     */
    public function getPaymentMethodSplit(array $currentPeriod): array
    {
        $startUtc = $currentPeriod['start_utc'];
        $endUtc = $currentPeriod['end_utc'];

        $rows = Order::query()
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->selectRaw('payment_method, COUNT(id) as orders_count, COALESCE(SUM(total_amount), 0) as total_amount')
            ->groupBy('payment_method')
            ->get()
            ->keyBy(fn ($item) => $item->payment_method instanceof PaymentMethod ? $item->payment_method->value : (string) $item->payment_method);

        $labels = [
            'cod'   => 'Thanh toán COD',
            'vnpay' => 'VNPay Online',
        ];

        $totalCount = $rows->sum('orders_count');

        $split = [];
        foreach ($labels as $method => $label) {
            $record = $rows->get($method);
            $cnt = (int) ($record->orders_count ?? 0);
            $amt = (int) ($record->total_amount ?? 0);

            $split[] = [
                'method'       => $method,
                'label'        => $label,
                'orders_count' => $cnt,
                'total_amount' => $amt,
                'percent'      => $totalCount > 0 ? (float) round(($cnt / $totalCount) * 100, 1) : 0.0,
            ];
        }

        return $split;
    }

    /**
     * Cảnh báo vận hành (Operational Alerts)
     */
    public function getOperationalAlerts(): array
    {
        $lowStockThreshold = (int) config('shop.stock.low_stock_threshold', 10);
        $lowStockCount = ProductVariant::lowStock($lowStockThreshold)->count();

        $pendingOrdersCount = Order::query()
            ->where('status', OrderStatus::Pending->value)
            ->count();

        $refundPendingOrdersCount = Order::query()
            ->where('payment_status', PaymentStatus::RefundPending->value)
            ->count();

        return [
            [
                'id'          => 'low_stock',
                'title'       => 'Biến thể sắp hết hàng',
                'count'       => $lowStockCount,
                'description' => "Tồn kho ≤ {$lowStockThreshold} sản phẩm",
                'severity'    => $lowStockCount > 0 ? 'warning' : 'neutral',
                'link'        => '/admin/inventory',
                'link_text'   => 'Kiểm tra kho hàng',
            ],
            [
                'id'          => 'pending_orders',
                'title'       => 'Đơn hàng chờ xác nhận',
                'count'       => $pendingOrdersCount,
                'description' => 'Đơn mới cần nhân viên duyệt',
                'severity'    => $pendingOrdersCount > 0 ? 'warning' : 'neutral',
                'link'        => '/admin/orders?status=pending',
                'link_text'   => 'Xem đơn chờ',
            ],
            [
                'id'          => 'refund_pending',
                'title'       => 'Đơn chờ hoàn tiền',
                'count'       => $refundPendingOrdersCount,
                'description' => 'Đơn hủy cần hoàn tiền qua ngân hàng/VNPay',
                'severity'    => $refundPendingOrdersCount > 0 ? 'danger' : 'neutral',
                'link'        => '/admin/orders?payment_status=refund_pending',
                'link_text'   => 'Xử lý hoàn tiền',
            ],
        ];
    }

    /**
     * Hiệu suất theo mặt hàng (Product / Category Performance)
     * Thống kê sản lượng bán, doanh thu, tỷ trọng trên tổng doanh thu đã giao của cửa hàng
     */
    public function getItemPerformance(
        string $targetType,
        int $targetId,
        array $dateRanges,
        ?string $granularityOverride = null
    ): array {
        $currentPeriod = $dateRanges['current'];
        $previousPeriod = $dateRanges['previous'];

        $targetName = '';
        $targetImage = null;
        $targetDescendantCatIds = null;

        if ($targetType === 'product') {
            $product = Product::with('images')->findOrFail($targetId);
            $targetName = $product->name;
            $targetImage = $product->images->first()?->image_url;
        } elseif ($targetId === 0) {
            $targetName = 'Tất cả danh mục';
            $targetImage = null;
            $targetDescendantCatIds = null;
        } else {
            $category = Category::findOrFail($targetId);
            $targetName = $category->name;
            $targetImage = $category->image_url;

            $allCats = Category::all();
            $targetDescendantCatIds = [$targetId];
            $toProcess = [$targetId];
            while (!empty($toProcess)) {
                $currId = array_shift($toProcess);
                $children = $allCats->where('parent_id', $currId)->pluck('id')->all();
                foreach ($children as $childId) {
                    if (!in_array($childId, $targetDescendantCatIds, true)) {
                        $targetDescendantCatIds[] = $childId;
                        $toProcess[] = $childId;
                    }
                }
            }
        }

        // Độ chi tiết (Granularity): day <= 31d, week <= 120d, month otherwise (hoặc chỉ định)
        $durationDays = $currentPeriod['duration_days'];
        if (in_array($granularityOverride, ['day', 'week', 'month'], true)) {
            $granularity = $granularityOverride;
        } else {
            if ($durationDays <= 31) {
                $granularity = 'day';
            } elseif ($durationDays <= 120) {
                $granularity = 'week';
            } else {
                $granularity = 'month';
            }
        }

        // Helper truy vấn chỉ số cho 1 kỳ (đơn delivered)
        $queryPeriodData = function (array $period) use ($targetType, $targetId, $targetDescendantCatIds) {
            $startUtc = $period['start_utc'];
            $endUtc = $period['end_utc'];

            // Tổng doanh thu toàn cửa hàng từ đơn delivered trong kỳ
            $shopTotalRev = (int) Order::query()
                ->where('status', OrderStatus::Delivered->value)
                ->whereRaw('COALESCE(paid_at, updated_at) >= ?', [$startUtc])
                ->whereRaw('COALESCE(paid_at, updated_at) <= ?', [$endUtc])
                ->sum('total_amount');

            // Doanh thu và sản lượng của mặt hàng chỉ định
            $query = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
                ->where('orders.status', OrderStatus::Delivered->value)
                ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) >= ?', [$startUtc])
                ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) <= ?', [$endUtc]);

            if ($targetType === 'product') {
                $query->where('order_items.product_id', $targetId);
            } elseif ($targetId > 0 && !empty($targetDescendantCatIds)) {
                $query->whereIn('products.category_id', $targetDescendantCatIds);
            }

            $res = $query->selectRaw('COALESCE(SUM(order_items.quantity), 0) as total_units, COALESCE(SUM(order_items.line_total), 0) as total_revenue')
                ->first();

            $units = (int) ($res->total_units ?? 0);
            $revenue = (int) ($res->total_revenue ?? 0);
            $share = $shopTotalRev > 0 ? (float) round(($revenue / $shopTotalRev) * 100, 1) : 0.0;

            return [
                'units_sold'              => $units,
                'revenue'                 => $revenue,
                'share_of_total_revenue'  => $share,
                'total_delivered_revenue' => $shopTotalRev,
            ];
        };

        $currentSummary = $queryPeriodData($currentPeriod);
        $previousSummary = $queryPeriodData($previousPeriod);

        // Tính biến động (Delta)
        $deltaUnits = $this->calculateDelta($currentSummary['units_sold'], $previousSummary['units_sold']);
        $deltaRevenue = $this->calculateDelta($currentSummary['revenue'], $previousSummary['revenue']);
        $deltaShare = $previousSummary['total_delivered_revenue'] > 0
            ? (float) round($currentSummary['share_of_total_revenue'] - $previousSummary['share_of_total_revenue'], 1)
            : null;

        // Chuỗi thời gian (Timeline) cho mặt hàng
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        $timelineQuery = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
            ->where('orders.status', OrderStatus::Delivered->value)
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) >= ?', [$currentPeriod['start_utc']])
            ->whereRaw('COALESCE(orders.paid_at, orders.updated_at) <= ?', [$currentPeriod['end_utc']]);

        if ($targetType === 'product') {
            $timelineQuery->where('order_items.product_id', $targetId);
        } elseif ($targetId > 0 && !empty($targetDescendantCatIds)) {
            $timelineQuery->whereIn('products.category_id', $targetDescendantCatIds);
        }

        $dateFormatExpr = $isSqlite
            ? "strftime('%Y-%m-%d', datetime(COALESCE(orders.paid_at, orders.updated_at), '+7 hours'))"
            : "DATE_FORMAT(DATE_ADD(COALESCE(orders.paid_at, orders.updated_at), INTERVAL 7 HOUR), '%Y-%m-%d')";

        $rawRows = $timelineQuery->selectRaw("{$dateFormatExpr} as day_date, COALESCE(SUM(order_items.quantity), 0) as units_sold, COALESCE(SUM(order_items.line_total), 0) as revenue")
            ->groupBy('day_date')
            ->get()
            ->keyBy('day_date');

        $fromCarbon = Carbon::createFromFormat('Y-m-d', $currentPeriod['from'], 'Asia/Ho_Chi_Minh')->startOfDay();
        $toCarbon = Carbon::createFromFormat('Y-m-d', $currentPeriod['to'], 'Asia/Ho_Chi_Minh')->endOfDay();

        $timeline = [];

        if ($granularity === 'day') {
            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $dayKey = $cursor->format('Y-m-d');
                $row = $rawRows->get($dayKey);
                $timeline[] = [
                    'date'       => $dayKey,
                    'label'      => $cursor->format('d/m'),
                    'units_sold' => (int) ($row->units_sold ?? 0),
                    'revenue'    => (int) ($row->revenue ?? 0),
                ];
            }
        } elseif ($granularity === 'week') {
            $weekBuckets = [];
            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $dayKey = $cursor->format('Y-m-d');
                $row = $rawRows->get($dayKey);
                $dayUnits = (int) ($row->units_sold ?? 0);
                $dayRevenue = (int) ($row->revenue ?? 0);

                $weekStart = $cursor->copy()->startOfWeek(Carbon::MONDAY);
                $weekKey = $weekStart->format('Y-m-d');

                if (!isset($weekBuckets[$weekKey])) {
                    $weekBuckets[$weekKey] = [
                        'date'       => $weekKey,
                        'label'      => 'T' . $cursor->isoWeek() . ' (' . $weekStart->format('d/m') . ')',
                        'units_sold' => 0,
                        'revenue'    => 0,
                    ];
                }
                $weekBuckets[$weekKey]['units_sold'] += $dayUnits;
                $weekBuckets[$weekKey]['revenue'] += $dayRevenue;
            }
            $timeline = array_values($weekBuckets);
        } else {
            $monthBuckets = [];
            for ($cursor = $fromCarbon->copy(); $cursor->lte($toCarbon); $cursor->addDay()) {
                $dayKey = $cursor->format('Y-m-d');
                $row = $rawRows->get($dayKey);
                $dayUnits = (int) ($row->units_sold ?? 0);
                $dayRevenue = (int) ($row->revenue ?? 0);

                $monthKey = $cursor->format('Y-m');

                if (!isset($monthBuckets[$monthKey])) {
                    $monthBuckets[$monthKey] = [
                        'date'       => $monthKey . '-01',
                        'label'      => 'Thg ' . $cursor->format('m/Y'),
                        'units_sold' => 0,
                        'revenue'    => 0,
                    ];
                }
                $monthBuckets[$monthKey]['units_sold'] += $dayUnits;
                $monthBuckets[$monthKey]['revenue'] += $dayRevenue;
            }
            $timeline = array_values($monthBuckets);
        }

        return [
            'target_type'      => $targetType,
            'target_id'        => $targetId,
            'target_name'      => $targetName,
            'target_image'     => $targetImage,
            'range'            => $dateRanges['range'],
            'current_period'   => $currentPeriod,
            'previous_period'  => $previousPeriod,
            'granularity'      => $granularity,
            'summary'          => $currentSummary,
            'previous_summary' => $previousSummary,
            'delta'            => [
                'units_sold'             => $deltaUnits,
                'revenue'                => $deltaRevenue,
                'share_of_total_revenue' => $deltaShare,
            ],
            'timeline'         => $timeline,
        ];
    }
}
