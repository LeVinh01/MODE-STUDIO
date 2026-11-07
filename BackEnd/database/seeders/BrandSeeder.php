<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        // Mock không có thông tin brand – tự đặt tên phù hợp phong cách
        $brands = [
            ['name' => 'MODE Studio',         'slug' => 'mode-studio',         'is_active' => true],
            ['name' => 'Artisan Collective',   'slug' => 'artisan-collective',   'is_active' => true],
            ['name' => 'Heritage Craft',       'slug' => 'heritage-craft',       'is_active' => true],
        ];

        foreach ($brands as $brand) {
            Brand::firstOrCreate(['slug' => $brand['slug']], $brand);
        }
    }
}
