<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminColorStoreRequest;
use App\Http\Requests\Admin\AdminColorUpdateRequest;
use App\Http\Resources\Admin\AdminColorResource;
use App\Models\Color;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminColorController extends Controller
{
    /**
     * Danh sách màu sắc kèm thống kê số biến thể và ảnh
     */
    public function index(Request $request): JsonResponse
    {
        $query = Color::query()
            ->withCount(['variants', 'images']);

        if ($request->filled('search')) {
            $term = trim((string) $request->search);
            if ($term !== '') {
                $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term);
                $query->whereRaw("name LIKE ? ESCAPE '!'", ["%{$escaped}%"]);
            }
        }

        $sort = (string) $request->input('sort', 'name');
        $direction = strtolower((string) $request->input('direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        if (in_array($sort, ['id', 'name', 'created_at', 'variants_count'], true)) {
            $query->orderBy($sort, $direction);
        } else {
            $query->orderBy('name', 'asc');
        }

        // Trả về toàn bộ danh sách khi all=1 hoặc không yêu cầu phân trang
        if ($request->boolean('all')) {
            $colors = $query->get();
            return response()->json([
                'data' => AdminColorResource::collection($colors),
            ]);
        }

        $perPage = (int) $request->input('per_page', 20);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 20;
        }

        $paginator = $query->paginate($perPage);

        return AdminColorResource::collection($paginator)->response();
    }

    /**
     * Chi tiết màu sắc
     */
    public function show(int $id): JsonResponse
    {
        $color = Color::query()
            ->withCount(['variants', 'images'])
            ->findOrFail($id);

        return (new AdminColorResource($color))->response();
    }

    /**
     * Tạo màu sắc mới
     */
    public function store(AdminColorStoreRequest $request): JsonResponse
    {
        $color = Color::create([
            'name'     => trim((string) $request->validated('name')),
            'hex_code' => strtolower(trim((string) $request->validated('hex_code'))),
        ]);

        $color->loadCount(['variants', 'images']);

        return (new AdminColorResource($color))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Cập nhật màu sắc
     */
    public function update(AdminColorUpdateRequest $request, int $id): JsonResponse
    {
        $color = Color::findOrFail($id);

        $payload = [];
        if ($request->has('name')) {
            $payload['name'] = trim((string) $request->validated('name'));
        }
        if ($request->has('hex_code')) {
            $payload['hex_code'] = strtolower(trim((string) $request->validated('hex_code')));
        }

        if (!empty($payload)) {
            $color->update($payload);
        }

        $color->loadCount(['variants', 'images']);

        return (new AdminColorResource($color))->response();
    }

    /**
     * Xóa màu sắc (chặn xóa nếu đang được sử dụng bởi biến thể hoặc ảnh sản phẩm)
     */
    public function destroy(int $id): JsonResponse
    {
        $color = Color::findOrFail($id);

        $variantsCount = $color->variants()->count();
        $imagesCount = $color->images()->count();

        if ($variantsCount > 0 || $imagesCount > 0) {
            return response()->json([
                'message' => 'Không thể xóa màu sắc đang được sử dụng bởi biến thể hoặc hình ảnh sản phẩm.',
                'errors'  => [
                    'color' => [
                        "Màu này đang được sử dụng bởi {$variantsCount} biến thể và {$imagesCount} hình ảnh sản phẩm.",
                    ],
                ],
            ], 422);
        }

        $color->delete();

        return response()->json([
            'message' => 'Đã xóa màu sắc thành công.',
        ]);
    }
}
