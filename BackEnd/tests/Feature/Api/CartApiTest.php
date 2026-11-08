<?php

namespace Tests\Feature\Api;

use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CartApiTest extends TestCase
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

    protected function createCustomer(array $attributes = []): User
    {
        $role = Role::where('name', 'customer')->firstOrFail();

        return User::create(array_merge([
            'full_name' => 'Khách Hàng Test',
            'email'     => 'customer_' . uniqid() . '@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    protected function getActiveVariant(int $minStock = 5): ProductVariant
    {
        return ProductVariant::where('is_active', true)
            ->where('stock_quantity', '>=', $minStock)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->firstOrFail();
    }

    // =========================================================================
    // 1. XÁC THỰC & TRẠNG THÁI TÀI KHOẢN (AUTH & ACTIVE MIDDLEWARE)
    // =========================================================================

    public function test_unauthenticated_user_cannot_access_cart(): void
    {
        $this->getJson('/api/cart')->assertStatus(401);
        $this->postJson('/api/cart/items', ['variant_id' => 1, 'quantity' => 1])->assertStatus(401);
        $this->patchJson('/api/cart/items/1', ['quantity' => 2])->assertStatus(401);
        $this->deleteJson('/api/cart/items/1')->assertStatus(401);
        $this->deleteJson('/api/cart')->assertStatus(401);
    }

    public function test_locked_user_cannot_access_cart(): void
    {
        $lockedUser = $this->createCustomer(['status' => UserStatus::Locked]);

        $this->actingAs($lockedUser, 'sanctum')
            ->getJson('/api/cart')
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }

    // =========================================================================
    // 2. XEM GIỎ HÀNG (GET /api/cart)
    // =========================================================================

    public function test_user_can_view_empty_cart(): void
    {
        $user = $this->createCustomer();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/cart');

        $response->assertStatus(200)
            ->assertJson([
                'items'                   => [],
                'subtotal'                => 0,
                'total_quantity'          => 0,
                'items_count'             => 0,
                'has_unpurchasable_items' => false,
            ]);
    }

    // =========================================================================
    // 3. THÊM VÀO GIỎ HÀNG (POST /api/cart/items)
    // =========================================================================

    public function test_user_can_add_item_to_cart(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Đã thêm sản phẩm vào giỏ hàng thành công.',
                'item'    => [
                    'quantity'       => 2,
                    'is_purchasable' => true,
                    'variant'        => [
                        'id' => $variant->id,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);
    }

    public function test_adding_same_variant_accumulates_quantity(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        // Lần 1: thêm 2
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ])->assertStatus(201);

        // Lần 2: thêm tiếp 3
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('item.quantity', 5);

        // Chỉ có đúng 1 dòng trong database với quantity = 5
        $this->assertDatabaseCount('cart_items', 1);
        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 5,
        ]);
    }

    public function test_cannot_add_quantity_exceeding_stock(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->update(['stock_quantity' => 3]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 4,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message'         => 'Số lượng yêu cầu vượt quá số lượng còn lại trong kho. Hiện chỉ còn 3 sản phẩm.',
                'available_stock' => 3,
                'errors'          => [
                    'quantity' => ['Số lượng yêu cầu vượt quá số lượng còn lại trong kho. Hiện chỉ còn 3 sản phẩm.'],
                ],
            ]);
    }

    public function test_cannot_accumulate_quantity_exceeding_stock(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->update(['stock_quantity' => 4]);

        // Thêm 3 sản phẩm vào giỏ
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ])->assertStatus(201);

        // Thêm tiếp 2 sản phẩm (tổng 5 > 4) -> Phải từ chối 422
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'available_stock' => 4,
            ]);
    }

    public function test_cannot_add_quantity_exceeding_max_configured_limit(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->update(['stock_quantity' => 100]);

        $max = config('shop.cart.max_item_quantity', 20);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => $max + 1,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => "Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$max}.",
            ]);
    }

    public function test_cannot_add_inactive_variant(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->update(['is_active' => false]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Sản phẩm hoặc biến thể này hiện không khả dụng.',
            ]);
    }

    public function test_cannot_add_variant_of_draft_or_archived_product(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->product->update(['status' => ProductStatus::Draft]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Sản phẩm hoặc biến thể này hiện không khả dụng.',
            ]);
    }

    public function test_cannot_add_variant_of_soft_deleted_product(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->product->delete(); // Soft delete

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Sản phẩm hoặc biến thể này hiện không khả dụng.',
            ]);
    }

    // =========================================================================
    // 4. SỬA SỐ LƯỢNG (PATCH /api/cart/items/{id})
    // =========================================================================

    public function test_user_can_update_item_quantity(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        $cartItem = CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($user, 'sanctum')->patchJson("/api/cart/items/{$cartItem->id}", [
            'quantity' => 4,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('item.quantity', 4);

        $this->assertDatabaseHas('cart_items', [
            'id'       => $cartItem->id,
            'quantity' => 4,
        ]);
    }

    public function test_cannot_update_quantity_exceeding_stock(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        $variant->update(['stock_quantity' => 2]);

        $cartItem = CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($user, 'sanctum')->patchJson("/api/cart/items/{$cartItem->id}", [
            'quantity' => 3,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'available_stock' => 2,
            ]);
    }

    public function test_user_cannot_update_another_users_cart_item(): void
    {
        $userA = $this->createCustomer();
        $userB = $this->createCustomer();
        $variant = $this->getActiveVariant();

        $itemA = CartItem::create([
            'user_id'    => $userA->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        // User B cố tình sửa item của User A
        $response = $this->actingAs($userB, 'sanctum')->patchJson("/api/cart/items/{$itemA->id}", [
            'quantity' => 2,
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Sản phẩm trong giỏ hàng không tồn tại.',
            ]);
    }

    // =========================================================================
    // 5. XÓA MỘT DÒNG (DELETE /api/cart/items/{id})
    // =========================================================================

    public function test_user_can_delete_cart_item(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();

        $cartItem = CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/cart/items/{$cartItem->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Đã xóa sản phẩm khỏi giỏ hàng.',
            ]);

        $this->assertDatabaseMissing('cart_items', [
            'id' => $cartItem->id,
        ]);
    }

    public function test_user_cannot_delete_another_users_cart_item(): void
    {
        $userA = $this->createCustomer();
        $userB = $this->createCustomer();
        $variant = $this->getActiveVariant();

        $itemA = CartItem::create([
            'user_id'    => $userA->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($userB, 'sanctum')->deleteJson("/api/cart/items/{$itemA->id}");

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Sản phẩm trong giỏ hàng không tồn tại.',
            ]);

        $this->assertDatabaseHas('cart_items', [
            'id' => $itemA->id,
        ]);
    }

    // =========================================================================
    // 6. XÓA TOÀN BỘ GIỎ HÀNG (DELETE /api/cart)
    // =========================================================================

    public function test_user_can_clear_entire_cart(): void
    {
        $userA = $this->createCustomer();
        $userB = $this->createCustomer();
        $variants = ProductVariant::where('is_active', true)->take(2)->get();

        CartItem::create(['user_id' => $userA->id, 'variant_id' => $variants[0]->id, 'quantity' => 1]);
        CartItem::create(['user_id' => $userA->id, 'variant_id' => $variants[1]->id, 'quantity' => 2]);
        CartItem::create(['user_id' => $userB->id, 'variant_id' => $variants[0]->id, 'quantity' => 1]);

        $response = $this->actingAs($userA, 'sanctum')->deleteJson('/api/cart');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Đã làm trống giỏ hàng.',
            ]);

        // User A trống giỏ, User B vẫn còn
        $this->assertDatabaseMissing('cart_items', ['user_id' => $userA->id]);
        $this->assertDatabaseHas('cart_items', ['user_id' => $userB->id]);
    }

    // =========================================================================
    // 7. CỜ IS_PURCHASABLE & TÍNH TỔNG TIỀN SUBTOTAL CHÍNH XÁC
    // =========================================================================

    public function test_cart_listing_flags_unpurchasable_items_and_calculates_subtotal(): void
    {
        $user = $this->createCustomer();
        $variants = ProductVariant::where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active))
            ->take(2)
            ->get();

        $var1 = $variants[0];
        $var1->update(['stock_quantity' => 10]);
        $price1 = (int) $var1->product->base_price;

        $var2 = $variants[1];
        $var2->update(['stock_quantity' => 1]); // Tồn kho chỉ còn 1
        $price2 = (int) $var2->product->base_price;

        // Dòng 1: qty = 2 (mua được) -> line_total = price1 * 2
        CartItem::create(['user_id' => $user->id, 'variant_id' => $var1->id, 'quantity' => 2]);

        // Dòng 2: qty = 3 (vượt tồn kho 1) -> is_purchasable = false
        CartItem::create(['user_id' => $user->id, 'variant_id' => $var2->id, 'quantity' => 3]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/cart');

        $response->assertStatus(200)
            ->assertJsonPath('total_quantity', 5)
            ->assertJsonPath('items_count', 2)
            ->assertJsonPath('has_unpurchasable_items', true)
            ->assertJsonPath('subtotal', $price1 * 2); // Chỉ tính dòng 1

        $items = $response->json('items');
        $this->assertTrue($items[0]['is_purchasable']);
        $this->assertNull($items[0]['unpurchasable_reason']);

        $this->assertFalse($items[1]['is_purchasable']);
        $this->assertStringContainsString('vượt quá tồn kho', $items[1]['unpurchasable_reason']);
    }

    public function test_soft_deleted_product_in_cart_is_flagged_unpurchasable_and_subtotal_excludes_it(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $product = $variant->product;
        $price = (int) $product->base_price;

        // Cho vào giỏ trước khi bị xóa
        CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        // Sau đó sản phẩm bị xóa mềm
        $product->delete();
        $this->assertSoftDeleted('products', ['id' => $product->id]);

        // GET /api/cart phải trả về 200, không bị lỗi null
        $response = $this->actingAs($user, 'sanctum')->getJson('/api/cart');

        $response->assertStatus(200)
            ->assertJsonPath('items_count', 1)
            ->assertJsonPath('total_quantity', 1)
            ->assertJsonPath('subtotal', 0) // Không tính tiền dòng này
            ->assertJsonPath('has_unpurchasable_items', true);

        $item = $response->json('items.0');
        $this->assertFalse($item['is_purchasable']);
        $this->assertEquals('Sản phẩm đã ngừng kinh doanh', $item['unpurchasable_reason']);
        $this->assertEquals($product->name, $item['product']['name']);
    }
}
