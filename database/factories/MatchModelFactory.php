<?php

namespace Database\Factories;

use App\Models\Listing;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MatchModel>
 */
class MatchModelFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'listing_id' => Listing::inRandomOrder()->value('id') ?? 1,
            'request_id' => BuyRequestFactory::inRandomOrder()->value('id') ?? 1,
            'status' => 'open',
            'created_at' => now(),
        ];
    }
}
