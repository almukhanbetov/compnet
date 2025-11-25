<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuyRequest extends Model
{
//    public $timestamps = false;
    use HasFactory; // ✅ обязательно
    protected $fillable = [
        'user_id', 'city_id', 'district_id', 'type_id',
        'area_min', 'area_max', 'rooms_min', 'rooms_max',
        'budget_current', 'budget_base', 'description'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function type()
    {
        return $this->belongsTo(Type::class);
    }

    public function matches()
    {
        return $this->hasMany(MatchModel::class, 'request_id');
    }
}
