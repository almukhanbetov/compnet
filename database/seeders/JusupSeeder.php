<?php

namespace Database\Seeders;

use App\Models\{
    Region,
    City,
    District,
    Type,
    User,
    Listing,
    BuyRequest,
    MatchModel,
    Notification,
    Role,
    Photo
};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class JusupSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Начинается полное заполнение тестовыми данными...');

        // === 1️⃣ Роли ===
        foreach (['buyer', 'seller', 'admin'] as $r) {
            Role::firstOrCreate(['name' => $r]);
        }

        // === 2️⃣ Регионы ===
        $regions = [
            'Акмолинская',
            'Алматинская',
            'Карагандинская',
            'Костанайская',
            'Мангистауская',
            'Жамбылская',
            'Туркестанская',
        ];

        foreach ($regions as $name) {
            Region::firstOrCreate([
                'name' => $name,
                'slug' => Str::slug($name),
            ]);
        }

        // === 3️⃣ Города и районы ===
        $cities = [
            ['name' => 'Алматы', 'region_id' => 2],
            ['name' => 'Астана', 'region_id' => 1],
            ['name' => 'Шымкент', 'region_id' => 7],
            ['name' => 'Актобе', 'region_id' => 5],
            ['name' => 'Караганда', 'region_id' => 3],
        ];

        foreach ($cities as $c) {
            $city = City::firstOrCreate([
                'name' => $c['name'],
                'region_id' => $c['region_id'],
            ]);

            for ($i = 1; $i <= 3; $i++) {
                District::firstOrCreate([
                    'city_id' => $city->id,
                    'name' => "Район {$i} {$city->name}",
                ]);
            }
        }

        // === 4️⃣ Типы недвижимости ===
        foreach (['Квартира', 'Дом', 'Участок', 'Коммерческая', 'Офис'] as $type) {
            Type::firstOrCreate(['name' => $type]);
        }

        // === 5️⃣ Пользователи ===
        $users = User::factory(10)->create();

        // === 6️⃣ Объявления ===
        $regionIds   = Region::pluck('id');
        $cityIds     = City::pluck('id');
        $districtIds = District::pluck('id');
        $typeIds     = Type::pluck('id');

        Listing::factory(50)->create([
            'region_id'   => fn() => $regionIds->random(),
            'city_id'     => fn() => $cityIds->random(),
            'district_id' => fn() => $districtIds->random(),
            'type_id'     => fn() => $typeIds->random(),
            'user_id'     => fn() => $users->random()->id,
            'moderation'  => 'одобрено',
        ]);

        $this->command->info('🏘 Объявления созданы (50 шт, статус: одобрено).');

        // === 7️⃣ Заявки покупателей ===
        BuyRequest::factory(30)->create();

        // === 8️⃣ Совпадения ===
        $listings = Listing::all();
        $requests = BuyRequest::all();

        foreach ($listings as $listing) {
            foreach ($requests->random(min(3, $requests->count())) as $request) {
                if (
                    $listing->city_id === $request->city_id &&
                    $listing->price_current <= $request->budget_current
                ) {
                    MatchModel::firstOrCreate([
                        'listing_id' => $listing->id,
                        'request_id' => $request->id,
                    ], ['status' => 'активен']);
                }
            }
        }

        $this->command->info('🔗 Совпадения (matches) успешно созданы.');

        // === 9️⃣ Уведомления ===
        Notification::factory(20)->create();
        $this->command->info('🔔 Уведомления созданы (20 шт).');

        // === 🔟 Фото объявлений ===
        $this->seedPhotos($listings);

        // === 🧑‍💼 Администратор ===
        $adminRole = Role::where('name', 'admin')->first();

        User::firstOrCreate(
            ['phone' => '7077801011'],
            [
                'name' => 'Администратор',
                'email' => null,
                'password' => bcrypt('Zxcvbnm123'),
                'role_id' => $adminRole?->id,
            ]
        );

        $this->command->info('👨‍💼 Администратор создан: роль admin, тел: +7 (707) 780-10-11, пароль: Zxcvbnm123');
        $this->command->info('🎉 Все тестовые данные успешно добавлены!');
    }

    private function seedPhotos($listings): void
    {
        $this->command->info('🖼 Добавляем фотографии к объявлениям...');

        // Проверим наличие папки
        $sourceDir = public_path('sample-images');
        $targetDir = storage_path('app/public/uploads/listings');
        Storage::makeDirectory('public/uploads/listings');

        // Проверим, есть ли исходные изображения
        if (!File::isDirectory($sourceDir)) {
            File::makeDirectory($sourceDir, 0755, true);
            $this->command->warn("⚠️ Папка sample-images пуста. Добавьте туда реальные фото (house1.jpg, house2.jpg и т.д.)");
        }

        $files = File::files($sourceDir);
        if (empty($files)) {
            // Создадим пустые заглушки
            for ($i = 1; $i <= 5; $i++) {
                file_put_contents("{$sourceDir}/house{$i}.jpg", 'FAKE IMAGE CONTENT');
            }
            $files = File::files($sourceDir);
        }

        // Копируем файлы в storage и создаём Photo записи
        foreach ($listings as $listing) {
            $count = rand(1, 5);
            for ($i = 0; $i < $count; $i++) {
                $file = $files[array_rand($files)];
                $filename = Str::random(8) . '_' . basename($file);
                File::copy($file, "{$targetDir}/{$filename}");

                Photo::create([
                    'listing_id' => $listing->id,
                    'url' => "storage/uploads/listings/{$filename}",
                ]);
            }
        }

        $this->command->info('📸 Фото добавлены к каждому объявлению (1–5 шт).');
    }
}
