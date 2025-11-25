<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class District extends Model
{
//    public $timestamps = false;
    protected $fillable = ['city_id', 'name'];
    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function listings()
    {
        return $this->hasMany(Listing::class);
    }

    public function buyRequests()
    {
        return $this->hasMany(BuyRequest::class);
    }
}
