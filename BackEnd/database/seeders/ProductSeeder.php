<?php

namespace Database\Seeders;

use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Color;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Size;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Tải lookup tables vào memory để tránh N+1
        $categories = Category::pluck('id', 'slug');
        $brands     = Brand::pluck('id', 'slug');
        $colors     = Color::pluck('id', 'name');
        $sizes      = Size::pluck('id', 'name');

        // published_at: mock không có trường này.
        // Quy tắc tự đặt:
        //   - isNew=true trong mock (prod-002, 007) → published_at gần đây
        //   - prod-009, 010, 011 (sản phẩm bổ sung) → published_at gần đây
        //   - Các sản phẩm active còn lại → published_at cũ
        //   - prod-012 (draft) → null

        $products = [
            // ── 8 sản phẩm từ mock ──────────────────────────────────────────────
            [
                'slug'              => 'ao-blazer-len-cashmere-may-do',
                'name'              => 'Áo Blazer Len Cashmere May Đo',
                'description'       => 'Thiết kế áo blazer hai hàng khuy may đo thủ công từ len cashmere thượng hạng. Phom dáng sắc sảo, đường may lót lụa tinh tế mang lại vẻ đẹp quyền lực và thanh lịch vượt thời gian.',
                'category_slug'     => 'jackets-blazers',
                'brand_slug'        => 'mode-studio',
                'gender'            => ProductGender::Women,
                'material'          => 'Len Cashmere thượng hạng',
                'base_price'        => 3850000,
                'compare_at_price'  => 4500000, // originalPrice trong mock
                'status'            => ProductStatus::Active,
                'is_featured'       => true,
                'published_at'      => '2026-09-15', // tự đặt (mock không có published_at)
                'colors'            => ['Đen Tuyệt Đối', 'Kem Sữa'],
                'sizes'             => ['S', 'M', 'L'],
                // SKU prefix theo mock: BLZ-CSH
                'sku_prefix'        => 'BLZ-CSH',
                'color_codes'       => ['BLK', 'CRM'],
                'stock'             => 12,
            ],
            [
                'slug'              => 'dam-suong-lua-to-tam-thuong-hang',
                'name'              => 'Đầm Suông Lụa Tơ Tằm Thượng Hạng',
                'description'       => 'Đầm lụa tơ tằm dệt tự nhiên với độ rủ óng ả mềm mại, tôn vinh chuyển động nhẹ nhàng của cơ thể. Phong cách tối giản editorial thích hợp cho cả dạ tiệc và phong cách hàng ngày cao cấp.',
                'category_slug'     => 'dresses',
                'brand_slug'        => 'mode-studio',
                'gender'            => ProductGender::Women,
                'material'          => 'Lụa tơ tằm thiên nhiên',
                'base_price'        => 2950000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => true,
                'published_at'      => '2026-10-25', // tự đặt – isNew=true trong mock
                'colors'            => ['Be Cát', 'Đen Nhám'],
                'sizes'             => ['S', 'M', 'L'],
                'sku_prefix'        => 'DRS-SLK',
                'color_codes'       => ['SND', 'DKB'],
                'stock'             => 15,
            ],
            [
                'slug'              => 'bo-suit-nam-wool-super-130s',
                'name'              => 'Bộ Suit Nam Wool Super 130s',
                'description'       => 'Bộ vest hai mảnh nam may đo chuẩn xác từ vải len Super 130s nhập khẩu từ Ý. Cấu trúc ve áo cổ điển sắc nét, vai áo mềm mại tạo cảm giác tự tin và sang trọng vượt bậc.',
                'category_slug'     => 'men',
                'brand_slug'        => 'heritage-craft',
                'gender'            => ProductGender::Men,
                'material'          => 'Len Super 130s nhập khẩu Ý',
                'base_price'        => 6200000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-08-10', // tự đặt (mock không có published_at)
                'colors'            => ['Xám Than', 'Xanh Đêm'],
                'sizes'             => ['S', 'M', 'L', 'XL'], // size 48 → map sang S/M/L/XL
                'sku_prefix'        => 'SUT-WOL',
                'color_codes'       => ['CHR', 'NVY'],
                'stock'             => 6,
            ],
            [
                'slug'              => 'ao-so-mi-poplin-cotton-ai-cap',
                'name'              => 'Áo Sơ Mi Poplin Cotton Ai Cập',
                'description'       => 'Áo sơ mi cổ điển được dệt từ sợi bông dài Ai Cập Giza hảo hạng. Bề mặt vải mịn mượt, phom dáng Modern Fit tôn dáng, hoàn hảo khi kết hợp cùng áo blazer hoặc mặc độc lập.',
                'category_slug'     => 'men',
                'brand_slug'        => 'heritage-craft',
                'gender'            => ProductGender::Men,
                'material'          => 'Cotton Giza Ai Cập',
                'base_price'        => 1450000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-09-02', // tự đặt (mock không có published_at)
                'colors'            => ['Trắng Tinh Khiết', 'Xanh Khói Nhạt'],
                'sizes'             => ['S', 'M', 'L', 'XL'], // size 39 → map sang S/M/L/XL
                'sku_prefix'        => 'SHT-POP',
                'color_codes'       => ['WHT', 'LBL'],
                'stock'             => 20,
            ],
            [
                'slug'              => 'quan-tay-xep-ly-dang-ru-sang-trong',
                'name'              => 'Quần Tây Xếp Ly Dáng Rủ Sang Trọng',
                'description'       => 'Quần âu xếp ly đôi cạp cao với ống suông rộng thư thái. Chất liệu pha len cao cấp chống nhăn, mang lại cảm giác thoải mái suốt ngày dài mà vẫn giữ trọn nét thanh lịch.',
                'category_slug'     => 'women',
                'brand_slug'        => 'mode-studio',
                'gender'            => ProductGender::Women,
                'material'          => 'Len pha cao cấp chống nhăn',
                'base_price'        => 1850000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-09-28', // tự đặt (mock không có published_at)
                'colors'            => ['Taupe Ấm', 'Đen Tuyệt Đối'],
                'sizes'             => ['S', 'M', 'L'],
                'sku_prefix'        => 'TRS-PLT',
                'color_codes'       => ['TPE', 'BLK'],
                'stock'             => 11,
            ],
            [
                'slug'              => 'tui-da-bo-y-cam-tay-toi-gian',
                'name'              => 'Túi Da Bò Ý Cầm Tay Tối Giản',
                'description'       => 'Chế tác từ da thuộc thảo mộc nguyên tấm nhập khẩu từ vùng Tuscany nước Ý. Cấu trúc hình học tối giản không lộ đường chỉ thô, phụ kiện mạ đồng cổ sang trọng.',
                'category_slug'     => 'bags',
                'brand_slug'        => 'artisan-collective',
                'gender'            => ProductGender::Unisex,
                'material'          => 'Da thuộc thảo mộc Tuscany',
                'base_price'        => 4200000,
                'compare_at_price'  => 4950000, // originalPrice trong mock
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-08-22', // tự đặt (mock không có published_at)
                'colors'            => ['Nâu Da Bò', 'Đen Nhám'],
                'sizes'             => ['One Size'],
                'sku_prefix'        => 'BAG-LEA',
                'color_codes'       => ['BRN', 'DKN'],
                'stock'             => 7,
            ],
            [
                'slug'              => 'ao-khoac-mang-to-da-cuu-dang-dai',
                'name'              => 'Áo Khoác Măng Tô Dạ Cừu Dáng Dài',
                'description'       => 'Kiệt tác mùa đông từ chất dạ lông cừu nguyên chất dệt dày dặn. Thiết kế hai hàng khuy vạt chéo, đai lưng thắt eo tôn dáng và đường cắt may chuẩn xác kiểu Anh.',
                'category_slug'     => 'jackets-blazers',
                'brand_slug'        => 'mode-studio',
                'gender'            => ProductGender::Women,
                'material'          => 'Dạ lông cừu nguyên chất',
                'base_price'        => 5600000,
                'compare_at_price'  => 6500000, // thêm mới – sản phẩm mới có khuyến mãi khai trương
                'status'            => ProductStatus::Active,
                'is_featured'       => true,
                'published_at'      => '2026-10-31', // tự đặt – isNew=true trong mock
                'colors'            => ['Nâu Lạc Đà', 'Xám Đá'],
                'sizes'             => ['S', 'M', 'L'],
                'sku_prefix'        => 'COT-WOL',
                'color_codes'       => ['CAM', 'GRY'],
                'stock'             => 8,
            ],
            [
                'slug'              => 'that-lung-da-that-mat-khoa-kim-loai-duc',
                'name'              => 'Thắt Lưng Da Thật Mặt Khóa Kim Loại Đúc',
                'description'       => 'Thắt lưng bản 3cm chế tác từ da bò full-grain bền bỉ. Mặt khóa đồng đúc nguyên khối hoàn thiện mờ satin mang lại điểm nhấn tinh tế cho bộ âu phục.',
                'category_slug'     => 'belts',
                'brand_slug'        => 'artisan-collective',
                'gender'            => ProductGender::Unisex,
                'material'          => 'Da bò full-grain',
                'base_price'        => 890000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-07-14', // tự đặt (mock không có published_at)
                // isOutOfStock=true trong mock → stock_quantity=0, is_active=true (vẫn hiển thị, badge "Hết hàng")
                'colors'            => ['Đen Tuyệt Đối', 'Nâu Cổ Điển'],
                'sizes'             => ['One Size'], // size 95 → One Size
                'sku_prefix'        => 'BLT-LEA',
                'color_codes'       => ['BLK', 'DKB'],
                'stock'             => 0, // hết hàng
            ],
            // ── 4 sản phẩm bổ sung ─────────────────────────────────────────────
            [
                'slug'              => 'quan-suong-lua-nu',
                'name'              => 'Quần Suông Lụa Nữ',
                'description'       => 'Quần suông chất lụa tơ tằm mềm mại, cạp thun co giãn thoải mái. Phom dáng rộng thư thái, dễ phối cùng áo tucked-in hoặc áo blazer.',
                'category_slug'     => 'women',
                'brand_slug'        => 'mode-studio',
                'gender'            => ProductGender::Women,
                'material'          => 'Lụa tơ tằm thiên nhiên',
                'base_price'        => 1650000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-11-01', // tự đặt – sản phẩm bổ sung, coi là mới
                'colors'            => ['Be Cát', 'Đen Nhám'],
                'sizes'             => ['S', 'M', 'L'],
                'sku_prefix'        => 'PNT-SLK',
                'color_codes'       => ['SND', 'DKN'],
                'stock'             => 12,
            ],
            [
                'slug'              => 'ao-len-det-kim-nam',
                'name'              => 'Áo Len Dệt Kim Nam',
                'description'       => 'Áo len merino Úc dệt kim mịn, nhẹ, giữ ấm xuất sắc. Cổ tròn cổ điển, tay dài vừa vặn, dễ phối vest hoặc mặc ngoài sơ mi.',
                'category_slug'     => 'men',
                'brand_slug'        => 'heritage-craft',
                'gender'            => ProductGender::Men,
                'material'          => 'Len merino Úc',
                'base_price'        => 1250000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-11-01', // tự đặt – sản phẩm bổ sung
                'colors'            => ['Xám Than', 'Kem Sữa'],
                'sizes'             => ['M', 'L', 'XL'],
                'sku_prefix'        => 'KNT-MNO',
                'color_codes'       => ['CHR', 'CRM'],
                'stock'             => 10,
            ],
            [
                'slug'              => 'vi-da-nho-clutch',
                'name'              => 'Ví Da Nhỏ Clutch',
                'description'       => 'Ví cầm tay nhỏ gọn từ da bò full-grain cao cấp, ngăn đựng thẻ và tiền tiện lợi. Thiết kế tối giản không trang trí, trường tồn với thời gian.',
                'category_slug'     => 'bags',
                'brand_slug'        => 'artisan-collective',
                'gender'            => ProductGender::Unisex,
                'material'          => 'Da bò full-grain',
                'base_price'        => 750000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Active,
                'is_featured'       => false,
                'published_at'      => '2026-11-01', // tự đặt – sản phẩm bổ sung
                'colors'            => ['Nâu Da Bò', 'Đen Tuyệt Đối'],
                'sizes'             => ['One Size'],
                'sku_prefix'        => 'WLT-LEA',
                'color_codes'       => ['BRN', 'BLK'],
                'stock'             => 15,
            ],
            [
                'slug'              => 'ao-blazer-nu-len-mong',
                'name'              => 'Áo Blazer Nữ Len Mỏng',
                'description'       => 'Blazer len mỏng nhẹ nhàng dành cho mùa hè. Phom structured vừa vặn, lớp lót lụa mỏng thoáng mát, phù hợp văn phòng và dạo phố.',
                'category_slug'     => 'jackets-blazers',
                'brand_slug'        => 'mode-studio',
                'gender'            => ProductGender::Women,
                'material'          => 'Len wool nhẹ mùa hè',
                'base_price'        => 2200000,
                'compare_at_price'  => null,
                'status'            => ProductStatus::Draft, // draft – test lọc status
                'is_featured'       => false,
                'published_at'      => null, // draft → chưa publish
                'colors'            => ['Xám Đá', 'Kem Sữa'],
                'sizes'             => ['S', 'M', 'L'],
                'sku_prefix'        => 'BLZ-WOL',
                'color_codes'       => ['GRY', 'CRM'],
                'stock'             => 8,
            ],
        ];

        foreach ($products as $data) {
            $this->createProduct($data, $categories, $brands, $colors, $sizes);
        }
    }

    private function createProduct(array $data, $categories, $brands, $colors, $sizes): void
    {
        $product = Product::firstOrCreate(
            ['slug' => $data['slug']],
            [
                'category_id'      => $categories[$data['category_slug']],
                'brand_id'         => $brands[$data['brand_slug']],
                'name'             => $data['name'],
                'slug'             => $data['slug'],
                'description'      => $data['description'],
                'material'         => $data['material'],
                'gender'           => $data['gender'],
                'base_price'       => $data['base_price'],
                'compare_at_price' => $data['compare_at_price'],
                'status'           => $data['status'],
                'is_featured'      => $data['is_featured'],
                'published_at'     => $data['published_at'],
            ]
        );

        $isFirstColor = true;
        foreach ($data['colors'] as $idx => $colorName) {
            $colorId   = $colors[$colorName];
            $colorCode = $data['color_codes'][$idx];

            // Tạo variants cho từng size của màu này
            foreach ($data['sizes'] as $sizeName) {
                $sizeCode = match ($sizeName) {
                    'One Size' => 'OS',
                    default    => $sizeName,
                };
                $sku = "{$data['sku_prefix']}-{$colorCode}-{$sizeCode}";

                // Kiểm tra SKU trùng trước khi chèn
                if (ProductVariant::where('sku', $sku)->exists()) {
                    $this->command->warn("SKU trùng, bỏ qua: {$sku}");
                    continue;
                }

                ProductVariant::create([
                    'product_id'     => $product->id,
                    'color_id'       => $colorId,
                    'size_id'        => $sizes[$sizeName],
                    'sku'            => $sku,
                    'stock_quantity' => $data['stock'],
                    'is_active'      => true,
                ]);
            }

            // Tạo 1 ảnh placeholder cho mỗi màu
            $hexClean = ltrim($colors->search($colorId) !== false
                ? Color::find($colorId)->hex_code
                : 'cccccc', '#');

            // Màu chữ trên placeholder: trắng cho màu tối, đen cho màu sáng
            $brightness = $this->hexBrightness($hexClean);
            $textColor  = $brightness < 128 ? 'ffffff' : '000000';

            ProductImage::create([
                'product_id' => $product->id,
                'color_id'   => $colorId,
                'image_url'  => "https://placehold.co/800x1000/{$hexClean}/{$textColor}",
                'alt_text'   => "{$data['name']} – {$colorName}",
                'is_main'    => $isFirstColor, // ảnh đầu tiên là ảnh chính
                'sort_order' => $idx,
            ]);

            $isFirstColor = false;
        }
    }

    // Tính độ sáng từ hex để chọn màu chữ trên placeholder
    private function hexBrightness(string $hex): int
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return (int) (($r * 299 + $g * 587 + $b * 114) / 1000);
    }
}
