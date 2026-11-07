<?php

namespace App\Http\Resources;

use App\Enums\UserStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Tắt bọc key 'data' mặc định của Resource
     */
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                => (int) $this->id,
            'full_name'         => $this->full_name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'role'              => $this->role->name,
            'status'            => $this->status instanceof UserStatus ? $this->status->value : (string) $this->status,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'last_login_at'     => $this->last_login_at?->toISOString(),
        ];
    }
}
