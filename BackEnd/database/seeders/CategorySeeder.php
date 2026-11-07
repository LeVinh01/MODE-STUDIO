<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // 3 danh mục gốc
        $women = Category::firstOrCreate(['slug' => 'women'], [
            'parent_id'  => null,
            'name'       => 'Thời Trang Nữ',
            'slug'       => 'women',
            'description' => 'Bộ sưu tập thời trang may đo tinh tế dành cho phái đẹp.',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        $men = Category::firstOrCreate(['slug' => 'men'], [
            'parent_id'  => null,
            'name'       => 'Thời Trang Nam',
            'slug'       => 'men',
            'description' => 'Thiết kế trang phục quý ông lịch lãm, hiện đại và chuẩn mực.',
            'sort_order' => 2,
            'is_active'  => true,
        ]);

        $accessories = Category::firstOrCreate(['slug' => 'accessories'], [
            'parent_id'  => null,
            'name'       => 'Phụ Kiện',
            'slug'       => 'accessories',
            'description' => 'Phụ kiện da thủ công và trang sức tối giản hoàn thiện phong cách.',
            'sort_order' => 3,
            'is_active'  => true,
        ]);

        // 4 danh mục con
        Category::firstOrCreate(['slug' => 'jackets-blazers'], [
            'parent_id'  => $women->id,
            'name'       => 'Áo Khoác & Blazer',
            'slug'       => 'jackets-blazers',
            'description' => 'Blazer may đo và áo khoác thời trang cao cấp.',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        Category::firstOrCreate(['slug' => 'dresses'], [
            'parent_id'  => $women->id,
            'name'       => 'Đầm & Váy',
            'slug'       => 'dresses',
            'description' => 'Đầm và váy thanh lịch từ chất liệu cao cấp.',
            'sort_order' => 2,
            'is_active'  => true,
        ]);

        Category::firstOrCreate(['slug' => 'bags'], [
            'parent_id'  => $accessories->id,
            'name'       => 'Túi Xách',
            'slug'       => 'bags',
            'description' => 'Túi xách da thủ công chế tác từ nguyên liệu cao cấp.',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        Category::firstOrCreate(['slug' => 'belts'], [
            'parent_id'  => $accessories->id,
            'name'       => 'Thắt Lưng',
            'slug'       => 'belts',
            'description' => 'Thắt lưng da bền đẹp, điểm nhấn tinh tế cho trang phục.',
            'sort_order' => 2,
            'is_active'  => true,
        ]);
    }
}
