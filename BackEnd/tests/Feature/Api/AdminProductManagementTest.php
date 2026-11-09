<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\Brand;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Color;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Size;
use App\Models\StockAdjustment;
use App\Models\User;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,
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

    // ==========================================
    // 1. Phân quyền (RBAC) Tests
    // ==========================================

    public function test_unauthenticated_request_to_admin_catalog_returns_401(): void
    {
        $this->getJson('/api/admin/products')->assertStatus(401);
        $this->postJson('/api/admin/products', [])->assertStatus(401);
        $this->getJson('/api/admin/lookups')->assertStatus(401);
        $this->getJson('/api/admin/stock/low')->assertStatus(401);
    }

    public function test_customer_accessing_admin_catalog_returns_403(): void
    {
        Sanctum::actingAs($this->createCustomer());

        $this->getJson('/api/admin/products')->assertStatus(403);
        $this->postJson('/api/admin/products', [])->assertStatus(403);
        $this->getJson('/api/admin/lookups')->assertStatus(403);
    }

    public function test_locked_admin_or_operator_returns_403(): void
    {
        $lockedAdmin = $this->createAdmin(['status' => UserStatus::Locked]);
        Sanctum::actingAs($lockedAdmin);

        $this->getJson('/api/admin/products')->assertStatus(403);

        $lockedOperator = $this->createOperator(['status' => UserStatus::Locked]);
        Sanctum::actingAs($lockedOperator);

        $this->getJson('/api/admin/products')->assertStatus(403);
    }

    public function test_operator_can_read_but_cannot_write(): void
    {
        $operator = $this->createOperator();
        Sanctum::actingAs($operator);

        // Read endpoints -> 200
        $this->getJson('/api/admin/products')->assertStatus(200);
        $product = Product::first();
        $this->getJson("/api/admin/products/{$product->id}")->assertStatus(200);
        $this->getJson('/api/admin/lookups')->assertStatus(200);
        $this->getJson('/api/admin/stock/low')->assertStatus(200);

        // Write endpoints -> 403
        $this->postJson('/api/admin/products', ['name' => 'Test'])->assertStatus(403);
        $this->putJson("/api/admin/products/{$product->id}", ['name' => 'Test'])->assertStatus(403);
        $this->deleteJson("/api/admin/products/{$product->id}")->assertStatus(403);

        $variant = ProductVariant::first();
        $this->postJson("/api/admin/products/{$product->id}/variants", [])->assertStatus(403);
        $this->putJson("/api/admin/variants/{$variant->id}", [])->assertStatus(403);
        $this->deleteJson("/api/admin/variants/{$variant->id}")->assertStatus(403);
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [])->assertStatus(403);
    }

    // ==========================================
    // 2. Product CRUD & Invariants Tests
    // ==========================================

    public function test_admin_can_create_product_as_draft(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();

        $response = $this->postJson('/api/admin/products', [
            'name'             => 'Áo Polo Thể Thao Nam Cao Cấp',
            'slug'             => 'ao-polo-the-thao-nam-cao-cap',
            'description'      => 'Chất liệu thun gai cá sấu thoáng khí.',
            'material'         => '100% Cotton',
            'gender'           => 'men',
            'category_id'      => $category->id,
            'brand_id'         => $brand->id,
            'base_price'       => 350000,
            'compare_at_price' => 450000,
            'status'           => 'draft',
            'is_featured'      => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Áo Polo Thể Thao Nam Cao Cấp')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.base_price', 350000)
            ->assertJsonPath('data.compare_at_price', 450000);

        $this->assertDatabaseHas('products', [
            'slug'   => 'ao-polo-the-thao-nam-cao-cap',
            'status' => 'draft',
        ]);
    }

    public function test_admin_cannot_create_product_with_active_status_directly(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();

        $response = $this->postJson('/api/admin/products', [
            'name'        => 'Áo Polo Hoạt Động',
            'gender'      => 'men',
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 300000,
            'status'      => 'active',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_admin_product_validation_errors(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();

        // compare_at_price < base_price
        $this->postJson('/api/admin/products', [
            'name'             => 'Áo Lỗi Giá',
            'gender'           => 'women',
            'category_id'      => $category->id,
            'brand_id'         => $brand->id,
            'base_price'       => 500000,
            'compare_at_price' => 400000,
        ])->assertStatus(422)->assertJsonValidationErrors(['compare_at_price']);

        // non-existent category
        $this->postJson('/api/admin/products', [
            'name'        => 'Áo Lỗi DM',
            'gender'      => 'women',
            'category_id' => 999999,
            'brand_id'    => $brand->id,
            'base_price'  => 500000,
        ])->assertStatus(422)->assertJsonValidationErrors(['category_id']);

        // gender required message
        $genderRes = $this->postJson('/api/admin/products', [
            'name'        => 'Áo Thiếu Giới Tính',
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 500000,
        ]);
        $genderRes->assertStatus(422)
            ->assertJsonPath('errors.gender.0', 'Vui lòng chọn giới tính.');

        // slug unique message (Store)
        $existingProduct = Product::first();
        $slugRes = $this->postJson('/api/admin/products', [
            'name'        => 'Áo Trùng Slug',
            'slug'        => $existingProduct->slug,
            'gender'      => 'women',
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 500000,
        ]);
        $slugRes->assertStatus(422)
            ->assertJsonPath('errors.slug.0', 'Slug đã tồn tại, vui lòng chọn slug khác.');

        // slug unique message (Update)
        $anotherProduct = Product::where('id', '!=', $existingProduct->id)->first();
        $slugUpdateRes = $this->patchJson("/api/admin/products/{$anotherProduct->id}", [
            'slug' => $existingProduct->slug,
        ]);
        $slugUpdateRes->assertStatus(422)
            ->assertJsonPath('errors.slug.0', 'Slug đã tồn tại, vui lòng chọn slug khác.');
    }

    public function test_admin_cannot_activate_product_without_sellable_variant_or_image(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();

        $product = Product::create([
            'name'        => 'Sản phẩm thử nghiệm kích hoạt',
            'slug'        => 'san-pham-thu-nghiem-kich-hoat',
            'gender'      => ProductGender::Unisex,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 200000,
            'status'      => ProductStatus::Draft,
        ]);

        // Không có biến thể và không có ảnh -> 422
        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'active',
        ])->assertStatus(422);

        // Có ảnh nhưng chưa có biến thể -> 422
        ProductImage::create([
            'product_id' => $product->id,
            'image_url'  => 'https://example.com/test.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'active',
        ])->assertStatus(422);

        // Thêm biến thể nhưng is_active = false -> 422
        $color = Color::first();
        $size = Size::first();
        $variant = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'TEST-ACTIVATE-INACTIVE',
            'stock_quantity' => 10,
            'is_active'      => false,
        ]);

        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'active',
        ])->assertStatus(422);

        // Bật is_active = true -> thành công kích hoạt (200)
        $variant->update(['is_active' => true]);

        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'active',
        ])->assertStatus(200)
          ->assertJsonPath('data.status', 'active');
    }

    public function test_admin_can_soft_delete_product_and_public_api_hides_it(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::where('status', ProductStatus::Active)->first();
        $slug = $product->slug;

        // Public API sees it initially
        $this->getJson("/api/products/{$slug}")->assertStatus(200);

        // Admin soft deletes product
        $this->deleteJson("/api/admin/products/{$product->id}")->assertStatus(200);

        $this->assertSoftDeleted('products', ['id' => $product->id]);

        // Public API now returns 404
        $this->getJson("/api/products/{$slug}")->assertStatus(404);
    }

    public function test_activating_product_sets_published_at_and_makes_it_visible_in_public_api(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();
        $color = Color::first();
        $size = Size::first();

        // 1. Tạo sản phẩm draft (published_at null)
        $product = Product::create([
            'name'         => 'Sản phẩm thử nghiệm xuất bản',
            'slug'         => 'sp-thu-nghiem-xuat-ban',
            'gender'       => ProductGender::Unisex,
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 150000,
            'status'       => ProductStatus::Draft,
            'published_at' => null,
        ]);

        // Thêm 1 ảnh + 1 biến thể
        ProductImage::create([
            'product_id' => $product->id,
            'image_url'  => 'https://example.com/pub.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'PUB-VAR-1',
            'stock_quantity' => 20,
            'is_active'      => true,
        ]);

        // Trước khi active: công khai trả 404
        $this->getJson("/api/products/{$product->slug}")->assertStatus(404);

        // 2. PATCH status=active
        $response = $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'active',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'active');

        // published_at tự động được đặt khác null
        $freshProduct = $product->fresh();
        $this->assertNotNull($freshProduct->published_at);

        // 3. GET công khai theo slug trả 200
        $publicShow = $this->getJson("/api/products/{$product->slug}");
        $publicShow->assertStatus(200)
            ->assertJsonPath('data.slug', $product->slug)
            ->assertJsonPath('data.in_stock', true);

        // 4. Có mặt trong danh sách GET /api/products
        $publicList = $this->getJson('/api/products?q=thử nghiệm xuất bản');
        $publicList->assertStatus(200);
        $this->assertTrue(collect($publicList->json('data'))->contains('slug', $product->slug));
    }

    public function test_draft_and_archived_products_return_404_in_public_api_and_preserve_published_at(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::where('status', ProductStatus::Active)->whereNotNull('published_at')->first();
        $originalPublishedAt = $product->published_at->toISOString();
        $slug = $product->slug;

        // Chuyển sang draft
        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'draft',
        ])->assertStatus(200);

        // Công khai trả về 404
        $this->getJson("/api/products/{$slug}")->assertStatus(404);
        // published_at vẫn được giữ nguyên
        $this->assertEquals($originalPublishedAt, $product->fresh()->published_at?->toISOString());

        // Chuyển sang archived
        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'archived',
        ])->assertStatus(200);

        // Công khai vẫn trả 404
        $this->getJson("/api/products/{$slug}")->assertStatus(404);
        // published_at vẫn được giữ nguyên
        $this->assertEquals($originalPublishedAt, $product->fresh()->published_at?->toISOString());
    }

    public function test_reactivating_product_does_not_overwrite_existing_published_at(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::where('status', ProductStatus::Active)->first();
        $pastDate = now()->subDays(10)->startOfMinute();
        $product->update([
            'published_at' => $pastDate,
            'status'       => ProductStatus::Draft,
        ]);

        // Kích hoạt lại sang active (không truyền published_at)
        $this->patchJson("/api/admin/products/{$product->id}", [
            'status' => 'active',
        ])->assertStatus(200);

        $fresh = $product->fresh();
        $this->assertEquals('active', $fresh->status->value);
        $this->assertEquals($pastDate->toDateTimeString(), $fresh->published_at->toDateTimeString());
    }

    public function test_soft_deleted_or_inactive_variants_do_not_appear_in_public_detail(): void
    {
        $product = Product::where('status', ProductStatus::Active)->whereNotNull('published_at')->first();
        $colors = Color::take(3)->get();
        $size = Size::first();

        // Biến thể 1: Đang bán (is_active = true)
        $vActive = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[0]->id,
            'size_id'        => $size->id,
            'sku'            => 'TEST-VAR-ACT-' . uniqid(),
            'stock_quantity' => 10,
            'is_active'      => true,
        ]);

        // Biến thể 2: Tạm ngừng bán (is_active = false)
        $vInactive = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[1]->id,
            'size_id'        => $size->id,
            'sku'            => 'TEST-VAR-INACT-' . uniqid(),
            'stock_quantity' => 10,
            'is_active'      => false,
        ]);

        // Biến thể 3: Đã xóa mềm (SoftDeletes)
        $vTrashed = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[2]->id,
            'size_id'        => $size->id,
            'sku'            => 'TEST-VAR-TRASH-' . uniqid(),
            'stock_quantity' => 10,
            'is_active'      => true,
        ]);
        $vTrashed->delete();

        $response = $this->getJson("/api/products/{$product->slug}");
        $response->assertStatus(200);

        $variants = collect($response->json('data.variants'));
        $this->assertTrue($variants->contains('id', $vActive->id));
        $this->assertFalse($variants->contains('id', $vInactive->id));
        $this->assertFalse($variants->contains('id', $vTrashed->id));
    }

    public function test_admin_products_index_filters_and_escapes_search(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();

        // Tạo sản phẩm có chứa ký tự đặc biệt % và _
        $p1 = Product::create([
            'name'        => 'Áo 100%_Cotton Đặc Biệt',
            'slug'        => 'ao-100-cotton-dac-biet',
            'gender'      => ProductGender::Men,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 300000,
            'status'      => ProductStatus::Draft,
        ]);

        $p2 = Product::create([
            'name'        => 'Áo 1000 Cotton Bình Thường',
            'slug'        => 'ao-1000-cotton-binh-thuong',
            'gender'      => ProductGender::Men,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 300000,
            'status'      => ProductStatus::Draft,
        ]);

        $response = $this->getJson('/api/admin/products?search=100%25_');
        $response->assertStatus(200);

        $items = collect($response->json('data'));
        $this->assertTrue($items->contains('id', $p1->id));
        $this->assertFalse($items->contains('id', $p2->id));
    }

    public function test_total_stock_in_product_list_only_counts_non_trashed_variants(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();
        $colors = Color::take(2)->get();
        $size = Size::first();

        $product = Product::create([
            'name'        => 'Sản phẩm đếm tồn',
            'slug'        => 'san-pham-dem-ton',
            'gender'      => ProductGender::Men,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 200000,
            'status'      => ProductStatus::Draft,
        ]);

        $v1 = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[0]->id,
            'size_id'        => $size->id,
            'sku'            => 'STOCK-V1',
            'stock_quantity' => 25,
            'is_active'      => true,
        ]);

        $v2 = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[1]->id,
            'size_id'        => $size->id,
            'sku'            => 'STOCK-V2',
            'stock_quantity' => 15,
            'is_active'      => true,
        ]);

        // Xóa mềm v2
        $v2->delete();

        $response = $this->getJson("/api/admin/products?search=san-pham-dem-ton");
        $response->assertStatus(200);

        $found = collect($response->json('data'))->firstWhere('id', $product->id);
        $this->assertNotNull($found);
        $this->assertEquals(25, $found['total_stock']);
        $this->assertEquals(1, $found['variants_count']);
    }

    // ==========================================
    // 3. Variant Management, Restore & Invariant Tests
    // ==========================================

    public function test_admin_cannot_add_duplicate_color_size_to_same_product(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::where('status', ProductStatus::Active)->first();
        $existingVariant = $product->variants()->first();

        $response = $this->postJson("/api/admin/products/{$product->id}/variants", [
            'color_id'       => $existingVariant->color_id,
            'size_id'        => $existingVariant->size_id,
            'stock_quantity' => 10,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['color_id']);
    }

    public function test_adding_variant_with_color_size_of_soft_deleted_variant_restores_it(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::where('status', ProductStatus::Active)->first();
        $variant = $product->variants()->first();
        $oldSku = $variant->sku;
        $colorId = $variant->color_id;
        $sizeId = $variant->size_id;

        // Đảm bảo sản phẩm có > 1 biến thể trước khi xóa mềm biến thể này
        if ($product->variants()->count() <= 1) {
            $otherColor = Color::where('id', '!=', $colorId)->first();
            ProductVariant::create([
                'product_id'     => $product->id,
                'color_id'       => $otherColor->id,
                'size_id'        => $sizeId,
                'sku'            => 'EXTRA-VAR-' . uniqid(),
                'stock_quantity' => 50,
                'is_active'      => true,
            ]);
        }

        // Xóa mềm biến thể ban đầu
        $variant->delete();
        $this->assertSoftDeleted('product_variants', ['id' => $variant->id]);

        // Thêm lại biến thể với cặp (color_id, size_id) cũ
        $response = $this->postJson("/api/admin/products/{$product->id}/variants", [
            'color_id'       => $colorId,
            'size_id'        => $sizeId,
            'stock_quantity' => 77,
            'is_active'      => true,
            'note'           => 'Khôi phục lại bán tiếp',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $variant->id)
            ->assertJsonPath('data.sku', $oldSku)
            ->assertJsonPath('data.stock_quantity', 77)
            ->assertJsonPath('data.note', 'Khôi phục lại bán tiếp');

        $this->assertNotSoftDeleted('product_variants', ['id' => $variant->id]);
    }

    public function test_cannot_delete_or_deactivate_last_sellable_variant_of_active_product(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();
        $color = Color::first();
        $size = Size::first();

        $product = Product::create([
            'name'        => 'Sản phẩm chỉ có 1 biến thể active',
            'slug'        => 'sp-1-bien-the-active',
            'gender'      => ProductGender::Unisex,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 100000,
            'status'      => ProductStatus::Active,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url'  => 'https://example.com/single.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        $variant = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'SINGLE-ACTIVE-VAR',
            'stock_quantity' => 10,
            'is_active'      => true,
        ]);

        // Tắt is_active biến thể duy nhất -> 422
        $this->patchJson("/api/admin/variants/{$variant->id}", [
            'is_active' => false,
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Không thể tắt biến thể đang bán cuối cùng của sản phẩm đang hoạt động. Vui lòng chuyển trạng thái sản phẩm sang bản nháp hoặc lưu trữ trước.');

        // Xóa biến thể duy nhất -> 422
        $this->deleteJson("/api/admin/variants/{$variant->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Không thể xóa biến thể đang bán cuối cùng của sản phẩm đang hoạt động. Vui lòng chuyển trạng thái sản phẩm sang bản nháp hoặc lưu trữ trước.');

        // Nhưng nếu chuyển sản phẩm sang draft trước thì cho phép xóa
        $product->update(['status' => ProductStatus::Draft]);

        $this->deleteJson("/api/admin/variants/{$variant->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('product_variants', ['id' => $variant->id]);
    }

    // ==========================================
    // 4. Cart, Checkout & Orders with Soft-Deleted Variants
    // ==========================================

    public function test_cart_marks_soft_deleted_variant_as_unpurchasable(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $variant = ProductVariant::where('stock_quantity', '>=', 5)->first();

        // Thêm vào giỏ hàng
        $this->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ])->assertStatus(201);

        // Biến thể bị xóa mềm
        $variant->delete();

        // Xem lại giỏ hàng
        $response = $this->getJson('/api/cart');
        $response->assertStatus(200);

        $item = collect($response->json('items'))->firstWhere('variant.id', $variant->id);
        $this->assertNotNull($item);
        $this->assertFalse($item['is_purchasable']);
        $this->assertEquals('Sản phẩm đã ngừng kinh doanh', $item['unpurchasable_reason']);
    }

    public function test_checkout_with_soft_deleted_variant_in_cart_returns_422_insufficient_items(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $variant = ProductVariant::where('stock_quantity', '>=', 5)->first();

        // Thêm vào giỏ hàng
        $this->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ])->assertStatus(201);

        // Biến thể bị xóa mềm
        $variant->delete();

        // Đặt hàng
        $response = $this->postJson('/api/orders', [
            'payment_method'    => 'cod',
            'recipient_name'    => 'Nguyễn Văn A',
            'recipient_phone'   => '0901234567',
            'shipping_address'  => '123 Đường ABC, Quận 1, TP.HCM',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('insufficient_items.0.variant_id', $variant->id);
    }

    public function test_customer_order_cancel_restores_stock_for_soft_deleted_variant(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $variant = ProductVariant::where('stock_quantity', '>=', 10)->first();
        $product = $variant->product;

        // Đặt hàng 2 chiếc
        $order = Order::create([
            'order_code'        => 'ORD-CANCEL-TEST-' . uniqid(),
            'user_id'           => $customer->id,
            'status'            => OrderStatus::Pending,
            'payment_status'    => \App\Enums\PaymentStatus::Unpaid,
            'payment_method'    => PaymentMethod::Cod,
            'recipient_name'    => 'Nguyễn Văn B',
            'recipient_phone'   => '0901234567',
            'shipping_address'  => '456 Đường DEF, Hà Nội',
            'subtotal'          => 200000,
            'shipping_fee'      => 30000,
            'total_amount'      => 230000,
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'color_name'   => $variant->color->name,
            'size_name'    => $variant->size->name,
            'sku'          => $variant->sku,
            'unit_price'   => 100000,
            'quantity'     => 2,
            'line_total'   => 200000,
        ]);

        $initialStock = $variant->stock_quantity;

        // Biến thể bị xóa mềm trước khi khách hủy đơn
        $variant->delete();
        $this->assertSoftDeleted('product_variants', ['id' => $variant->id]);

        // Khách hủy đơn
        $response = $this->postJson("/api/orders/{$order->order_code}/cancel", [
            'cancel_reason' => 'Đổi ý không mua nữa',
        ]);

        $response->assertStatus(200);

        // Tồn kho vẫn được cộng lại chính xác
        $freshVariant = ProductVariant::withTrashed()->find($variant->id);
        $this->assertEquals($initialStock + 2, $freshVariant->stock_quantity);
    }

    public function test_admin_order_cancel_restores_stock_for_soft_deleted_variant(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $variant = ProductVariant::where('stock_quantity', '>=', 10)->first();
        $product = $variant->product;

        $order = Order::create([
            'order_code'        => 'ORD-ADMIN-CANCEL-' . uniqid(),
            'user_id'           => $customer->id,
            'status'            => OrderStatus::Pending,
            'payment_status'    => \App\Enums\PaymentStatus::Unpaid,
            'payment_method'    => PaymentMethod::Cod,
            'recipient_name'    => 'Nguyễn Văn C',
            'recipient_phone'   => '0901234567',
            'shipping_address'  => '789 Đường GHI, Đà Nẵng',
            'subtotal'          => 150000,
            'shipping_fee'      => 30000,
            'total_amount'      => 180000,
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'color_name'   => $variant->color->name,
            'size_name'    => $variant->size->name,
            'sku'          => $variant->sku,
            'unit_price'   => 150000,
            'quantity'     => 3,
            'line_total'   => 450000,
        ]);

        $initialStock = $variant->stock_quantity;

        // Biến thể bị xóa mềm
        $variant->delete();

        // Admin hủy đơn
        Sanctum::actingAs($admin);
        $response = $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'cancelled',
            'reason' => 'Hết vải sản xuất',
        ]);

        $response->assertStatus(200);

        $freshVariant = ProductVariant::withTrashed()->find($variant->id);
        $this->assertEquals($initialStock + 3, $freshVariant->stock_quantity);
    }

    public function test_guest_cart_merge_skips_soft_deleted_variant(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $variant = ProductVariant::where('stock_quantity', '>=', 5)->first();
        $variant->delete();

        $response = $this->postJson('/api/cart/merge', [
            'merge_token' => (string) \Illuminate\Support\Str::uuid(),
            'items'       => [
                [
                    'variant_id' => $variant->id,
                    'quantity'   => 1,
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('skipped.0.variant_id', $variant->id)
            ->assertJsonPath('skipped.0.reason', 'Biến thể sản phẩm đã ngừng kinh doanh.');
    }

    // ==========================================
    // 5. Product Image Management & Invariants Tests
    // ==========================================

    public function test_admin_can_upload_image_and_first_image_is_main(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();

        $product = Product::create([
            'name'        => 'Sản phẩm thử ảnh',
            'slug'        => 'sp-thu-anh',
            'gender'      => ProductGender::Women,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 120000,
            'status'      => ProductStatus::Draft,
        ]);

        $file = UploadedFile::fake()->image('polo.jpg', 600, 600);

        $response = $this->postJson("/api/admin/products/{$product->id}/images", [
            'image'    => $file,
            'alt_text' => 'Ảnh mặt trước',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.is_main', true)
            ->assertJsonPath('data.alt_text', 'Ảnh mặt trước');

        $imageUrl = $response->json('data.image_url');
        $this->assertStringContainsString('/storage/products/', $imageUrl);
    }

    public function test_uploading_svg_is_rejected(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::first();
        $file = UploadedFile::fake()->create('malicious.svg', 10, 'image/svg+xml');

        $response = $this->postJson("/api/admin/products/{$product->id}/images", [
            'image' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_main_image_is_scoped_by_color(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::first();
        $colors = Color::take(2)->get();
        $colorRed = $colors[0]->id;
        $colorBlue = $colors[1]->id;

        // Upload ảnh chung 1 (color_id = null) -> is_main = true
        $imgGeneral1 = ProductImage::create([
            'product_id' => $product->id,
            'color_id'   => null,
            'image_url'  => 'https://example.com/gen1.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        // Upload ảnh màu Đỏ 1 -> is_main = true
        $imgRed1 = ProductImage::create([
            'product_id' => $product->id,
            'color_id'   => $colorRed,
            'image_url'  => 'https://example.com/red1.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        // Upload ảnh màu Xanh 1 -> is_main = true
        $imgBlue1 = ProductImage::create([
            'product_id' => $product->id,
            'color_id'   => $colorBlue,
            'image_url'  => 'https://example.com/blue1.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        // Đặt ảnh mới cho màu Đỏ làm is_main
        $imgRed2 = ProductImage::create([
            'product_id' => $product->id,
            'color_id'   => $colorRed,
            'image_url'  => 'https://example.com/red2.jpg',
            'is_main'    => false,
            'sort_order' => 2,
        ]);

        $this->patchJson("/api/admin/products/{$product->id}/images/{$imgRed2->id}", [
            'is_main' => true,
        ])->assertStatus(200);

        // Kiểm tra:
        // imgRed2 thành true, imgRed1 thành false
        $this->assertTrue((bool) $imgRed2->fresh()->is_main);
        $this->assertFalse((bool) $imgRed1->fresh()->is_main);

        // Nhưng ảnh chung và ảnh màu Xanh không bị ảnh hưởng!
        $this->assertTrue((bool) $imgGeneral1->fresh()->is_main);
        $this->assertTrue((bool) $imgBlue1->fresh()->is_main);
    }

    public function test_cannot_delete_last_image_of_active_product(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();
        $color = Color::first();
        $size = Size::first();

        $product = Product::create([
            'name'        => 'Sản phẩm chỉ có 1 ảnh',
            'slug'        => 'sp-1-anh',
            'gender'      => ProductGender::Unisex,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 100000,
            'status'      => ProductStatus::Active,
        ]);

        ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'IMG-ACTIVE-VAR',
            'stock_quantity' => 10,
            'is_active'      => true,
        ]);

        $image = ProductImage::create([
            'product_id' => $product->id,
            'image_url'  => 'https://example.com/only.jpg',
            'is_main'    => true,
            'sort_order' => 1,
        ]);

        // Xóa ảnh duy nhất của sản phẩm active -> 422
        $this->deleteJson("/api/admin/products/{$product->id}/images/{$image->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Không thể xóa hình ảnh cuối cùng của sản phẩm đang hoạt động. Vui lòng chuyển trạng thái sản phẩm sang bản nháp hoặc lưu trữ trước.');
    }

    public function test_delete_seed_image_does_not_fail_storage_delete(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $product = Product::where('status', ProductStatus::Draft)->first();

        // Tạo 2 ảnh để có thể xóa
        $imgSeed = ProductImage::create([
            'product_id' => $product->id,
            'image_url'  => 'https://placehold.co/600x600?text=SeedImage',
            'is_main'    => false,
            'sort_order' => 2,
        ]);

        $response = $this->deleteJson("/api/admin/products/{$product->id}/images/{$imgSeed->id}");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('product_images', ['id' => $imgSeed->id]);
    }

    // ==========================================
    // 6. Stock Adjustments & Low Stock Tests
    // ==========================================

    public function test_admin_can_adjust_stock_set_increment_decrement(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $variant = ProductVariant::first();
        $variant->update(['stock_quantity' => 20]);

        // 1. Set tồn kho về 50
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [
            'type'     => 'set',
            'quantity' => 50,
            'reason'   => 'Kiểm kê định kỳ tháng 11',
        ])->assertStatus(200)
          ->assertJsonPath('data.quantity_before', 20)
          ->assertJsonPath('data.delta', 30)
          ->assertJsonPath('data.quantity_after', 50)
          ->assertJsonPath('data.changed_by.id', $admin->id);

        $this->assertEquals(50, $variant->fresh()->stock_quantity);

        // 2. Increment thêm 10
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [
            'type'     => 'increment',
            'quantity' => 10,
            'reason'   => 'Nhập thêm từ xưởng may',
        ])->assertStatus(200)
          ->assertJsonPath('data.quantity_before', 50)
          ->assertJsonPath('data.delta', 10)
          ->assertJsonPath('data.quantity_after', 60);

        $this->assertEquals(60, $variant->fresh()->stock_quantity);

        // 3. Decrement bớt 15
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [
            'type'     => 'decrement',
            'quantity' => 15,
            'reason'   => 'Xuất hàng mẫu cho showroom',
        ])->assertStatus(200)
          ->assertJsonPath('data.quantity_before', 60)
          ->assertJsonPath('data.delta', -15)
          ->assertJsonPath('data.quantity_after', 45);

        $this->assertEquals(45, $variant->fresh()->stock_quantity);

        // 4. Decrement vượt quá tồn hiện tại -> 422
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [
            'type'     => 'decrement',
            'quantity' => 100,
            'reason'   => 'Xuất quá tay',
        ])->assertStatus(422);

        $this->assertEquals(45, $variant->fresh()->stock_quantity);
    }

    public function test_stock_adjustments_history_endpoint(): void
    {
        $admin = $this->createAdmin();
        $operator = $this->createOperator();

        $variant = ProductVariant::first();

        // Admin tạo 2 điều chỉnh
        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [
            'type'     => 'set',
            'quantity' => 30,
            'reason'   => 'Lý do 1',
        ]);
        $this->postJson("/api/admin/variants/{$variant->id}/stock", [
            'type'     => 'increment',
            'quantity' => 5,
            'reason'   => 'Lý do 2',
        ]);

        // Operator có thể xem lịch sử
        Sanctum::actingAs($operator);
        $response = $this->getJson("/api/admin/variants/{$variant->id}/stock-adjustments");
        $response->assertStatus(200);

        $this->assertCount(2, $response->json('data'));
        $this->assertEquals('Lý do 2', $response->json('data.0.reason'));
        $this->assertEquals($admin->id, $response->json('data.0.changed_by.id'));
    }

    public function test_low_stock_endpoint_filters_non_trashed_and_includes_zero_stock(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $category = Category::first();
        $brand = Brand::first();
        $colors = Color::take(3)->get();
        $size = Size::first();

        $product = Product::create([
            'name'        => 'Sản phẩm kiểm tra tồn thấp',
            'slug'        => 'sp-kiem-tra-ton-thap',
            'gender'      => ProductGender::Men,
            'category_id' => $category->id,
            'brand_id'    => $brand->id,
            'base_price'  => 100000,
            'status'      => ProductStatus::Active,
        ]);

        // v0: tồn 0 (hết hàng)
        $v0 = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[0]->id,
            'size_id'        => $size->id,
            'sku'            => 'LOW-0',
            'stock_quantity' => 0,
            'is_active'      => true,
        ]);

        // v3: tồn 3
        $v3 = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[1]->id,
            'size_id'        => $size->id,
            'sku'            => 'LOW-3',
            'stock_quantity' => 3,
            'is_active'      => true,
        ]);

        // vTrashed: tồn 2 nhưng bị xóa mềm -> không được xuất hiện
        $vTrashed = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $colors[2]->id,
            'size_id'        => $size->id,
            'sku'            => 'LOW-TRASHED',
            'stock_quantity' => 2,
            'is_active'      => true,
        ]);
        $vTrashed->delete();

        $response = $this->getJson('/api/admin/stock/low?threshold=5');
        $response->assertStatus(200);

        $items = collect($response->json('data'));
        $this->assertTrue($items->contains('id', $v0->id));
        $this->assertTrue($items->contains('id', $v3->id));
        $this->assertFalse($items->contains('id', $vTrashed->id));

        // Kiểm tra sắp xếp stock_quantity tăng dần
        $v0Index = $items->search(fn($item) => $item['id'] === $v0->id);
        $v3Index = $items->search(fn($item) => $item['id'] === $v3->id);
        $this->assertLessThan($v3Index, $v0Index);
    }

    // ==========================================
    // 7. Lookups Endpoint Test
    // ==========================================

    public function test_admin_and_operator_can_get_lookups(): void
    {
        Sanctum::actingAs($this->createOperator());

        $response = $this->getJson('/api/admin/lookups');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'categories',
                'brands',
                'colors',
                'sizes',
                'genders',
                'statuses',
            ]);
    }
}
