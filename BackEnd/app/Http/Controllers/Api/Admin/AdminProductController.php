<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminProductIndexRequest;
use App\Http\Requests\Admin\AdminProductStoreRequest;
use App\Http\Requests\Admin\AdminProductUpdateRequest;
use App\Http\Resources\Admin\AdminProductDetailResource;
use App\Http\Resources\Admin\AdminProductListResource;
use App\Models\Product;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminProductController extends Controller
{
    public function index(AdminProductIndexRequest $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->with(['category', 'brand', 'mainImage'])
            ->withCount(['variants' => fn($q) => $q->withoutTrashed()])
            ->withSum(['variants as total_stock' => fn($q) => $q->withoutTrashed()], 'stock_quantity');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->search);
            if ($term !== '') {
                $escaped = str_replace(['!', '%', '_'], ['!|', '!%', '!_'], $term);
                $query->where(function ($q) use ($escaped) {
                    $q->whereRaw("name LIKE ? ESCAPE '!'", ["%{$escaped}%"])
                      ->orWhereRaw("slug LIKE ? ESCAPE '!'", ["%{$escaped}%"]);
                });
            }
        }

        $perPage = (int) $request->input('per_page', 15);
        $products = $query->orderBy('id', 'desc')->paginate($perPage);

        return AdminProductListResource::collection($products);
    }

    public function show(int $id): AdminProductDetailResource
    {
        $product = Product::with([
            'category',
            'brand',
            'variants' => fn($q) => $q->withTrashed()->with(['color', 'size']),
            'images'   => fn($q) => $q->with('color')->orderBy('sort_order', 'asc'),
        ])->findOrFail($id);

        return new AdminProductDetailResource($product);
    }

    public function store(AdminProductStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (empty($data['slug'])) {
            $baseSlug = Str::slug($data['name']);
            $slug = $baseSlug;
            $count = 1;
            while (Product::withTrashed()->where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$count}";
                $count++;
            }
            $data['slug'] = $slug;
        }

        if (!isset($data['status'])) {
            $data['status'] = ProductStatus::Draft;
        }

        if (($data['status'] === ProductStatus::Active->value || $data['status'] === 'active') && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $product = DB::transaction(function () use ($data) {
            return Product::create($data);
        });

        $product->load(['category', 'brand']);

        return (new AdminProductDetailResource($product))
            ->response()
            ->setStatusCode(201);
    }

    public function update(AdminProductUpdateRequest $request, int $id): AdminProductDetailResource
    {
        $product = Product::with(['variants', 'images'])->findOrFail($id);
        $data = $request->validated();

        $targetStatus = $data['status'] ?? ($product->status instanceof ProductStatus ? $product->status->value : (string) $product->status);

        if ($targetStatus === ProductStatus::Active->value || $targetStatus === 'active') {
            $hasActiveVariant = $product->variants()
                ->where('is_active', true)
                ->withoutTrashed()
                ->exists();

            $hasImage = $product->images()->exists();

            if (!$hasActiveVariant || !$hasImage) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Không thể kích hoạt sản phẩm khi chưa có ít nhất một biến thể đang hoạt động và ít nhất một hình ảnh.',
                    'errors'  => [
                        'status' => ['Sản phẩm cần có ít nhất một biến thể đang bán và một hình ảnh để xuất bản.'],
                    ],
                ], 422));
            }

            // Tự động đặt published_at = now() khi chuyển sang active mà published_at đang null
            // Nếu admin gửi published_at rõ ràng thì giữ giá trị admin gửi
            // Không ghi đè published_at đã có khi kích hoạt lại hoặc cập nhật trường khác
            if (!array_key_exists('published_at', $data)) {
                if ($product->published_at === null) {
                    $data['published_at'] = now();
                }
            } elseif ($data['published_at'] === null && $product->published_at === null) {
                $data['published_at'] = now();
            }
        }

        $product->update($data);

        $product->load([
            'category',
            'brand',
            'variants' => fn($q) => $q->withTrashed()->with(['color', 'size']),
            'images'   => fn($q) => $q->with('color')->orderBy('sort_order', 'asc'),
        ]);

        return new AdminProductDetailResource($product);
    }

    public function destroy(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'message' => 'Xóa sản phẩm thành công.',
        ]);
    }
}
