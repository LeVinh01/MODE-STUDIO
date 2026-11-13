<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductIndexRequest;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\OrderItem;
use App\Models\Product;
use Carbon\Carbon;
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

        // 7. Tìm theo từ khóa search (hoặc q làm dự phòng)
        $rawSearch = $request->input('search', $request->input('q'));
        $search = is_string($rawSearch) ? trim($rawSearch) : '';
        if (mb_strlen($search) > 150) {
            $search = mb_substr($search, 0, 150);
        }

        if ($search !== '') {
            // Tách từ khóa theo khoảng trắng, tối đa 5 từ
            $words = array_values(array_filter(preg_split('/\s+/u', $search), fn($w) => $w !== ''));
            $words = array_slice($words, 0, 5);

            if (!empty($words)) {
                $query->where(function ($q) use ($words) {
                    foreach ($words as $word) {
                        // Tạo các biến thể cho từ khóa:
                        // Yêu cầu: Mở rộng d -> đ: chỉ khi từ khóa có 'd'/'D' mà KHÔNG có 'đ'/'Đ'
                        // Giữ nguyên từ gốc (OR thêm biến thể); KHÔNG thay ngược đ -> d
                        $variants = [$word];
                        $hasD = (mb_stripos($word, 'd') !== false);
                        $hasDWithStroke = (mb_stripos($word, 'đ') !== false);

                        if ($hasD && !$hasDWithStroke) {
                            $dVariant = str_ireplace('d', 'đ', $word);
                            if ($dVariant !== $word && !in_array($dVariant, $variants, true)) {
                                $variants[] = $dVariant;
                            }
                        }

                        // Mỗi từ khóa (gồm các biến thể) phải khớp ít nhất 1 cột
                        $q->where(function ($subQuery) use ($variants) {
                            foreach ($variants as $idx => $variant) {
                                // Escape ký tự đặc biệt của LIKE (!, %, _) bằng '!'
                                $escaped = strtr($variant, [
                                    '!' => '!!',
                                    '%' => '!%',
                                    '_' => '!_',
                                ]);
                                $pattern = "%{$escaped}%";

                                $clause = ($idx === 0) ? 'where' : 'orWhere';

                                $subQuery->$clause(function ($colQuery) use ($pattern) {
                                    $colQuery->whereRaw("name LIKE ? ESCAPE '!'", [$pattern])
                                        ->orWhereRaw("slug LIKE ? ESCAPE '!'", [$pattern])
                                        ->orWhereRaw("description LIKE ? ESCAPE '!'", [$pattern])
                                        ->orWhereRaw("material LIKE ? ESCAPE '!'", [$pattern])
                                        ->orWhereHas('brand', function ($b) use ($pattern) {
                                            $b->whereRaw("name LIKE ? ESCAPE '!'", [$pattern]);
                                        })
                                        ->orWhereHas('category', function ($c) use ($pattern) {
                                            $c->whereRaw("name LIKE ? ESCAPE '!'", [$pattern]);
                                        });
                                });
                            }
                        });
                    }
                });
            }
        }

        // 8. Filter featured
        if ($request->has('featured')) {
            $query->where('is_featured', $request->boolean('featured'));
        }

        // 9. Sắp xếp (sort) kèm tiêu chí phụ id DESC để ổn định phân trang
        $hasCustomSort = $request->filled('sort');
        $sort = $request->input('sort', 'newest');

        if ($hasCustomSort) {
            match ($sort) {
                'price_asc'    => $query->orderBy('base_price', 'asc'),
                'price_desc'   => $query->orderBy('base_price', 'desc'),
                'best_selling' => (function () use ($query) {
                    $cutoff = Carbon::now()->subDays(90);
                    $query->select('products.*')
                        ->addSelect([
                            'total_sold' => OrderItem::selectRaw('COALESCE(SUM(order_items.quantity), 0)')
                                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                                ->whereColumn('order_items.product_id', 'products.id')
                                ->where('orders.status', '!=', OrderStatus::Cancelled->value)
                                ->where('orders.created_at', '>=', $cutoff),
                        ])
                        ->orderBy('total_sold', 'desc');
                })(),
                default        => $query->orderBy('published_at', 'desc'),
            };
        } else {
            // Nếu có từ khóa tìm kiếm và khách không chọn sắp xếp riêng:
            // Ưu tiên sản phẩm có tên chứa từ khóa tìm kiếm trước
            if ($search !== '') {
                $escapedSearch = strtr($search, [
                    '!' => '!!',
                    '%' => '!%',
                    '_' => '!_',
                ]);
                $searchPattern = "%{$escapedSearch}%";
                $query->orderByRaw("CASE WHEN name LIKE ? ESCAPE '!' THEN 0 ELSE 1 END", [$searchPattern]);
            }
            $query->orderBy('published_at', 'desc');
        }
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
                'variants' => fn($q) => $q->where('is_active', true)->with(['color', 'size']),
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
