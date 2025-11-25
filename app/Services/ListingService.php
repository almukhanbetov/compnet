<?php

namespace App\Services;

use App\Models\Listing;
use App\Models\City;
use App\Models\District;
use App\Models\Region;
use App\Models\Type;

class ListingService
{
    /** Справочники для форм */
    public function dictionaries(): array
    {
        return [
            'regions'=>Region::select('id','name')->orderBy('name')->get(),
            'cities'    => City::select('id','name')->orderBy('name')->get(),
            'districts' => District::select('id','name')->orderBy('name')->get(),
            'types'     => Type::select('id','name')->orderBy('name')->get(),
            'listings' => Listing::with(['region','city','district','type','photos'])->get(),
        ];
    }
    /** Создать объявление */
    public function create(array $data): Listing
    {
        return Listing::create($data);
    }
}

