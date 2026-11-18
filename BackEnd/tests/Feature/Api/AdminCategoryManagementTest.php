<?php

namespace Tests\Feature\Api;

use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            CategorySeeder::class,
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

    public function test_admin_and_operator_can_list_categories(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/categories');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'parent_id',
                        'image_url',
                        'products_count',
                        'children_count',
                        'created_at',
                    ]
                ]
            ]);

        $operator = $this->createOperator();
        Sanctum::actingAs($operator);

        $this->getJson('/api/admin/categories')->assertStatus(200);
    }

    public function test_customer_cannot_access_admin_categories(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $this->getJson('/api/admin/categories')->assertStatus(403);
        $this->postJson('/api/admin/categories', [
            'name' => 'Danh mục Mới',
            'slug' => 'danh-muc-moi',
        ])->assertStatus(403);
    }

    public function test_admin_can_create_category(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $women = Category::where('slug', 'women')->firstOrFail();

        $payload = [
            'name'        => 'Áo Khoác Trench Coat',
            'slug'        => 'women-trench-coats',
            'parent_id'   => $women->id,
            'description' => 'Áo khoác dáng dài mùa thu đông thanh lịch.',
            'sort_order'  => 10,
            'is_active'   => true,
        ];

        $response = $this->postJson('/api/admin/categories', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Áo Khoác Trench Coat')
            ->assertJsonPath('data.slug', 'women-trench-coats')
            ->assertJsonPath('data.parent_id', $women->id);

        $this->assertDatabaseHas('categories', [
            'name'      => 'Áo Khoác Trench Coat',
            'slug'      => 'women-trench-coats',
            'parent_id' => $women->id,
        ]);
    }

    public function test_operator_cannot_create_or_update_category(): void
    {
        $operator = $this->createOperator();
        Sanctum::actingAs($operator);

        $this->postJson('/api/admin/categories', [
            'name' => 'Test',
            'slug' => 'test-cat',
        ])->assertStatus(403);

        $women = Category::where('slug', 'women')->firstOrFail();
        $this->putJson("/api/admin/categories/{$women->id}", [
            'name' => 'Thời Trang Nữ Mới',
        ])->assertStatus(403);
    }

    public function test_store_validation_rejects_missing_name_and_duplicate_slug(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        // Missing name
        $this->postJson('/api/admin/categories', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        // Duplicate slug
        $this->postJson('/api/admin/categories', [
            'name' => 'Thời Trang Nữ Trùng',
            'slug' => 'women',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['slug']);
    }

    public function test_admin_can_update_category(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::create([
            'name'       => 'Danh Mục Cũ',
            'slug'       => 'danh-muc-cu',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        $response = $this->putJson("/api/admin/categories/{$cat->id}", [
            'name'       => 'Danh Mục Đã Cập Nhật',
            'slug'       => 'danh-muc-da-cap-nhat',
            'sort_order' => 5,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Danh Mục Đã Cập Nhật')
            ->assertJsonPath('data.slug', 'danh-muc-da-cap-nhat');

        $this->assertDatabaseHas('categories', [
            'id'   => $cat->id,
            'name' => 'Danh Mục Đã Cập Nhật',
            'slug' => 'danh-muc-da-cap-nhat',
        ]);
    }

    public function test_update_prevents_category_from_being_parent_of_itself(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::create([
            'name' => 'Danh Mục Tự Thân',
            'slug' => 'danh-muc-tu-than',
        ]);

        $response = $this->putJson("/api/admin/categories/{$cat->id}", [
            'parent_id' => $cat->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_admin_can_upload_representative_image(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::create([
            'name' => 'Danh Mục Test Ảnh',
            'slug' => 'danh-muc-test-anh',
        ]);

        $file = UploadedFile::fake()->image('category-banner.jpg', 800, 800);

        $response = $this->postJson("/api/admin/categories/{$cat->id}/image", [
            'image' => $file,
        ]);

        $response->assertStatus(200);

        $cat->refresh();
        $this->assertNotNull($cat->image_url);
        $this->assertStringContainsString('storage/categories', $cat->image_url);
    }

    public function test_upload_image_rejects_invalid_file_and_over_2mb(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::create([
            'name' => 'Danh Mục Test Lỗi Ảnh',
            'slug' => 'danh-muc-test-loi-anh',
        ]);

        // File text thay vì ảnh
        $txtFile = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');
        $this->postJson("/api/admin/categories/{$cat->id}/image", ['image' => $txtFile])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['image']);

        // File quá 2MB (2500KB)
        $largeFile = UploadedFile::fake()->image('large.jpg')->size(2500);
        $this->postJson("/api/admin/categories/{$cat->id}/image", ['image' => $largeFile])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_upload_image_deletes_old_file_when_replaced(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::create([
            'name' => 'Danh Mục Thay Ảnh',
            'slug' => 'danh-muc-thay-anh',
        ]);

        // Ảnh 1
        $file1 = UploadedFile::fake()->image('first.jpg');
        $this->postJson("/api/admin/categories/{$cat->id}/image", ['image' => $file1])
            ->assertStatus(200);

        $cat->refresh();
        $firstUrl = $cat->image_url;
        $firstPath = 'categories/' . basename($firstUrl);
        Storage::disk('public')->assertExists($firstPath);

        // Ảnh 2 (thay thế)
        $file2 = UploadedFile::fake()->image('second.png');
        $this->postJson("/api/admin/categories/{$cat->id}/image", ['image' => $file2])
            ->assertStatus(200);

        $cat->refresh();
        $secondUrl = $cat->image_url;
        $secondPath = 'categories/' . basename($secondUrl);

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    public function test_admin_can_remove_category_image(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::create([
            'name' => 'Danh Mục Xóa Ảnh',
            'slug' => 'danh-muc-xoa-anh',
        ]);

        $file = UploadedFile::fake()->image('cover.jpg');
        $this->postJson("/api/admin/categories/{$cat->id}/image", ['image' => $file])
            ->assertStatus(200);

        $cat->refresh();
        $path = 'categories/' . basename($cat->image_url);
        Storage::disk('public')->assertExists($path);

        // Xóa ảnh
        $response = $this->deleteJson("/api/admin/categories/{$cat->id}/image");
        $response->assertStatus(200)
            ->assertJsonPath('data.image_url', null);

        $cat->refresh();
        $this->assertNull($cat->image_url);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_category_has_no_delete_endpoint(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $cat = Category::firstOrFail();

        // Không hỗ trợ xóa danh mục (không có route DELETE /api/admin/categories/{id})
        $response = $this->deleteJson("/api/admin/categories/{$cat->id}");
        $this->assertTrue(in_array($response->status(), [404, 405], true));
    }
}
