<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    /**
     * Danh sách khách hàng kèm phân trang, tìm kiếm, lọc trạng thái và thống kê đơn hàng
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
            ->select(['id', 'full_name', 'email', 'phone', 'status', 'created_at']);

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

        // Lọc theo trạng thái tài khoản (active / locked)
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
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
                'status'        => $u->status instanceof UserStatus ? $u->status->value : (string) $u->status,
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
                'id'          => $customer->id,
                'full_name'   => $customer->full_name,
                'email'       => $customer->email,
                'phone'       => $customer->phone,
                'status'      => $customer->status instanceof UserStatus ? $customer->status->value : (string) $customer->status,
                'locked_at'   => $customer->locked_at?->toISOString(),
                'lock_reason' => $customer->lock_reason,
                'created_at'  => $customer->created_at?->toISOString(),
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

    /**
     * Thay đổi trạng thái tài khoản khách hàng (Khóa / Mở khóa)
     * PATCH /api/admin/customers/{id}/status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        if ($currentUser?->role?->name !== 'admin') {
            return response()->json([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,locked'],
            'reason' => ['nullable', 'string', 'max:255'],
        ], [
            'status.required' => 'Trạng thái là bắt buộc.',
            'status.in'       => 'Trạng thái phải là active hoặc locked.',
            'reason.string'   => 'Lý do khóa tài khoản không hợp lệ.',
            'reason.max'      => 'Lý do khóa tài khoản không được vượt quá 255 ký tự.',
        ]);

        $targetUser = User::with('role')->find($id);

        if (!$targetUser) {
            return response()->json([
                'message' => 'Không tìm thấy thông tin khách hàng.',
            ], 404);
        }

        if ($targetUser->role?->name !== 'customer') {
            return response()->json([
                'message' => 'Chỉ có thể thay đổi trạng thái của tài khoản khách hàng.',
            ], 422);
        }

        if ((int) $currentUser->id === (int) $targetUser->id) {
            return response()->json([
                'message' => 'Bạn không thể tự khóa tài khoản của chính mình.',
            ], 422);
        }

        $newStatus = UserStatus::from($validated['status']);
        $reason = $request->filled('reason') ? trim((string) $request->input('reason')) : null;

        if ($newStatus === UserStatus::Locked) {
            $targetUser->update([
                'status'      => UserStatus::Locked,
                'locked_at'   => now(),
                'lock_reason' => $reason,
            ]);

            // Thu hồi tất cả Sanctum tokens để người dùng bị đăng xuất ngay lập tức
            $targetUser->tokens()->delete();

            $message = 'Khóa tài khoản khách hàng thành công.';
        } else {
            $targetUser->update([
                'status'      => UserStatus::Active,
                'locked_at'   => null,
                'lock_reason' => null,
            ]);

            $message = 'Mở khóa tài khoản khách hàng thành công.';
        }

        return response()->json([
            'message'  => $message,
            'customer' => [
                'id'          => $targetUser->id,
                'full_name'   => $targetUser->full_name,
                'email'       => $targetUser->email,
                'phone'       => $targetUser->phone,
                'status'      => $targetUser->status instanceof UserStatus ? $targetUser->status->value : (string) $targetUser->status,
                'locked_at'   => $targetUser->locked_at?->toISOString(),
                'lock_reason' => $targetUser->lock_reason,
                'created_at'  => $targetUser->created_at?->toISOString(),
            ],
        ], 200);
    }
}

