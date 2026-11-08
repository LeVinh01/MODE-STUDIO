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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class CartBatchApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        RateLimiter::clear('cart-quote:127.0.0.1');

        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,
        ]);
    }

    protected function tearDown(): void
    {
        Cache::flush();
        RateLimiter::clear('cart-quote:127.0.0.1');

        parent::tearDown();
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

    // ==========================================
    // 1. TESTS CHO POST /api/cart/quote (PUBLIC)
    // ==========================================

    public function test_guest_can_quote_cart_without_token(): void
    {
        $variant = $this->getActiveVariant(10);
        $price = (int) $variant->product->base_price;

        $response = $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 2],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('total_quantity', 2)
            ->assertJsonPath('items_count', 1)
            ->assertJsonPath('subtotal', $price * 2)
            ->assertJsonPath('has_unpurchasable_items', false)
            ->assertJsonPath('missing_variant_ids', []);

        $item = $response->json('items.0');
        $this->assertNull($item['id']);
        $this->assertTrue($item['is_purchasable']);
        $this->assertNull($item['unpurchasable_reason']);
        $this->assertEquals($price, $item['unit_price']);
        $this->assertEquals($price * 2, $item['line_total']);
        $this->assertEquals($variant->id, $item['variant']['id']);
        $this->assertEquals($variant->product->name, $item['product']['name']);
    }

    public function test_quote_empty_items_returns_empty_summary(): void
    {
        $response = $this->postJson('/api/cart/quote', [
            'items' => [],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'items'                   => [],
                'subtotal'                => 0,
                'total_quantity'          => 0,
                'items_count'             => 0,
                'has_unpurchasable_items' => false,
                'missing_variant_ids'     => [],
            ]);
    }

    public function test_quote_aggregates_duplicate_variants_and_caps_at_20(): void
    {
        $variant = $this->getActiveVariant(5);
        $variant->update(['stock_quantity' => 50]);

        $response = $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 15],
                ['variant_id' => $variant->id, 'quantity' => 10], // Tổng là 25, phải bị giới hạn về 20
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('items_count', 1)
            ->assertJsonPath('total_quantity', 20)
            ->assertJsonPath('items.0.quantity', 20);
    }

    public function test_quote_reports_missing_variant_ids(): void
    {
        $variant = $this->getActiveVariant(10);
        $nonExistentId = 999999;

        $response = $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 1],
                ['variant_id' => $nonExistentId, 'quantity' => 2],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('items_count', 1)
            ->assertJsonPath('missing_variant_ids', [$nonExistentId]);
    }

    public function test_quote_hides_draft_soft_deleted_and_future_products(): void
    {
        // 1. Biến thể của sản phẩm Draft
        $draftVariant = $this->getActiveVariant(10);
        $draftProduct = $draftVariant->product;
        $draftProduct->update(['status' => ProductStatus::Draft]);

        // 2. Biến thể của sản phẩm Soft-deleted
        $deletedVariant = ProductVariant::where('id', '!=', $draftVariant->id)->where('is_active', true)->first();
        $deletedProduct = $deletedVariant->product;
        $deletedProduct->delete();

        // 3. Biến thể của sản phẩm có published_at trong tương lai (bị ẩn)
        $futureVariant = ProductVariant::whereNotIn('id', [$draftVariant->id, $deletedVariant->id])->where('is_active', true)->first();
        $futureProduct = $futureVariant->product;
        $futureProduct->update(['published_at' => now()->addDays(5)]);

        $response = $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => $draftVariant->id, 'quantity' => 1],
                ['variant_id' => $deletedVariant->id, 'quantity' => 1],
                ['variant_id' => $futureVariant->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('items_count', 3)
            ->assertJsonPath('subtotal', 0)
            ->assertJsonPath('has_unpurchasable_items', true);

        $items = $response->json('items');
        // Vẫn trả variant.id tương ứng với ID client gửi lên để frontend biết dòng nào cần xóa khỏi giỏ local
        $this->assertEquals($draftVariant->id, $items[0]['variant']['id']);
        $this->assertEquals($deletedVariant->id, $items[1]['variant']['id']);
        $this->assertEquals($futureVariant->id, $items[2]['variant']['id']);

        foreach ($items as $item) {
            $this->assertFalse($item['is_purchasable']);
            $this->assertEquals('Sản phẩm đã ngừng kinh doanh', $item['unpurchasable_reason']);
            // Bảo mật: không để lộ thông tin sản phẩm nháp / xóa mềm / bị ẩn
            $this->assertNull($item['product']);
            $this->assertEquals(0, $item['unit_price']);
            $this->assertEquals(0, $item['line_total']);
            $this->assertEquals(0, $item['variant']['stock_quantity']);
            $this->assertFalse($item['variant']['is_active']);
            $this->assertNull($item['variant']['sku']);
        }
    }

    public function test_quote_handles_inactive_or_out_of_stock_variant_for_public_product(): void
    {
        // Sản phẩm public nhưng biến thể ngừng bán
        $inactiveVariant = $this->getActiveVariant(10);
        $inactiveVariant->update(['is_active' => false]);

        // Sản phẩm public nhưng biến thể hết hàng
        $outOfStockVariant = ProductVariant::where('id', '!=', $inactiveVariant->id)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->first();
        $outOfStockVariant->update(['stock_quantity' => 0, 'is_active' => true]);

        $response = $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => $inactiveVariant->id, 'quantity' => 1],
                ['variant_id' => $outOfStockVariant->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('items_count', 2)
            ->assertJsonPath('subtotal', 0)
            ->assertJsonPath('has_unpurchasable_items', true);

        $item0 = $response->json('items.0');
        $this->assertFalse($item0['is_purchasable']);
        $this->assertEquals('Biến thể tạm ngừng bán', $item0['unpurchasable_reason']);
        $this->assertNotNull($item0['product']); // Sản phẩm active thì được hiển thị tên

        $item1 = $response->json('items.1');
        $this->assertFalse($item1['is_purchasable']);
        $this->assertEquals('Sản phẩm đã hết hàng', $item1['unpurchasable_reason']);
        $this->assertNotNull($item1['product']);
    }

    public function test_quote_validation_errors(): void
    {
        // Thiếu mảng items
        $this->postJson('/api/cart/quote', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        // Items vượt quá 50 phần tử
        $manyItems = [];
        for ($i = 1; $i <= 51; $i++) {
            $manyItems[] = ['variant_id' => $i, 'quantity' => 1];
        }
        $this->postJson('/api/cart/quote', ['items' => $manyItems])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        // Số lượng không hợp lệ (0, âm hoặc > 20)
        $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => 1, 'quantity' => 0],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.quantity']);

        $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => 1, 'quantity' => 21],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.quantity']);

        // variant_id không phải số nguyên
        $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => 'abc', 'quantity' => 1],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.variant_id']);
    }

    public function test_quote_rate_limiting(): void
    {
        config(['shop.cart.quote_throttle' => 2]);

        $this->postJson('/api/cart/quote', ['items' => []])->assertStatus(200);
        $this->postJson('/api/cart/quote', ['items' => []])->assertStatus(200);

        // Lần thứ 3 phải bị chặn 429
        $response = $this->postJson('/api/cart/quote', ['items' => []]);
        $response->assertStatus(429)
            ->assertJson([
                'message' => 'Bạn đã gửi quá nhiều yêu cầu tính giá giỏ hàng. Vui lòng thử lại sau 1 phút.',
            ]);
    }

    // ==========================================
    // 2. TESTS CHO POST /api/cart/merge (AUTH)
    // ==========================================

    public function test_merge_requires_authentication(): void
    {
        $this->postJson('/api/cart/merge', [
            'merge_token' => (string) Str::uuid(),
            'items'       => [],
        ])->assertStatus(401);
    }

    public function test_locked_user_cannot_merge_cart(): void
    {
        $user = $this->createCustomer(['status' => UserStatus::Locked]);

        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => (string) Str::uuid(),
            'items'       => [],
        ])->assertStatus(403);
    }

    public function test_merge_validation_errors(): void
    {
        $user = $this->createCustomer();

        // Thiếu merge_token
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'items' => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['merge_token']);

        // merge_token không phải UUID
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => 'invalid-uuid-token',
            'items'       => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['merge_token']);

        // Thiếu mảng items
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => (string) Str::uuid(),
        ])->assertStatus(422)->assertJsonValidationErrors(['items']);
    }

    public function test_merge_with_empty_items_returns_current_cart(): void
    {
        $user = $this->createCustomer();
        $token = (string) Str::uuid();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message'        => 'Đã đồng bộ giỏ hàng thành công.',
                'already_merged' => false,
                'cart'           => [
                    'items'       => [],
                    'items_count' => 0,
                    'subtotal'    => 0,
                ],
                'skipped'        => [],
                'adjusted'       => [],
            ]);
    }

    public function test_merge_adds_new_items_into_user_cart(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $price = (int) $variant->product->base_price;
        $token = (string) Str::uuid();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 3],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('already_merged', false)
            ->assertJsonPath('cart.items_count', 1)
            ->assertJsonPath('cart.total_quantity', 3)
            ->assertJsonPath('cart.subtotal', $price * 3)
            ->assertJsonPath('skipped', [])
            ->assertJsonPath('adjusted', []);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ]);
    }

    public function test_merge_aggregates_duplicate_variants_in_payload(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(20);
        $token = (string) Str::uuid();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 2],
                ['variant_id' => $variant->id, 'quantity' => 3],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('cart.items_count', 1)
            ->assertJsonPath('cart.total_quantity', 5)
            ->assertJsonPath('cart.items.0.quantity', 5);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 5,
        ]);
    }

    public function test_merge_accumulates_with_existing_user_cart(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(20);

        // Đã có 2 trong giỏ
        CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);

        $token = (string) Str::uuid();

        // Gộp thêm 3
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 3],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('cart.items_count', 1)
            ->assertJsonPath('cart.total_quantity', 5)
            ->assertJsonPath('cart.items.0.quantity', 5);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 5,
        ]);
    }

    public function test_merge_clamps_quantity_to_stock_limit_and_records_in_adjusted(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $variant->update(['stock_quantity' => 6]); // Tồn kho chỉ còn 6

        // Người dùng đã có 4 trong giỏ
        CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 4,
        ]);

        $token = (string) Str::uuid();

        // Khách gửi lên 5 (tổng là 9 > 6)
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('cart.items.0.quantity', 6)
            ->assertJsonCount(1, 'adjusted');

        $adjusted = $response->json('adjusted.0');
        $this->assertEquals($variant->id, $adjusted['variant_id']);
        $this->assertEquals(9, $adjusted['requested']);
        $this->assertEquals(6, $adjusted['final']);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 6,
        ]);
    }

    public function test_merge_skips_unpurchasable_variants_and_records_in_skipped(): void
    {
        $user = $this->createCustomer();

        // 1. Variant không tồn tại
        $nonExistentId = 999999;

        // 2. Sản phẩm xóa mềm
        $deletedVariant = $this->getActiveVariant(5);
        $deletedVariant->product->delete();

        // 3. Biến thể inactive của sản phẩm khác vẫn đang active
        $inactiveVariant = ProductVariant::where('product_id', '!=', $deletedVariant->product_id)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->firstOrFail();
        $inactiveVariant->update(['is_active' => false]);

        // 4. Biến thể hết hàng (stock = 0) của sản phẩm khác
        $outOfStockVariant = ProductVariant::whereNotIn('product_id', [$deletedVariant->product_id, $inactiveVariant->product_id])
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->firstOrFail();
        $outOfStockVariant->update(['stock_quantity' => 0, 'is_active' => true]);

        $token = (string) Str::uuid();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $nonExistentId, 'quantity' => 1],
                ['variant_id' => $deletedVariant->id, 'quantity' => 1],
                ['variant_id' => $inactiveVariant->id, 'quantity' => 1],
                ['variant_id' => $outOfStockVariant->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('cart.items_count', 0)
            ->assertJsonCount(4, 'skipped');

        $skipped = collect($response->json('skipped'))->keyBy('variant_id');

        $this->assertEquals('Biến thể sản phẩm không tồn tại.', $skipped[$nonExistentId]['reason']);
        $this->assertEquals('Sản phẩm đã ngừng kinh doanh.', $skipped[$deletedVariant->id]['reason']);
        $this->assertEquals('Biến thể tạm ngừng bán.', $skipped[$inactiveVariant->id]['reason']);
        $this->assertEquals('Sản phẩm đã hết hàng.', $skipped[$outOfStockVariant->id]['reason']);

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_merge_idempotency_with_same_token(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(15);
        $token = (string) Str::uuid();

        // Lần gọi 1: thực hiện gộp
        $response1 = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 2],
            ],
        ]);

        $response1->assertStatus(200)
            ->assertJsonPath('already_merged', false)
            ->assertJsonPath('cart.total_quantity', 2);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);

        // Lần gọi 2 với cùng token: không được gộp thêm, trả về already_merged = true
        $response2 = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 2],
            ],
        ]);

        $response2->assertStatus(200)
            ->assertJsonPath('already_merged', true)
            ->assertJsonPath('message', 'Phiên gộp giỏ hàng này đã được thực hiện trước đó.')
            ->assertJsonPath('cart.total_quantity', 2); // Vẫn là 2, KHÔNG bị tăng lên 4

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);
    }

    public function test_merge_does_not_affect_other_users_cart(): void
    {
        $userA = $this->createCustomer();
        $userB = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        // User B có sẵn 1 trong giỏ
        CartItem::create([
            'user_id'    => $userB->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        // User A thực hiện merge
        $this->actingAs($userA, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => (string) Str::uuid(),
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 3],
            ],
        ])->assertStatus(200);

        // Giỏ của User B vẫn nguyên vẹn
        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $userB->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        // Giỏ của User A có 3
        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $userA->id,
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ]);
    }

    public function test_merge_clamps_total_quantity_by_stock_when_accumulating_with_existing_cart(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(5);
        $variant->update(['stock_quantity' => 5]);

        // Giỏ có sẵn 3
        CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ]);

        $token = (string) Str::uuid();

        // Merge thêm 4 (tổng là 3 + 4 = 7 > tồn kho 5) -> final phải là 5, adjusted có đúng 1 phần tử
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 4],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('already_merged', false)
            ->assertJsonPath('cart.items.0.quantity', 5)
            ->assertJsonCount(1, 'adjusted')
            ->assertJsonPath('adjusted.0.variant_id', $variant->id)
            ->assertJsonPath('adjusted.0.requested', 7)
            ->assertJsonPath('adjusted.0.final', 5);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 5,
        ]);
    }

    public function test_merge_clamps_total_quantity_by_max_20_when_accumulating_with_existing_cart(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(5);
        $variant->update(['stock_quantity' => 50]);

        // Giỏ có sẵn 18
        CartItem::create([
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 18,
        ]);

        $token = (string) Str::uuid();

        // Merge thêm 5 (tổng là 18 + 5 = 23 > max 20) -> final phải là 20, adjusted có đúng 1 phần tử
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('already_merged', false)
            ->assertJsonPath('cart.items.0.quantity', 20)
            ->assertJsonCount(1, 'adjusted')
            ->assertJsonPath('adjusted.0.variant_id', $variant->id)
            ->assertJsonPath('adjusted.0.requested', 23)
            ->assertJsonPath('adjusted.0.final', 20);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 20,
        ]);
    }

    public function test_merge_releases_token_on_transaction_failure_allowing_retry_with_same_token(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $token = (string) Str::uuid();

        // Mô phỏng transaction bị lỗi ném exception khi lưu CartItem ở lần đầu tiên
        $shouldFail = true;
        CartItem::saving(function () use (&$shouldFail) {
            if ($shouldFail) {
                throw new \RuntimeException('Mô phỏng lỗi transaction / database');
            }
        });

        // Lần 1: Gọi merge, transaction bị lỗi 500
        $response1 = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 2],
            ],
        ]);
        $response1->assertStatus(500);

        // Hủy cờ lỗi và xóa listener để mô phỏng lần gửi lại bình thường
        $shouldFail = false;
        CartItem::flushEventListeners();

        // Xác nhận trong CSDL chưa có giỏ hàng nào được tạo
        $this->assertDatabaseMissing('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
        ]);

        // Lần 2: Gửi lại cùng token trên -> token đã được giải phóng (Cache::forget), phải gộp thành công
        $response2 = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', [
            'merge_token' => $token,
            'items'       => [
                ['variant_id' => $variant->id, 'quantity' => 2],
            ],
        ]);

        $response2->assertStatus(200)
            ->assertJsonPath('already_merged', false)
            ->assertJsonPath('cart.total_quantity', 2);

        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 2,
        ]);
    }
}
