<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'full_name'          => fake()->name(),
            'email'              => fake()->unique()->safeEmail(),
            'phone'              => null,
            'email_verified_at'  => now(),
            'password'           => static::$password ??= Hash::make('password'),
            'role_id'            => 1, // customer role by default
            'status'             => 'active',
            'last_login_at'      => null,
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
