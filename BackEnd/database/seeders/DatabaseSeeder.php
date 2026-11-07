<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,       // 1. Phải trước UserSeeder (FK role_id)
            UserSeeder::class,       // 2. Sau RoleSeeder
            ColorSeeder::class,      // 3.
            SizeSeeder::class,       // 4.
            CategorySeeder::class,   // 5.
            BrandSeeder::class,      // 6.
            ProductSeeder::class,    // 7. Sau tất cả lookup tables
        ]);
    }
}
