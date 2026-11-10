<?php

namespace Tests\Feature\Api;

use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class ProductSearchMysqlTest extends TestCase
{
    use RefreshDatabase;

    protected $connectionsToTransact = ['mysql_testing'];

    protected function beforeRefreshingDatabase(): void
    {
        config(['database.default' => 'mysql_testing']);
    }

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'mysql_testing']);
        DB::purge('mysql_testing');

        // Bỏ markTestSkipped: FAIL kèm hướng dẫn nếu mất kết nối
        try {
            DB::connection('mysql_testing')->getPdo();
        } catch (\Throwable $e) {
            $this->fail('Không thể kết nối đến MySQL testing database (mode_studio_testing). Hãy đảm bảo container mysql đang chạy và DB đã được tạo bằng lệnh: CREATE DATABASE mode_studio_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; Lỗi: ' . $e->getMessage());
        }

        // Đảm bảo kết nối đúng DB mode_studio_testing, không đụng DB dev hay chạy nhầm sqlite
        $this->assertEquals(
            'mode_studio_testing',
            DB::connection()->getDatabaseName(),
            'Database test phải là mode_studio_testing. Hãy tạo DB bằng lệnh: CREATE DATABASE mode_studio_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
        );

        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,
        ]);
    }

    public function test_mysql_collation_handles_accent_insensitivity_and_d_expansion(): void
    {
        // 1. Tạo 1 sản phẩm active có tên chứa "denim"
        $category = Category::first();
        $brand = Brand::first();
        Product::updateOrCreate(
            ['slug' => 'ao-khoac-denim-co-dien'],
            [
                'name'         => 'Áo Khoác Denim Cổ Điển',
                'gender'       => ProductGender::Unisex,
                'category_id'  => $category->id,
                'brand_id'     => $brand->id,
                'base_price'   => 1200000,
                'status'       => ProductStatus::Active,
                'published_at' => now()->subDay(),
            ]
        );

        // 2. "denim" chữ có 'd' thật tìm thấy đúng sản phẩm cả hoa lẫn thường (denim, Denim, DENIM)
        $resDenimLower = $this->getJson('/api/products?search=denim');
        $resDenimLower->assertStatus(200);
        $slugsLower = collect($resDenimLower->json('data'))->pluck('slug')->all();
        $this->assertContains('ao-khoac-denim-co-dien', $slugsLower);

        $resDenimUpper = $this->getJson('/api/products?search=Denim');
        $resDenimUpper->assertStatus(200);
        $slugsUpper = collect($resDenimUpper->json('data'))->pluck('slug')->all();
        $this->assertContains('ao-khoac-denim-co-dien', $slugsUpper);

        $resDenimAllUpper = $this->getJson('/api/products?search=DENIM');
        $resDenimAllUpper->assertStatus(200);
        $slugsAllUpper = collect($resDenimAllUpper->json('data'))->pluck('slug')->all();
        $this->assertContains('ao-khoac-denim-co-dien', $slugsAllUpper);

        // 3. "dam" (không dấu) mở rộng thành "đam", qua collation utf8mb4_unicode_ci khớp "Đầm Suông..."
        $resDam = $this->getJson('/api/products?search=dam');
        $resDam->assertStatus(200);
        $slugsDam = collect($resDam->json('data'))->pluck('slug')->all();
        $this->assertContains('dam-suong-lua-to-tam-thuong-hang', $slugsDam);

        // 4. "đầm" (có dấu) tìm thấy chính xác sản phẩm có chữ "Đầm" (không phân biệt hoa thường non-ASCII)
        $resDdam = $this->getJson('/api/products?search=đầm');
        $resDdam->assertStatus(200);
        $slugsDdam = collect($resDdam->json('data'))->pluck('slug')->all();
        $this->assertContains('dam-suong-lua-to-tam-thuong-hang', $slugsDdam);

        // 5. "ao" (không dấu) khớp "Áo" (Áo Blazer, Áo Sơ Mi, Áo Khoác Trench Coat, Áo Khoác Denim)
        $resAo = $this->getJson('/api/products?search=ao');
        $resAo->assertStatus(200);
        $this->assertGreaterThanOrEqual(3, $resAo->json('meta.total'));

        // 6. "ao so mi" nhiều từ có dấu/không dấu
        $resAoSoMi = $this->getJson('/api/products?search=ao+so+mi');
        $resAoSoMi->assertStatus(200);
        $slugsAoSoMi = collect($resAoSoMi->json('data'))->pluck('slug')->all();
        $this->assertContains('ao-so-mi-poplin-cotton-ai-cap', $slugsAoSoMi);

        // 7. Escape ký tự % trên MySQL thật
        $resPercent = $this->getJson('/api/products?search=%25');
        $resPercent->assertStatus(200);
        $this->assertNotEquals(12, $resPercent->json('meta.total'));
    }
}
