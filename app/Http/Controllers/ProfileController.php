<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListingStoreRequest;
use App\Http\Requests\ProfileListingRequest;
use App\Http\Requests\ProfileUpdateRequest;
use App\Models\City;
use App\Models\District;
use App\Models\Listing;
use App\Models\Photo;
use App\Models\Region;
use App\Models\Type;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\View\View;
use Illuminate\Support\Facades\Storage;


class ProfileController extends Controller
{
    public function index(): View
    {
        $user = auth()->user();

        $listings = Listing::query()
            ->where('user_id', $user->id)
            ->with(['city','district','type'])
            ->latest()
            ->paginate(12);
        return view('profile.index', [
            'user' => $user,
            'listings'=>$listings,
        ]);
    }
    public function create()
    {
        return view('profile.create', [
            'regions'=> Region::all(),
            'cities' => City::all(),
            'districts' => District::all(),
            'types' => Type::all(),
        ]);
    }
    public function store(ProfileListingRequest $request)
    {
        $data = $request->validated();
        // ✅ Создаём объявление
        $user_id = auth()->user()->id;

        $listing = Listing::create([
            'user_id'       => $user_id,
            'type_id'       => $data['type_id'],
            'region_id'     => $data['region_id'],
            'city_id'       => $data['city_id'],
            'district_id'   => $data['district_id'],
            'area'          => $data['area'],
            'rooms'         => $data['rooms'],
            'price_base'    => $data['price_base'],
            'price_current' => $data['price_base'],
            'description'   => $data['description'],
            'moderation'    => 'pending', // Можно менять на approved после модерации
        ]);

        // ✅ Если есть фото — сохраняем
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('uploads/listings', 'public');
                $listing->photos()->create([
                    'url' => '/storage/' . $path
                ]);
            }
        }
        // ✅ Возврат с сообщением об успехе
        return redirect()
            ->route('profile.index')
            ->with('success', 'Объявление успешно добавлено!');
    }
    public function show($id)
    {
        $user_id = auth()->user()->id;

        $listing = Listing::with(['region', 'city', 'district', 'type', 'photos'])
            ->where('id', $id)
            ->where('user_id', $user_id) // показываем только свои объявления
            ->firstOrFail();


        return view('profile.show', compact('listing'));
    }
    public function edit($id)
    {
        $user_id = auth()->user()->id;

        $listing = Listing::with(['region', 'city', 'district', 'type', 'photos'])
            ->where('id', $id)
            ->where('user_id', $user_id)
            ->firstOrFail();

        // Передаем данные в форму
        $regions = Region::all();
        $cities = City::all();
        $districts = District::all();
        $types = Type::all();

        return view('profile.edit', compact('listing', 'regions', 'cities', 'districts', 'types'));
    }
    public function update(ProfileUpdateRequest $request, $id)
    {
        $user_id = auth()->user()->id;
        $listing = Listing::where('id', $id)
            ->where('user_id', $user_id)
            ->firstOrFail();

        $validated = $request->validated();


        $listing->update([
            'region_id' => $validated['region_id'],
            'city_id' => $validated['city_id'],
            'district_id' => $validated['district_id'],
            'type_id' => $validated['type_id'],
            'area' => $validated['area'],
            'rooms' => $validated['rooms'],
            'price_base' => $validated['price_base'],
            'price_current' => $validated['price_base'],
            'description' => $validated['description'],
            'moderation' => 'pending',
        ]);

        // Обработка фото
        if ($request->hasFile('photos')) {
            foreach ($listing->photos as $oldPhoto) {
                $filePath = str_replace('storage/', 'public/', $oldPhoto->url);
                if (Storage::exists($filePath)) {
                    Storage::delete($filePath);
                }
                $oldPhoto->delete();
            }

            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('uploads/listings', 'public');
                $listing->photos()->create(['url' => 'storage/' . $path]);
            }
        }

        return redirect()->route('profile.index')->with('success', 'Объявление обновлено');
    }

    public function destroy($id)
    {
        $userId = auth()->user()->id;


        // Находим объявление, принадлежащее текущему пользователю
        $listing = Listing::where('id', $id)
            ->where('user_id', $userId)
            ->with('photos')
            ->firstOrFail();

        // Удаляем все фотографии из хранилища
        foreach ($listing->photos as $photo) {
            $filePath = str_replace('storage/', 'public/', $photo->url);
            if (Storage::exists($filePath)) {
                Storage::delete($filePath);
            }
            $photo->delete();
        }

        // Удаляем само объявление
        $listing->delete();

        // Возвращаем пользователя обратно со всплывающим сообщением
        return redirect()
            ->route('profile.index')
            ->with('success', 'Объявление успешно удалено.');
    }


    public function deletePhoto($photoId)
    {
        dd($photoId);
        $photo = Photo::findOrFail($photoId);
        dd($photo);


        $listing = Listing::findOrFail($photoId);
        dd($listing->photos);
        $photo = Photo::findOrFail($photoId);
        dd($photo);

        // Проверяем, что это фото действительно принадлежит пользователю
        if ($photo->listing->user_id !== auth()->user()->id) {
            abort(403, 'Нет доступа для удаления этого фото');
        }

        // Удаляем файл из хранилища
        $filePath = str_replace('storage/', 'public/', $photo->url);
        if (Storage::exists($filePath)) {
            Storage::delete($filePath);
        }

        // Удаляем запись из БД
        $photo->delete();

        return response()->json(['success' => true]);
    }

}
