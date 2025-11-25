<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\District;
use App\Models\Type;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Listing>
 */
class ListingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::inRandomOrder()->value('id') ?? 1,
            'city_id' => City::inRandomOrder()->value('id') ?? 1,
            'district_id' => District::inRandomOrder()->value('id') ?? 1,
            'type_id' => Type::inRandomOrder()->value('id') ?? 1,
            'area' => $this->faker->numberBetween(40, 200),
            'rooms' => $this->faker->numberBetween(1, 5),
            'price_current' => $this->faker->numberBetween(10_000_000, 100_000_000),
            'price_base' => $this->faker->numberBetween(10_000_000, 120_000_000),
            'description' => $this->faker->sentence(8),
            'moderation' => 'approved',
        ];
    }
}
