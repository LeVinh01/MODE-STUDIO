<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Đọc mật khẩu từ .env – bắt buộc, không có giá trị mặc định
        $adminPass    = env('SEED_ADMIN_PASSWORD');
        $operatorPass = env('SEED_OPERATOR_PASSWORD');
        $customerPass = env('SEED_CUSTOMER_PASSWORD');

        if (blank($adminPass)) {
            throw new \RuntimeException('SEED_ADMIN_PASSWORD is not set in .env. Set it before running seeders.');
        }
        if (blank($operatorPass)) {
            throw new \RuntimeException('SEED_OPERATOR_PASSWORD is not set in .env. Set it before running seeders.');
        }
        if (blank($customerPass)) {
            throw new \RuntimeException('SEED_CUSTOMER_PASSWORD is not set in .env. Set it before running seeders.');
        }

        $adminRole    = Role::where('name', 'admin')->firstOrFail();
        $operatorRole = Role::where('name', 'operator')->firstOrFail();
        $customerRole = Role::where('name', 'customer')->firstOrFail();

        $users = [
            [
                'full_name'         => 'Admin MODE Studio',
                'email'             => 'admin@mode-studio.test',
                'password'          => Hash::make($adminPass),
                'role_id'           => $adminRole->id,
                'status'            => 'active',
                'email_verified_at' => now(),
                'last_login_at'     => null,
            ],
            [
                'full_name'         => 'Operator MODE Studio',
                'email'             => 'operator@mode-studio.test',
                'password'          => Hash::make($operatorPass),
                'role_id'           => $operatorRole->id,
                'status'            => 'active',
                'email_verified_at' => now(),
                'last_login_at'     => null,
            ],
            [
                'full_name'         => 'Khách Hàng Mẫu',
                'email'             => 'customer@mode-studio.test',
                'password'          => Hash::make($customerPass),
                'role_id'           => $customerRole->id,
                'status'            => 'active',
                'email_verified_at' => null,
                'last_login_at'     => null,
            ],
        ];

        foreach ($users as $userData) {
            User::firstOrCreate(['email' => $userData['email']], $userData);
        }
    }
}
