<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    protected $table = 'items';

    public const STATUS_AWAITING_APPROVAL = 'awaiting_approval';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_CLAIM_IN_PROGRESS = 'claim_in_progress';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_AWAITING_APPROVAL,
        self::STATUS_ACTIVE,
        self::STATUS_CLAIM_IN_PROGRESS,
        self::STATUS_RESOLVED,
        self::STATUS_CLOSED,
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
        'reference_id',
    ];

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

    public static function generateReferenceId(string $type): string
    {
        $prefix = $type === 'lost' ? 'LF' : 'FF';
        $year = date('Y');
        $count = static::where('type', $type)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return $prefix.'-'.$year.'-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }
}
