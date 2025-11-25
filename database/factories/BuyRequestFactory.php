<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\District;
use App\Models\Type;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BuyRequest>
 */
class BuyRequestFactory extends Factory
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
            'area_min' => $this->faker->numberBetween(40, 80),
            'area_max' => $this->faker->numberBetween(80, 150),
            'rooms_min' => $this->faker->numberBetween(1, 3),
            'rooms_max' => $this->faker->numberBetween(3, 5),
            'budget_current' => $this->faker->numberBetween(15_000_000, 80_000_000),
            'budget_base' => $this->faker->numberBetween(20_000_000, 90_000_000),
            'description' => $this->faker->sentence(8),
        ];
    }
}
