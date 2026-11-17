<?php

namespace Database\Seeders;

use App\Models\Color;
use Illuminate\Database\Seeder;

class ExtraColorSeeder extends Seeder
{
    public function run(): void
    {
        $extraColors = [
            ['name' => 'Nâu Chocolate',   'hex_code' => '#5c3a2e'],
            ['name' => 'Xanh Navy',       'hex_code' => '#1f2a44'],
            ['name' => 'Xanh Rêu',        'hex_code' => '#4b5240'],
            ['name' => 'Be',              'hex_code' => '#d2b48c'],
            ['name' => 'Đen',             'hex_code' => '#111111'],
            ['name' => 'Trắng Kem',       'hex_code' => '#f3efe6'],
            ['name' => 'Xám',             'hex_code' => '#808080'],
            ['name' => 'Xanh Dương Nhạt', 'hex_code' => '#a9c4e0'],
        ];

        foreach ($extraColors as $color) {
            $hex = strtolower($color['hex_code']);
            $name = $color['name'];

            // Thêm nếu cả name và hex đều chưa tồn tại, không sửa dòng có sẵn
            $exists = Color::where('name', $name)
                ->orWhereRaw('LOWER(hex_code) = ?', [$hex])
                ->exists();

            if (!$exists) {
                Color::create([
                    'name'     => $name,
                    'hex_code' => $hex,
                ]);
            }
        }
    }
}
