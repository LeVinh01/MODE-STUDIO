<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'customer', 'description' => 'Khách hàng mua sắm'],
            ['name' => 'operator', 'description' => 'Nhân viên vận hành'],
            ['name' => 'admin',    'description' => 'Quản trị viên'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }
    }
}
