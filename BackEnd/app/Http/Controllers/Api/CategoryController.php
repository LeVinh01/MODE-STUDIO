<?php

namespace App\Http\Controllers\Api;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $categories = Category::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->with(['children' => function ($query) {
                $query->where('is_active', true)
                      ->withCount(['products' => function ($q) {
                          $q->where('status', ProductStatus::Active)
                            ->where('published_at', '<=', now());
                      }])
                      ->orderBy('sort_order', 'asc');
            }])
            ->withCount(['products' => function ($q) {
                $q->where('status', ProductStatus::Active)
                  ->where('published_at', '<=', now());
            }])
            ->orderBy('sort_order', 'asc')
            ->get();

        return CategoryResource::collection($categories);
    }
}
