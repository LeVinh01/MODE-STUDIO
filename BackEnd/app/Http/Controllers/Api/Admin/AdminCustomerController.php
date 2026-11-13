<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    /**
     * Danh sách khách hàng kèm phân trang, tìm kiếm và thống kê đơn hàng
     * GET /api/admin/customers
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 50) {
            $perPage = 15;
        }

        $query = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'customer'))
            ->select(['id', 'full_name', 'email', 'phone', 'created_at']);

        // Tìm kiếm theo tên, email hoặc số điện thoại (escape an toàn chuẩn SQL)
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search);
            $pattern = "%{$escaped}%";

            $query->where(function ($q) use ($pattern) {
                $q->whereRaw("full_name LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("email LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("phone LIKE ? ESCAPE '!'", [$pattern]);
            });
        }

        // Tích hợp subquery tính tổng số đơn, tổng chi tiêu (các đơn delivered) và ngày đặt đơn gần nhất
        $paginator = $query
            ->withCount('orders')
            ->addSelect([
                'total_spent' => Order::selectRaw('COALESCE(SUM(total_amount), 0)')
                    ->whereColumn('orders.user_id', 'users.id')
                    ->where('orders.status', OrderStatus::Delivered->value),
                'last_order_at' => Order::selectRaw('MAX(created_at)')
                    ->whereColumn('orders.user_id', 'users.id'),
            ])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $data = collect($paginator->items())->map(function ($u) {
            return [
                'id'            => $u->id,
                'full_name'     => $u->full_name,
                'email'         => $u->email,
                'phone'         => $u->phone,
                'created_at'    => $u->created_at?->toISOString(),
                'orders_count'  => (int) $u->orders_count,
                'total_spent'   => (int) ($u->total_spent ?? 0),
                'last_order_at' => $u->last_order_at ? Carbon::parse($u->last_order_at)->toISOString() : null,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from'         => $paginator->firstItem(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'to'           => $paginator->lastItem(),
                'total'        => $paginator->total(),
            ],
        ], 200);
    }

    /**
     * Chi tiết hồ sơ khách hàng kèm số liệu thống kê và 10 đơn gần nhất
     * GET /api/admin/customers/{id}
     */
    public function show(int $id): JsonResponse
    {
        $customer = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'customer'))
            ->find($id);

        if (!$customer) {
            return response()->json([
                'message' => 'Không tìm thấy thông tin khách hàng.',
            ], 404);
        }

        $ordersCount = $customer->orders()->count();
        $deliveredOrdersCount = $customer->orders()->where('status', OrderStatus::Delivered->value)->count();
        $totalSpent = (int) $customer->orders()->where('status', OrderStatus::Delivered->value)->sum('total_amount');
        $lastOrderAt = $customer->orders()->latest('created_at')->value('created_at');

        $recentOrders = $customer->orders()
            ->withCount('items')
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id'             => $order->id,
                    'order_code'     => $order->order_code,
                    'status'         => $order->status->value,
                    'payment_method' => $order->payment_method->value,
                    'payment_status' => $order->payment_status->value,
                    'total_amount'   => (int) $order->total_amount,
                    'items_count'    => (int) $order->items_count,
                    'carrier'        => $order->carrier,
                    'tracking_code'  => $order->tracking_code,
                    'created_at'     => $order->created_at?->toISOString(),
                ];
            });

        return response()->json([
            'customer' => [
                'id'         => $customer->id,
                'full_name'  => $customer->full_name,
                'email'      => $customer->email,
                'phone'      => $customer->phone,
                'created_at' => $customer->created_at?->toISOString(),
            ],
            'stats' => [
                'orders_count'           => $ordersCount,
                'delivered_orders_count' => $deliveredOrdersCount,
                'total_spent'            => $totalSpent,
                'last_order_at'          => $lastOrderAt ? Carbon::parse($lastOrderAt)->toISOString() : null,
            ],
            'recent_orders' => $recentOrders,
        ], 200);
    }
}
