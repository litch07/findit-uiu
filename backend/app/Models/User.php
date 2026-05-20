<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'student_id',
        'department',
        'phone',
        'bio',
        'role',
        'is_active',
        'items_lost',
        'items_found',
        'items_recovered',
        'items_returned',
        'email_verified_at',
        'remember_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'items_lost' => 'integer',
            'items_found' => 'integer',
            'items_recovered' => 'integer',
            'items_returned' => 'integer',
            'password' => 'hashed',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'posted_by');
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class, 'claimer_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    public function getInitialsAttribute(): string
    {
        $parts = preg_split('/\s+/', trim($this->name), -1, PREG_SPLIT_NO_EMPTY);

        if (empty($parts)) {
            return '';
        }

        $first = mb_substr($parts[0], 0, 1);
        $last = count($parts) > 1 ? mb_substr($parts[count($parts) - 1], 0, 1) : '';

        return mb_strtoupper($first.$last);
    }
}
