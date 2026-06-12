<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use SoftDeletes;

    protected $table = 'items';

    public const STATUS_AWAITING_APPROVAL = 'awaiting_approval';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_CLAIM_IN_PROGRESS = 'claim_in_progress';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_AWAITING_APPROVAL,
        self::STATUS_ACTIVE,
        self::STATUS_CLAIM_IN_PROGRESS,
        self::STATUS_RESOLVED,
        self::STATUS_REJECTED,
    ];

    public const PUBLIC_STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_CLAIM_IN_PROGRESS,
        self::STATUS_RESOLVED,
    ];

    protected $fillable = [
        'type',
        'title',
        'description',
        'category_id',
        'color',
        'brand_model',
        'location',
        'specific_spot',
        'lost_found_date',
        'lost_found_time',
        'current_location',
        'status',
        'posted_by',
        'view_count',
        'is_approved',
        'admin_note',
        'display_id',
    ];

    protected $appends = ['display_id'];

    protected function casts(): array
    {
        return [
            'lost_found_date' => 'date',
            'is_approved' => 'boolean',
            'view_count' => 'integer',
        ];
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ItemImage::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(ItemTag::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class);
    }

    public static function generateDisplayId(string $type): string
    {
        $prefix = $type === 'lost' ? 'L' : 'F';
        $year = date('Y');
        $count = static::where('type', $type)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return $prefix.'-'.$year.'-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    protected function displayId(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: function (mixed $value, array $attributes) {
                if (!empty($attributes['display_id'])) {
                    return $attributes['display_id'];
                }
                return str_pad((string) ($attributes['id'] ?? 0), 4, '0', STR_PAD_LEFT);
            }
        );
    }
}
