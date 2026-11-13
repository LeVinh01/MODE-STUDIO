<?php

namespace Tests\Feature\Api;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    protected function createCustomer(array $attributes = []): User
    {
        $customerRole = Role::where('name', 'customer')->firstOrFail();

        return User::create(array_merge([
            'full_name' => 'Nguyen Van A',
            'email'     => 'customer@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('OldPassword123!'),
            'role_id'   => $customerRole->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    public function test_unauthenticated_user_cannot_access_profile_or_password(): void
    {
        $this->putJson('/api/user/profile', ['full_name' => 'New Name'])
            ->assertStatus(401);

        $this->putJson('/api/user/password', [
            'current_password'      => 'OldPassword123!',
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertStatus(401);
    }

    public function test_user_can_update_profile_successfully(): void
    {
        $user = $this->createCustomer();
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/user/profile', [
            'full_name' => 'Nguyen Van B',
            'phone'     => '0987654321',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Cập nhật thông tin tài khoản thành công.',
                'user'    => [
                    'id'        => $user->id,
                    'full_name' => 'Nguyen Van B',
                    'email'     => 'customer@example.com',
                    'phone'     => '0987654321',
                    'role'      => 'customer',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id'        => $user->id,
            'full_name' => 'Nguyen Van B',
            'phone'     => '0987654321',
        ]);
    }

    public function test_update_profile_ignores_sensitive_fields_mass_assignment(): void
    {
        $user = $this->createCustomer();
        $adminRole = Role::where('name', 'admin')->firstOrFail();
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/user/profile', [
            'full_name' => 'Legit Name',
            'email'     => 'hacked@example.com',
            'role_id'   => $adminRole->id,
            'status'    => 'locked',
            'id'        => 99999,
        ]);

        $response->assertStatus(200);

        $user->refresh();
        $this->assertEquals('Legit Name', $user->full_name);
        $this->assertEquals('customer@example.com', $user->email);
        $this->assertNotEquals($adminRole->id, $user->role_id);
        $this->assertEquals(UserStatus::Active, $user->status);
    }

    public function test_update_profile_validates_phone_format(): void
    {
        $user = $this->createCustomer();
        Sanctum::actingAs($user);

        // Invalid phone number
        $response = $this->putJson('/api/user/profile', [
            'full_name' => 'Valid Name',
            'phone'     => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_change_password_fails_if_current_password_is_incorrect(): void
    {
        $user = $this->createCustomer();
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/user/password', [
            'current_password'      => 'WrongPassword!',
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        // Password in DB unchanged
        $user->refresh();
        $this->assertTrue(Hash::check('OldPassword123!', $user->password));
    }

    public function test_change_password_successfully_and_revokes_other_tokens(): void
    {
        $user = $this->createCustomer();

        // Create 2 tokens for user
        $currentToken = $user->createToken('current_session');
        $oldToken1 = $user->createToken('old_session_1');
        $oldToken2 = $user->createToken('old_session_2');

        $this->assertEquals(3, $user->tokens()->count());

        // Authenticate with currentToken
        $response = $this->withHeader('Authorization', 'Bearer ' . $currentToken->plainTextToken)
            ->putJson('/api/user/password', [
                'current_password'      => 'OldPassword123!',
                'password'              => 'NewSecret456!',
                'password_confirmation' => 'NewSecret456!',
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Đổi mật khẩu thành công.']);

        // Verify other tokens were deleted and current token remains
        $user->refresh();
        $this->assertEquals(1, $user->tokens()->count());
        $this->assertEquals($currentToken->accessToken->id, $user->tokens()->first()->id);

        // Login with old password fails
        $loginFail = $this->postJson('/api/auth/login', [
            'email'    => 'customer@example.com',
            'password' => 'OldPassword123!',
        ]);
        $loginFail->assertStatus(401);

        // Login with new password succeeds
        $loginOk = $this->postJson('/api/auth/login', [
            'email'    => 'customer@example.com',
            'password' => 'NewSecret456!',
        ]);
        $loginOk->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);
    }
}
