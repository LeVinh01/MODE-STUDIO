<?php

namespace Database\Seeders;

use App\Models\Color;
use Illuminate\Database\Seeder;

class ColorSeeder extends Seeder
{
    public function run(): void
    {
        // 13 màu lấy từ mock FrontEnd/src/mocks/products.ts
        $colors = [
            ['name' => 'Đen Tuyệt Đối',    'hex_code' => '#111111'], // prod-001, 005, 008
            ['name' => 'Đen Nhám',          'hex_code' => '#1a1816'], // prod-002, 006
            ['name' => 'Kem Sữa',           'hex_code' => '#f5f3ef'], // prod-001
            ['name' => 'Be Cát',            'hex_code' => '#efece6'], // prod-002
            ['name' => 'Xám Than',          'hex_code' => '#2c2824'], // prod-003
            ['name' => 'Xanh Đêm',          'hex_code' => '#1d2a3a'], // prod-003
            ['name' => 'Trắng Tinh Khiết',  'hex_code' => '#ffffff'], // prod-004
            ['name' => 'Xanh Khói Nhạt',    'hex_code' => '#d8e2dc'], // prod-004
            ['name' => 'Taupe Ấm',          'hex_code' => '#d8d1c5'], // prod-005
            ['name' => 'Nâu Da Bò',         'hex_code' => '#8b5a2b'], // prod-006
            ['name' => 'Nâu Lạc Đà',        'hex_code' => '#c19a6b'], // prod-007
            ['name' => 'Xám Đá',            'hex_code' => '#7d766c'], // prod-007
            ['name' => 'Nâu Cổ Điển',       'hex_code' => '#5c4033'], // prod-008
        ];

        foreach ($colors as $color) {
            Color::firstOrCreate(['name' => $color['name']], $color);
        }
    }
}
