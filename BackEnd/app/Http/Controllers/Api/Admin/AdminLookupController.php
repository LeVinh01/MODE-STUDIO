<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Color;
use App\Models\Size;
use Illuminate\Http\JsonResponse;

class AdminLookupController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->select('id', 'name', 'slug', 'parent_id')
            ->orderBy('name', 'asc')
            ->get();

        $brands = Brand::query()
            ->select('id', 'name', 'slug')
            ->orderBy('name', 'asc')
            ->get();

        $colors = Color::query()
            ->select('id', 'name', 'hex_code')
            ->orderBy('id', 'asc')
            ->get();

        $sizes = Size::query()
            ->select('id', 'name', 'sort_order')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'categories' => $categories,
            'brands'     => $brands,
            'colors'     => $colors,
            'sizes'      => $sizes,
            'genders'    => [
                ['value' => 'women', 'label' => 'Nữ'],
                ['value' => 'men', 'label' => 'Nam'],
                ['value' => 'unisex', 'label' => 'Unisex'],
            ],
            'statuses'   => [
                ['value' => 'draft', 'label' => 'Bản nháp'],
                ['value' => 'active', 'label' => 'Đang hoạt động'],
                ['value' => 'archived', 'label' => 'Lưu trữ'],
            ],
        ]);
    }
}
