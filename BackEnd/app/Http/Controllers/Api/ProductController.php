<?php

namespace App\Http\Controllers\Api;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductIndexRequest;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    public function index(ProductIndexRequest $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->where('status', ProductStatus::Active)
            ->where('published_at', '<=', now())
            ->with([
                'category',
                'brand',
                'mainImage',
                'variants' => fn($q) => $q->where('is_active', true)->with('color'),
            ]);

        // 1. Filter theo category slug (gồm cả sub-categories)
        if ($request->filled('category')) {
            $catSlug = $request->input('category');
            $category = Category::where('slug', $catSlug)->first();

            if ($category) {
                $childIds = $category->children()->pluck('id')->all();
                $allCategoryIds = array_merge([$category->id], $childIds);
                $query->whereIn('category_id', $allCategoryIds);
            } else {
                // Nếu slug không tồn tại, trả về rỗng
                $query->whereRaw('1 = 0');
            }
        }

        // 2. Filter theo brand slug
        if ($request->filled('brand')) {
            $brandSlug = $request->input('brand');
            $brand = Brand::where('slug', $brandSlug)->first();

            if ($brand) {
                $query->where('brand_id', $brand->id);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        // 3. Filter theo color IDs
        if ($request->filled('color')) {
            $colorIds = $request->input('color_ids', []);
            if (!empty($colorIds)) {
                $query->whereHas('variants', function ($q) use ($colorIds) {
                    $q->where('is_active', true)
                      ->whereIn('color_id', $colorIds);
                });
            }
        }

        // 4. Filter theo size IDs
        if ($request->filled('size')) {
            $sizeIds = $request->input('size_ids', []);
            if (!empty($sizeIds)) {
                $query->whereHas('variants', function ($q) use ($sizeIds) {
                    $q->where('is_active', true)
                      ->whereIn('size_id', $sizeIds);
                });
            }
        }

        // 5. Filter theo khoảng giá (min_price, max_price)
        if ($request->filled('min_price')) {
            $query->where('base_price', '>=', (int) $request->input('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('base_price', '<=', (int) $request->input('max_price'));
        }

        // 6. Filter theo gender
        if ($request->filled('gender')) {
            $query->where('gender', $request->input('gender'));
        }

        // 7. Tìm theo từ khóa q (escape !, %, _)
        if ($request->filled('q')) {
            $rawTerm = (string) $request->input('q');
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $rawTerm);
            $query->whereRaw("name LIKE ? ESCAPE '!'", ["%{$escaped}%"]);
        }

        // 8. Filter featured
        if ($request->has('featured')) {
            $query->where('is_featured', $request->boolean('featured'));
        }

        // 9. Sắp xếp (sort) kèm tiêu chí phụ id DESC để ổn định phân trang
        $sort = $request->input('sort', 'newest');
        match ($sort) {
            'price_asc'  => $query->orderBy('base_price', 'asc'),
            'price_desc' => $query->orderBy('base_price', 'desc'),
            default      => $query->orderBy('published_at', 'desc'),
        };
        $query->orderBy('id', 'desc');

        // 10. Phân trang
        $perPage = (int) $request->input('per_page', 12);
        $products = $query->paginate($perPage);

        return ProductListResource::collection($products);
    }

    public function show(string $slug): ProductDetailResource|JsonResponse
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('status', ProductStatus::Active)
            ->where('published_at', '<=', now())
            ->with([
                'category',
                'brand',
                'images' => fn($q) => $q->orderBy('sort_order', 'asc'),
                'variants.color',
                'variants.size',
            ])
            ->first();

        if (!$product) {
            return response()->json([
                'message' => 'Sản phẩm không tồn tại.',
            ], 404);
        }

        return new ProductDetailResource($product);
    }
}
