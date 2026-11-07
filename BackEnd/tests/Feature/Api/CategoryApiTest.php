<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed theo đúng danh sách được duyệt (không gọi UserSeeder)
        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,
        ]);
    }

    public function test_returns_all_active_root_categories_with_children(): void
    {
        $response = $this->getJson('/api/categories');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => [
                             'id',
                             'name',
                             'slug',
                             'description',
                             'image_url',
                             'sort_order',
                             'children',
                         ],
                     ],
                 ]);

        // Cả DB có 7 categories (3 root: women, men, accessories)
        $data = $response->json('data');
        $this->assertCount(3, $data);

        $women = collect($data)->firstWhere('slug', 'women');
        $this->assertNotNull($women);
        $this->assertCount(2, $women['children']); // jackets-blazers, dresses

        $men = collect($data)->firstWhere('slug', 'men');
        $this->assertNotNull($men);
        $this->assertCount(0, $men['children']);

        $accessories = collect($data)->firstWhere('slug', 'accessories');
        $this->assertNotNull($accessories);
        $this->assertCount(2, $accessories['children']); // bags, belts
    }

    public function test_inactive_categories_are_excluded(): void
    {
        // Ẩn 1 danh mục con
        Category::where('slug', 'dresses')->update(['is_active' => false]);

        $response = $this->getJson('/api/categories');
        $response->assertStatus(200);

        $women = collect($response->json('data'))->firstWhere('slug', 'women');
        $this->assertCount(1, $women['children']);
        $this->assertEquals('jackets-blazers', $women['children'][0]['slug']);

        // Ẩn 1 danh mục gốc
        Category::where('slug', 'men')->update(['is_active' => false]);

        $response2 = $this->getJson('/api/categories');
        $this->assertCount(2, $response2->json('data'));
        $this->assertNull(collect($response2->json('data'))->firstWhere('slug', 'men'));
    }
}
