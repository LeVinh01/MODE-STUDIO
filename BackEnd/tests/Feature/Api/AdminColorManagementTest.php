<?php

namespace Tests\Feature\Api;

use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Color;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Size;
use App\Models\User;
use Database\Seeders\ColorSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminColorManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
        ]);
    }

    protected function createUserWithRole(string $roleName, array $attributes = []): User
    {
        $role = Role::where('name', $roleName)->firstOrFail();

        return User::create(array_merge([
            'full_name' => ucfirst($roleName) . ' User',
            'email'     => $roleName . '_' . uniqid() . '@example.com',
            'phone'     => '090' . rand(1000000, 9999999),
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    protected function createAdmin(array $attributes = []): User
    {
        return $this->createUserWithRole('admin', $attributes);
    }

    protected function createOperator(array $attributes = []): User
    {
        return $this->createUserWithRole('operator', $attributes);
    }

    protected function createCustomer(array $attributes = []): User
    {
        return $this->createUserWithRole('customer', $attributes);
    }

    public function test_admin_and_operator_can_list_colors(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/colors');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'hex_code', 'variants_count', 'images_count', 'created_at', 'updated_at']
                ],
                'meta',
            ]);

        $operator = $this->createOperator();
        Sanctum::actingAs($operator);

        $responseOp = $this->getJson('/api/admin/colors?all=1');
        $responseOp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'hex_code', 'variants_count', 'images_count']
                ]
            ]);
    }

    public function test_customer_cannot_access_admin_colors(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $this->getJson('/api/admin/colors')->assertStatus(403);
        $this->postJson('/api/admin/colors', [
            'name'     => 'Hồng Pastel',
            'hex_code' => '#ffc0cb',
        ])->assertStatus(403);
    }

    public function test_search_colors_by_name(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/colors?search=Tuyệt Đối');
        $response->assertStatus(200);

        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Đen Tuyệt Đối'));
        $this->assertFalse($names->contains('Kem Sữa'));
    }

    public function test_admin_can_create_color_successfully(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $payload = [
            'name'     => 'Xanh Olive',
            'hex_code' => '#708238',
        ];

        $response = $this->postJson('/api/admin/colors', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Xanh Olive')
            ->assertJsonPath('data.hex_code', '#708238');

        $this->assertDatabaseHas('colors', [
            'name'     => 'Xanh Olive',
            'hex_code' => '#708238',
        ]);
    }

    public function test_operator_cannot_create_color(): void
    {
        $operator = $this->createOperator();
        Sanctum::actingAs($operator);

        $response = $this->postJson('/api/admin/colors', [
            'name'     => 'Xanh Mint',
            'hex_code' => '#98ff98',
        ]);

        $response->assertStatus(403);
    }

    public function test_store_validation_rejects_missing_or_invalid_fields(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        // Missing fields
        $response = $this->postJson('/api/admin/colors', []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'hex_code']);

        // Duplicate name
        $responseDup = $this->postJson('/api/admin/colors', [
            'name'     => 'Đen Tuyệt Đối',
            'hex_code' => '#998877',
        ]);
        $responseDup->assertStatus(422)
            ->assertJsonValidationErrors(['name'])
            ->assertJsonPath('errors.name.0', 'Tên màu sắc này đã tồn tại trong hệ thống.');

        // Duplicate hex code (case-insensitive check against existing #111111)
        $responseDupHex = $this->postJson('/api/admin/colors', [
            'name'     => 'Màu Đen Mới',
            'hex_code' => '#111111',
        ]);
        $responseDupHex->assertStatus(422)
            ->assertJsonValidationErrors(['hex_code'])
            ->assertJsonPath('errors.hex_code.0', 'Mã màu Hex này đã tồn tại trong hệ thống.');

        // Duplicate hex code uppercase check against existing #ffffff
        $responseDupHexUpper = $this->postJson('/api/admin/colors', [
            'name'     => 'Màu Trắng Mới',
            'hex_code' => '#FFFFFF',
        ]);
        $responseDupHexUpper->assertStatus(422)
            ->assertJsonValidationErrors(['hex_code'])
            ->assertJsonPath('errors.hex_code.0', 'Mã màu Hex này đã tồn tại trong hệ thống.');

        // Invalid hex code formats
        $invalidHexes = ['111111', '#12', '#12345', '#1234567', 'blue', '#GGG000'];
        foreach ($invalidHexes as $hex) {
            $resp = $this->postJson('/api/admin/colors', [
                'name'     => 'Màu Thử ' . uniqid(),
                'hex_code' => $hex,
            ]);
            $resp->assertStatus(422)
                ->assertJsonValidationErrors(['hex_code']);
        }
    }

    public function test_admin_can_update_color(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $color = Color::create([
            'name'     => 'Xanh Navy Cũ',
            'hex_code' => '#000080',
        ]);

        $response = $this->putJson("/api/admin/colors/{$color->id}", [
            'name'     => 'Xanh Navy Mới',
            'hex_code' => '#000088',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Xanh Navy Mới')
            ->assertJsonPath('data.hex_code', '#000088');

        $this->assertDatabaseHas('colors', [
            'id'       => $color->id,
            'name'     => 'Xanh Navy Mới',
            'hex_code' => '#000088',
        ]);
    }

    public function test_update_validates_unique_name_and_hex_ignoring_self(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $color1 = Color::create(['name' => 'Màu A1', 'hex_code' => '#112233']);
        $color2 = Color::create(['name' => 'Màu B2', 'hex_code' => '#223344']);

        // Keeping own name and hex should pass (even with uppercase hex)
        $this->putJson("/api/admin/colors/{$color1->id}", [
            'name'     => 'Màu A1',
            'hex_code' => '#112233',
        ])->assertStatus(200);

        $this->putJson("/api/admin/colors/{$color1->id}", [
            'hex_code' => '#112233',
        ])->assertStatus(200);

        // Renaming to color2's name should fail with 422
        $this->putJson("/api/admin/colors/{$color1->id}", [
            'name' => 'Màu B2',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['name'])
          ->assertJsonPath('errors.name.0', 'Tên màu sắc này đã tồn tại trong hệ thống.');

        // Changing hex to color2's hex should fail with 422
        $this->putJson("/api/admin/colors/{$color1->id}", [
            'hex_code' => '#223344',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['hex_code'])
          ->assertJsonPath('errors.hex_code.0', 'Mã màu Hex này đã tồn tại trong hệ thống.');

        // Changing hex to color2's hex in uppercase should also fail with 422
        $this->putJson("/api/admin/colors/{$color1->id}", [
            'hex_code' => '#223344',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['hex_code'])
          ->assertJsonPath('errors.hex_code.0', 'Mã màu Hex này đã tồn tại trong hệ thống.');
    }

    public function test_seeder_adds_expected_extra_colors_and_skips_duplicates(): void
    {
        // 13 màu gốc + 7 màu mới hợp lệ = 20 màu (màu 'Đen' #111111 bị bỏ qua vì #111111 đã có)
        $this->assertDatabaseCount('colors', 20);

        $this->assertDatabaseHas('colors', [
            'name'     => 'Nâu Chocolate',
            'hex_code' => '#5c3a2e',
        ]);

        $this->assertDatabaseHas('colors', [
            'name'     => 'Xanh Navy',
            'hex_code' => '#1f2a44',
        ]);

        $this->assertDatabaseHas('colors', [
            'name'     => 'Xanh Rêu',
            'hex_code' => '#4b5240',
        ]);

        $this->assertDatabaseHas('colors', [
            'name'     => 'Be',
            'hex_code' => '#d2b48c',
        ]);

        // Màu 'Đen Tuyệt Đối' #111111 giữ nguyên, không có màu 'Đen' trùng #111111
        $this->assertDatabaseHas('colors', [
            'name'     => 'Đen Tuyệt Đối',
            'hex_code' => '#111111',
        ]);
        $this->assertDatabaseMissing('colors', [
            'name' => 'Đen',
        ]);
    }

    public function test_admin_can_delete_unused_color(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $color = Color::create([
            'name'     => 'Màu Tạm',
            'hex_code' => '#abcdef',
        ]);

        $response = $this->deleteJson("/api/admin/colors/{$color->id}");
        $response->assertStatus(200)
            ->assertJsonPath('message', 'Đã xóa màu sắc thành công.');

        $this->assertDatabaseMissing('colors', ['id' => $color->id]);
    }

    public function test_admin_cannot_delete_color_in_use_by_variant(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::create(['name' => 'Áo Test', 'slug' => 'ao-test-' . uniqid()]);
        $brand = Brand::create(['name' => 'Brand Test', 'slug' => 'brand-test-' . uniqid()]);
        $color = Color::create(['name' => 'Màu Đang Dùng Variant', 'hex_code' => '#123456']);
        $size = Size::firstOrFail();

        $product = Product::create([
            'name'        => 'Sản phẩm Test',
            'slug'        => 'san-pham-test-' . uniqid(),
            'gender'      => ProductGender::Unisex,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 500000,
            'status'      => ProductStatus::Active,
        ]);

        ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'TEST-SKU-' . uniqid(),
            'stock_quantity' => 10,
            'is_active'      => true,
        ]);

        $response = $this->deleteJson("/api/admin/colors/{$color->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Không thể xóa màu sắc đang được sử dụng bởi biến thể hoặc hình ảnh sản phẩm.');

        $this->assertDatabaseHas('colors', ['id' => $color->id]);
    }

    public function test_admin_cannot_delete_color_in_use_by_product_image(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::create(['name' => 'Váy Test', 'slug' => 'vay-test-' . uniqid()]);
        $brand = Brand::create(['name' => 'Brand Test 2', 'slug' => 'brand-test-2-' . uniqid()]);
        $color = Color::create(['name' => 'Màu Đang Dùng Image', 'hex_code' => '#654321']);

        $product = Product::create([
            'name'        => 'Váy Dạ Hội Test',
            'slug'        => 'vay-da-hoi-test-' . uniqid(),
            'gender'      => ProductGender::Women,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 850000,
            'status'      => ProductStatus::Active,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'color_id'   => $color->id,
            'image_url'  => 'https://example.com/images/test.jpg',
            'is_main'    => false,
            'sort_order' => 1,
        ]);

        $response = $this->deleteJson("/api/admin/colors/{$color->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Không thể xóa màu sắc đang được sử dụng bởi biến thể hoặc hình ảnh sản phẩm.');

        $this->assertDatabaseHas('colors', ['id' => $color->id]);
    }
}
