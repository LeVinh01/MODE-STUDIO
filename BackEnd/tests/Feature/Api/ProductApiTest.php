<?php

namespace Tests\Feature\Api;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Color;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed đầy đủ lookup + products (12 SP: 11 active, 1 draft)
        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,
        ]);
    }

    public function test_list_returns_only_active_published_products(): void
    {
        $response = $this->getJson('/api/products');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => [
                             'id',
                             'name',
                             'slug',
                             'base_price',
                             'compare_at_price',
                             'is_featured',
                             'in_stock',
                             'published_at',
                             'category',
                             'brand',
                             'main_image',
                             'available_colors',
                         ],
                     ],
                     'links',
                     'meta' => [
                         'current_page',
                         'per_page',
                         'total',
                     ],
                 ]);

        // Tổng 12 sản phẩm seed, 1 cái draft -> chỉ 11 cái active & published
        $this->assertEquals(11, $response->json('meta.total'));
        $slugs = collect($response->json('data'))->pluck('slug')->all();
        $this->assertNotContains('ao-blazer-nu-len-mong', $slugs);
    }

    public function test_filter_by_category_includes_subcategories(): void
    {
        // category=women gồm SP gán trực tiếp women + jackets-blazers + dresses
        $response = $this->getJson('/api/products?category=women');

        $response->assertStatus(200);
        $total = $response->json('meta.total');
        // Seed có:
        // jackets-blazers: prod-001 (active), prod-007 (active), prod-012 (draft - bị loại) => 2
        // dresses: prod-002 (active) => 1
        // women trực tiếp: prod-005, prod-009 => 2
        // Tổng: 5
        $this->assertEquals(5, $total);
    }

    public function test_filter_by_brand_slug(): void
    {
        $response = $this->getJson('/api/products?brand=heritage-craft');

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('meta.total'));
        foreach ($response->json('data') as $item) {
            $this->assertEquals('heritage-craft', $item['brand']['slug']);
        }
    }

    public function test_filter_by_color_ids(): void
    {
        // Màu "Kem Sữa"
        $color = Color::where('name', 'Kem Sữa')->firstOrFail();
        $response = $this->getJson("/api/products?color={$color->id}");

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('meta.total'));
        foreach ($response->json('data') as $item) {
            $colorIds = collect($item['available_colors'])->pluck('id')->all();
            $this->assertContains($color->id, $colorIds);
        }
    }

    public function test_filter_by_size_ids(): void
    {
        // Size "XL"
        $size = Size::where('name', 'XL')->firstOrFail();
        $response = $this->getJson("/api/products?size={$size->id}");

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('meta.total'));
    }

    public function test_filter_by_price_range(): void
    {
        $response = $this->getJson('/api/products?min_price=2000000&max_price=4000000');

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('meta.total'));
        foreach ($response->json('data') as $item) {
            $this->assertGreaterThanOrEqual(2000000, $item['base_price']);
            $this->assertLessThanOrEqual(4000000, $item['base_price']);
        }
    }

    public function test_filter_by_gender(): void
    {
        $response = $this->getJson('/api/products?gender=men');

        $response->assertStatus(200);
        $this->assertEquals(3, $response->json('meta.total')); // prod-003, prod-004, prod-010
    }

    public function test_search_by_q_returns_matching_products(): void
    {
        $response = $this->getJson('/api/products?q=Cashmere');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('meta.total'));
        $this->assertEquals('ao-blazer-len-cashmere-may-do', $response->json('data.0.slug'));
    }

    public function test_search_q_escapes_like_wildcards(): void
    {
        // Tìm q=% phải trả về 0 kết quả vì không có sản phẩm nào tên chứa ký tự '%'
        $responsePercent = $this->getJson('/api/products?q=%');
        $responsePercent->assertStatus(200);
        $this->assertEquals(0, $responsePercent->json('meta.total'));

        // Tìm q=_ phải trả về 0 kết quả vì không có sản phẩm nào tên chứa ký tự '_'
        // (nếu không escape thì _ khớp mọi ký tự đơn và sẽ trả về tất cả 11 sản phẩm)
        $responseUnderscore = $this->getJson('/api/products?q=_');
        $responseUnderscore->assertStatus(200);
        $this->assertEquals(0, $responseUnderscore->json('meta.total'));

        // Tìm q=! phải trả về 0 kết quả vì không có sản phẩm nào tên chứa ký tự escape '!'
        $responseExclamation = $this->getJson('/api/products?q=!');
        $responseExclamation->assertStatus(200);
        $this->assertEquals(0, $responseExclamation->json('meta.total'));
    }

    public function test_filter_by_featured(): void
    {
        $response = $this->getJson('/api/products?featured=1');

        $response->assertStatus(200);
        // Seed có 3 sản phẩm featured (prod-001, prod-002, prod-007)
        $this->assertEquals(3, $response->json('meta.total'));
        foreach ($response->json('data') as $item) {
            $this->assertTrue($item['is_featured']);
        }
    }

    public function test_sort_price_asc_and_desc(): void
    {
        // Tăng dần
        $ascRes = $this->getJson('/api/products?sort=price_asc');
        $ascRes->assertStatus(200);
        $ascPrices = collect($ascRes->json('data'))->pluck('base_price')->all();
        $sortedAsc = $ascPrices;
        sort($sortedAsc);
        $this->assertEquals($sortedAsc, $ascPrices);

        // Giảm dần
        $descRes = $this->getJson('/api/products?sort=price_desc');
        $descRes->assertStatus(200);
        $descPrices = collect($descRes->json('data'))->pluck('base_price')->all();
        $sortedDesc = $descPrices;
        rsort($sortedDesc);
        $this->assertEquals($sortedDesc, $descPrices);
    }

    public function test_pagination_across_pages_has_no_duplicates_or_omissions(): void
    {
        // 11 active sản phẩm, per_page=4 => page 1 (4), page 2 (4), page 3 (3)
        $page1 = $this->getJson('/api/products?per_page=4&page=1')->json('data');
        $page2 = $this->getJson('/api/products?per_page=4&page=2')->json('data');
        $page3 = $this->getJson('/api/products?per_page=4&page=3')->json('data');

        $ids1 = collect($page1)->pluck('id');
        $ids2 = collect($page2)->pluck('id');
        $ids3 = collect($page3)->pluck('id');

        $allIds = $ids1->concat($ids2)->concat($ids3);

        $this->assertCount(11, $allIds);
        $this->assertCount(11, $allIds->unique(), 'Không được trùng lặp id giữa các trang');
    }

    public function test_validation_returns_422_on_invalid_parameters(): void
    {
        // per_page > 48
        $this->getJson('/api/products?per_page=100')->assertStatus(422);

        // sort không hợp lệ
        $this->getJson('/api/products?sort=invalid')->assertStatus(422);

        // gender không hợp lệ
        $this->getJson('/api/products?gender=alien')->assertStatus(422);

        // max_price < min_price
        $this->getJson('/api/products?min_price=500&max_price=100')->assertStatus(422);

        // color_ids chứa phần tử không phải số nguyên
        $this->getJson('/api/products?color=abc,12')->assertStatus(422);
    }

    public function test_detail_returns_active_product_with_variants_and_images(): void
    {
        $response = $this->getJson('/api/products/ao-blazer-len-cashmere-may-do');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         'id',
                         'name',
                         'slug',
                         'description',
                         'material',
                         'gender',
                         'base_price',
                         'compare_at_price',
                         'is_featured',
                         'in_stock',
                         'published_at',
                         'category',
                         'brand',
                         'images' => [
                             '*' => ['id', 'url', 'alt_text', 'is_main', 'sort_order', 'color_id'],
                         ],
                         'variants' => [
                             '*' => ['id', 'sku', 'stock_quantity', 'is_active', 'color', 'size'],
                         ],
                     ],
                 ]);

        $this->assertTrue($response->json('data.in_stock'));
    }

    public function test_detail_returns_404_for_draft_or_nonexistent_product(): void
    {
        // Slug của sản phẩm draft (prod-012)
        $this->getJson('/api/products/ao-blazer-nu-len-mong')->assertStatus(404);

        // Slug hoàn toàn không tồn tại
        $this->getJson('/api/products/san-pham-khong-ton-tai')->assertStatus(404);
    }

    public function test_in_stock_field_is_false_when_all_variants_out_of_stock(): void
    {
        // Thắt lưng da thật (prod-008) có stock=0 ở tất cả variant
        $detailRes = $this->getJson('/api/products/that-lung-da-that-mat-khoa-kim-loai-duc');
        $detailRes->assertStatus(200);
        $this->assertFalse($detailRes->json('data.in_stock'));

        // Kiểm tra cả trên list
        $listRes = $this->getJson('/api/products?q=Thắt Lưng');
        $listRes->assertStatus(200);
        $belt = collect($listRes->json('data'))->firstWhere('slug', 'that-lung-da-that-mat-khoa-kim-loai-duc');
        $this->assertNotNull($belt);
        $this->assertFalse($belt['in_stock']);
    }

    public function test_search_by_product_name_exact_and_partial(): void
    {
        // 1. Khớp từ khóa đầy đủ (exact word)
        $response = $this->getJson('/api/products?search=blazer');
        $response->assertStatus(200);

        $this->assertGreaterThan(0, $response->json('meta.total'));
        foreach ($response->json('data') as $item) {
            $product = Product::with(['brand', 'category'])->findOrFail($item['id']);
            $matched = str_contains(mb_strtolower($product->name), 'blazer')
                || str_contains(mb_strtolower($product->slug), 'blazer')
                || str_contains(mb_strtolower((string) $product->description), 'blazer')
                || str_contains(mb_strtolower((string) $product->material), 'blazer')
                || ($product->brand && str_contains(mb_strtolower($product->brand->name), 'blazer'))
                || ($product->category && str_contains(mb_strtolower($product->category->name), 'blazer'));

            $this->assertTrue($matched, "Sản phẩm {$product->name} (id: {$product->id}) phải khớp với từ khóa blazer ở ít nhất một cột tìm kiếm");
        }

        // 2. Khớp một phần (partial word: 'blaze' khớp 'blazer')
        $resPartial = $this->getJson('/api/products?search=blaze');
        $resPartial->assertStatus(200);
        $this->assertGreaterThan(0, $resPartial->json('meta.total'));
        $slugsPartial = collect($resPartial->json('data'))->pluck('slug')->all();
        $this->assertContains('ao-blazer-len-cashmere-may-do', $slugsPartial);
    }

    public function test_search_case_insensitive(): void
    {
        $resLower = $this->getJson('/api/products?search=blazer');
        $resUpper = $this->getJson('/api/products?search=BLAZER');

        $resLower->assertStatus(200);
        $resUpper->assertStatus(200);

        $this->assertEquals($resLower->json('meta.total'), $resUpper->json('meta.total'));
    }

    public function test_search_expansion_d_to_dd_finds_dam_and_keeps_real_d(): void
    {
        if (\DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('SQLite không hỗ trợ collation utf8mb4_unicode_ci và không hỗ trợ case-folding/bỏ dấu tiếng Việt (đ/Đ/ầ). Vui lòng chạy trên MySQL qua group mysql trong ProductSearchMysqlTest.');
        }

        // 1. "dam" mở rộng sang "đam" để tìm thấy "Đầm Suông Lụa Tơ Tằm Thượng Hạng"
        $resDam = $this->getJson('/api/products?search=dam');
        $resDam->assertStatus(200);
        $slugs = collect($resDam->json('data'))->pluck('slug')->all();
        $this->assertContains('dam-suong-lua-to-tam-thuong-hang', $slugs);

        // 2. "denim" có chữ 'd' thật vẫn tìm kiếm bình thường không bị lỗi
        $resDenim = $this->getJson('/api/products?search=denim');
        $resDenim->assertStatus(200);

        // 3. Không thay ngược đ -> d
        $resDdam = $this->getJson('/api/products?search=đầm');
        $resDdam->assertStatus(200);
        $slugsDdam = collect($resDdam->json('data'))->pluck('slug')->all();
        $this->assertContains('dam-suong-lua-to-tam-thuong-hang', $slugsDdam);
    }

    public function test_search_multiple_words_all_must_match(): void
    {
        // "ao blazer" -> khớp các sản phẩm chứa cả 2 từ khóa trong các cột
        $response = $this->getJson('/api/products?search=ao+blazer');
        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $response->json('meta.total'));

        // "blazer that-lung" -> 2 từ khóa hoàn toàn không cùng xuất hiện trong bất kỳ sản phẩm nào
        // (blazer chỉ có ở nhóm áo/quần, that-lung chỉ có ở thắt lưng da)
        $resNone = $this->getJson('/api/products?search=blazer+that-lung');
        $resNone->assertStatus(200);
        $this->assertEquals(0, $resNone->json('meta.total'));
    }

    public function test_search_wildcard_characters_escaped(): void
    {
        // Ký tự % và _ không được hoạt động như wildcard
        $resPercent = $this->getJson('/api/products?search=100%');
        $resPercent->assertStatus(200);

        $resUnderscore = $this->getJson('/api/products?search=_');
        $resUnderscore->assertStatus(200);
        // Không bung ra toàn bộ 11 sản phẩm như wildcard '%'
        $this->assertNotEquals(11, $resUnderscore->json('meta.total'));
    }

    public function test_search_matches_brand_category_material(): void
    {
        // 1. Tìm theo tên thương hiệu "Heritage Craft"
        $resBrand = $this->getJson('/api/products?search=Heritage');
        $resBrand->assertStatus(200);
        $this->assertGreaterThan(0, $resBrand->json('meta.total'));
        foreach ($resBrand->json('data') as $item) {
            $this->assertEquals('Heritage Craft', $item['brand']['name']);
        }

        // 2. Tìm theo chất liệu "Cashmere"
        $resMaterial = $this->getJson('/api/products?search=Cashmere');
        $resMaterial->assertStatus(200);
        $this->assertGreaterThan(0, $resMaterial->json('meta.total'));
    }

    public function test_search_combined_with_category_and_price_filters(): void
    {
        $response = $this->getJson('/api/products?search=blazer&category=jackets-blazers&min_price=1000000');
        $response->assertStatus(200);

        foreach ($response->json('data') as $item) {
            $this->assertGreaterThanOrEqual(1000000, $item['base_price']);
            $this->assertEquals('jackets-blazers', $item['category']['slug']);
        }
    }

    public function test_search_does_not_reveal_draft_or_archived_or_deleted_products(): void
    {
        // prod-012 là draft có tên "Áo Blazer Nữ Len Mỏng Dáng Rộng"
        $response = $this->getJson('/api/products?search=Len+M%E1%BB%8Fng');
        $response->assertStatus(200);
        $slugs = collect($response->json('data'))->pluck('slug')->all();
        $this->assertNotContains('ao-blazer-nu-len-mong', $slugs);
    }

    public function test_search_empty_string_returns_all_active_products(): void
    {
        $response = $this->getJson('/api/products?search=');
        $response->assertStatus(200);
        $this->assertEquals(11, $response->json('meta.total'));
    }

    public function test_search_sort_priority_by_name_when_no_custom_sort(): void
    {
        // Tìm "blazer" không sort: sản phẩm có chữ blazer trong tên xếp trước
        $response = $this->getJson('/api/products?search=blazer');
        $response->assertStatus(200);
        $items = $response->json('data');
        if (count($items) >= 2) {
            $first = $items[0];
            $this->assertStringContainsStringIgnoringCase('blazer', $first['name']);
        }

        // Khi có sort riêng (price_asc): sắp xếp theo giá
        $resPrice = $this->getJson('/api/products?search=blazer&sort=price_asc');
        $resPrice->assertStatus(200);
        $priceItems = $resPrice->json('data');
        if (count($priceItems) >= 2) {
            $this->assertLessThanOrEqual($priceItems[1]['base_price'], $priceItems[0]['base_price']);
        }
    }

    public function test_search_validation_fails_over_150_characters(): void
    {
        $longTerm = str_repeat('a', 151);
        $response = $this->getJson("/api/products?search={$longTerm}");
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['search']);
    }
}
