<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ClothingTypeCategorySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Đảm bảo danh mục gốc women và men đã tồn tại
        $women = Category::firstOrCreate(['slug' => 'women'], [
            'name'        => 'Thời Trang Nữ',
            'description' => 'Bộ sưu tập thời trang may đo tinh tế dành cho phái đẹp.',
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        $men = Category::firstOrCreate(['slug' => 'men'], [
            'name'        => 'Thời Trang Nam',
            'description' => 'Thiết kế trang phục quý ông lịch lãm, hiện đại và chuẩn mực.',
            'sort_order'  => 2,
            'is_active'   => true,
        ]);

        // 2. Danh mục con cho NỮ (giữ nguyên jackets-blazers và dresses, thêm 7 loại trang phục mới)
        $womenCategories = [
            [
                'slug'        => 'women-coats',
                'name'        => 'Áo Khoác Dạ & Măng Tô Nữ',
                'description' => 'Áo khoác dạ, măng tô ấm áp sang trọng cho phái đẹp.',
                'sort_order'  => 3,
            ],
            [
                'slug'        => 'women-sweaters',
                'name'        => 'Áo Len Nữ',
                'description' => 'Áo len dệt kim, len cashmere mềm mịn ấm áp.',
                'sort_order'  => 4,
            ],
            [
                'slug'        => 'women-cardigans',
                'name'        => 'Áo Cardigan Nữ',
                'description' => 'Áo khoác len cardigan nữ tính, thanh lịch.',
                'sort_order'  => 5,
            ],
            [
                'slug'        => 'women-blouses',
                'name'        => 'Áo Sơ Mi & Blouse Nữ',
                'description' => 'Áo sơ mi công sở, áo blouse lụa điệu đà.',
                'sort_order'  => 6,
            ],
            [
                'slug'        => 'women-jeans',
                'name'        => 'Quần Jeans Nữ',
                'description' => 'Quần jeans nữ tôn dáng với chất liệu denim cao cấp.',
                'sort_order'  => 7,
            ],
            [
                'slug'        => 'women-pants',
                'name'        => 'Quần Tây & Quần Suông Nữ',
                'description' => 'Quần tây may đo, quần suông lụa thanh thoát.',
                'sort_order'  => 8,
            ],
            [
                'slug'        => 'women-underwear',
                'name'        => 'Đồ Lót Nữ',
                'description' => 'Nội y thiết kế tinh tế, thoải mái và thoáng khí.',
                'sort_order'  => 9,
            ],
        ];

        foreach ($womenCategories as $cat) {
            Category::firstOrCreate(['slug' => $cat['slug']], [
                'parent_id'   => $women->id,
                'name'        => $cat['name'],
                'description' => $cat['description'],
                'sort_order'  => $cat['sort_order'],
                'is_active'   => true,
            ]);
        }

        // 3. Danh mục con cho NAM (8 loại trang phục có tiền tố men-)
        $menCategories = [
            [
                'slug'        => 'men-jackets',
                'name'        => 'Áo Khoác Nam',
                'description' => 'Áo khoác gió, áo khoác bomber nam tính mạnh mẽ.',
                'sort_order'  => 1,
            ],
            [
                'slug'        => 'men-coats',
                'name'        => 'Áo Măng Tô & Áo Choàng Nam',
                'description' => 'Áo măng tô dạ dáng dài lịch lãm cho phái mạnh.',
                'sort_order'  => 2,
            ],
            [
                'slug'        => 'men-sweaters',
                'name'        => 'Áo Len Nam',
                'description' => 'Áo len merino, áo dệt kim cổ tròn cổ điển.',
                'sort_order'  => 3,
            ],
            [
                'slug'        => 'men-cardigans',
                'name'        => 'Áo Cardigan Nam',
                'description' => 'Áo khoác len cardigan quý ông thanh lịch.',
                'sort_order'  => 4,
            ],
            [
                'slug'        => 'men-shirts',
                'name'        => 'Áo Sơ Mi Nam',
                'description' => 'Áo sơ mi may đo cao cấp từ cotton Ai Cập.',
                'sort_order'  => 5,
            ],
            [
                'slug'        => 'men-jeans',
                'name'        => 'Quần Jeans Nam',
                'description' => 'Quần jeans nam bền bỉ, phong cách và thoải mái.',
                'sort_order'  => 6,
            ],
            [
                'slug'        => 'men-pants',
                'name'        => 'Quần Tây & Quần Dài Nam',
                'description' => 'Quần tây xếp ly chuẩn mực, quần kaki hiện đại.',
                'sort_order'  => 7,
            ],
            [
                'slug'        => 'men-underwear',
                'name'        => 'Đồ Lót Nam',
                'description' => 'Trang phục lót nam kháng khuẩn, êm ái thoáng mát.',
                'sort_order'  => 8,
            ],
        ];

        foreach ($menCategories as $cat) {
            Category::firstOrCreate(['slug' => $cat['slug']], [
                'parent_id'   => $men->id,
                'name'        => $cat['name'],
                'description' => $cat['description'],
                'sort_order'  => $cat['sort_order'],
                'is_active'   => true,
            ]);
        }

        // 4. Chỉ gán lại danh mục cho 2 sản phẩm mẫu cụ thể theo đúng quyết định đã duyệt
        $menSweaters = Category::where('slug', 'men-sweaters')->first();
        if ($menSweaters) {
            Product::where('slug', 'ao-len-det-kim-nam')
                ->orWhere('name', 'Áo Len Dệt Kim Nam')
                ->update(['category_id' => $menSweaters->id]);
        }

        $womenPants = Category::where('slug', 'women-pants')->first();
        if ($womenPants) {
            Product::where('slug', 'quan-suong-lua-nu')
                ->orWhere('name', 'Quần Suông Lụa Nữ')
                ->update(['category_id' => $womenPants->id]);
        }
    }
}
