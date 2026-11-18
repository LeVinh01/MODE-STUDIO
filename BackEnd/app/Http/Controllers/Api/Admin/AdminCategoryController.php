<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminCategoryImageUploadRequest;
use App\Http\Requests\Admin\AdminCategoryStoreRequest;
use App\Http\Requests\Admin\AdminCategoryUpdateRequest;
use App\Http\Resources\Admin\AdminCategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminCategoryController extends Controller
{
    /**
     * Danh sách danh mục quản trị (hỗ trợ tìm kiếm, lọc theo parent, phân trang hoặc lấy tất cả)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::query()
            ->with(['parent'])
            ->withCount(['products', 'children']);

        if ($request->filled('search')) {
            $term = trim((string) $request->search);
            if ($term !== '') {
                $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term);
                $query->where(function ($q) use ($escaped) {
                    $q->whereRaw("name LIKE ? ESCAPE '!'", ["%{$escaped}%"])
                      ->orWhereRaw("slug LIKE ? ESCAPE '!'", ["%{$escaped}%"]);
                });
            }
        }

        if ($request->filled('parent_id')) {
            $parentId = $request->input('parent_id');
            if ($parentId === 'root' || $parentId === 'null' || $parentId === '') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', (int) $parentId);
            }
        }

        $query->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
              ->orderBy('sort_order', 'asc')
              ->orderBy('id', 'asc');

        if ($request->boolean('all', true)) {
            $categories = $query->get();
            return response()->json([
                'data' => AdminCategoryResource::collection($categories),
            ]);
        }

        $perPage = (int) $request->input('per_page', 25);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 25;
        }

        $paginator = $query->paginate($perPage);

        return AdminCategoryResource::collection($paginator)->response();
    }

    /**
     * Chi tiết danh mục
     */
    public function show(int $id): JsonResponse
    {
        $category = Category::query()
            ->with(['parent', 'children'])
            ->withCount(['products', 'children'])
            ->findOrFail($id);

        return (new AdminCategoryResource($category))->response();
    }

    /**
     * Tạo danh mục mới
     */
    public function store(AdminCategoryStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $category = Category::create([
            'parent_id'   => $data['parent_id'] ?? null,
            'name'        => $data['name'],
            'slug'        => $data['slug'],
            'description' => $data['description'] ?? null,
            'sort_order'  => $data['sort_order'] ?? 0,
            'is_active'   => $request->boolean('is_active', true),
        ]);

        $category->load('parent')->loadCount(['products', 'children']);

        return (new AdminCategoryResource($category))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Cập nhật danh mục
     */
    public function update(AdminCategoryUpdateRequest $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $data = $request->validated();

        $category->update($data);
        $category->load('parent')->loadCount(['products', 'children']);

        return (new AdminCategoryResource($category))->response();
    }

    /**
     * Tải lên / thay thế ảnh đại diện danh mục (lưu disk public, xóa file cũ)
     */
    public function uploadImage(AdminCategoryImageUploadRequest $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $file = $request->file('image');

        // Xóa file ảnh cũ nếu có trên disk public
        $this->deleteOldImageFile($category->image_url);

        // Lưu file ảnh mới vào public disk (categories/)
        $path = $file->store('categories', 'public');
        $fullUrl = Storage::disk('public')->url($path);

        $category->update(['image_url' => $fullUrl]);
        $category->load('parent')->loadCount(['products', 'children']);

        return (new AdminCategoryResource($category))->response();
    }

    /**
     * Xóa ảnh đại diện của danh mục (xóa file trên disk public, set null image_url)
     */
    public function removeImage(int $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $this->deleteOldImageFile($category->image_url);

        $category->update(['image_url' => null]);
        $category->load('parent')->loadCount(['products', 'children']);

        return (new AdminCategoryResource($category))->response();
    }

    /**
     * Xóa file ảnh vật lý trên disk public nếu tồn tại
     */
    protected function deleteOldImageFile(?string $imageUrl): void
    {
        if (!$imageUrl) {
            return;
        }

        // Trích xuất đường dẫn tương đối sau /storage/
        $parsedPath = parse_url($imageUrl, PHP_URL_PATH);
        $relative = Str::after((string) $parsedPath, '/storage/');

        if ($relative && Storage::disk('public')->exists($relative)) {
            Storage::disk('public')->delete($relative);
        }
    }
}
