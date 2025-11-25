<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\{Role, User, City, District, Type, Listing};

class ListingFactorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 🔹 Базовые справочники
        $roles = ['buyer', 'seller', 'dashboard'];
        foreach ($roles as $r) {
            Role::firstOrCreate(['name' => $r]);
        }
        $cities = ['Алматы', 'Астана', 'Шымкент', 'Актобе', 'Караганда'];
        foreach ($cities as $c) {
            City::firstOrCreate(['name' => $c]);
        }
        foreach (City::all() as $city) {
            for ($i = 1; $i <= 3; $i++) {
                $city->districts()->firstOrCreate(['name' => "Район {$i}"]);
            }
        }
        $types = ['Квартира', 'Дом', 'Участок', 'Коммерческая', 'Офис'];
        foreach ($types as $t) {
            Type::firstOrCreate(['name' => $t]);
        }

        // 🔹 10 пользователей
        \App\Models\User::factory(10)->create();

        // 🔹 30 объявлений
        \App\Models\Listing::factory(30)->create();

        $this->command->info('✅ Добавлено: 10 пользователей, 30 объявлений, 5 городов.');
    }
}
