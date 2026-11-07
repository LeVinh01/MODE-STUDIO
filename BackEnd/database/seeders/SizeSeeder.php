<?php

namespace Database\Seeders;

use App\Models\Size;
use Illuminate\Database\Seeder;

class SizeSeeder extends Seeder
{
    public function run(): void
    {
        // Size số trong mock (48, 39, 95) được map sang S/M/L/XL hoặc One Size trong ProductSeeder
        $sizes = [
            ['name' => 'S',        'sort_order' => 1],
            ['name' => 'M',        'sort_order' => 2],
            ['name' => 'L',        'sort_order' => 3],
            ['name' => 'XL',       'sort_order' => 4],
            ['name' => 'One Size', 'sort_order' => 5], // túi xách, thắt lưng
        ];

        foreach ($sizes as $size) {
            Size::firstOrCreate(['name' => $size['name']], $size);
        }
    }
}
