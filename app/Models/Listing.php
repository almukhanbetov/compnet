<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Listing extends Model
{
    use HasFactory; // ✅ Обязательно для работы factory()
//    public $timestamps = false;
    protected $fillable = [
        'user_id', 'region_id','city_id', 'district_id', 'type_id',
        'area', 'rooms', 'price_current', 'price_base',
        'description', 'moderation'
    ];
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function region()
    {
        return $this->belongsTo(Region::class);
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
    public function photos()
    {
        return $this->hasMany(Photo::class);
    }
    public function matches()
    {
        return $this->hasMany(MatchModel::class);
    }
}
