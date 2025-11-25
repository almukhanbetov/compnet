<?php

namespace App\Http\Controllers;
use App\Http\Requests\ListingStoreRequest;
use App\Models\Listing;
use App\Services\ListingService;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ListingController extends Controller
{

    public function __construct(private ListingService $service) {}
//    public function create()
//    {
//        // данные ($cities, $districts, $types) подмешает провайдер
//        return view('listings.create');
//    }
    public function create()
    {
        $types = \App\Models\Type::all();
        $cities = \App\Models\City::all();
        $districts = \App\Models\District::all();

        return view('listings.create', compact('types', 'cities', 'districts'));
    }
    public function index()
    {
        $listings = Listing::where('user_id', Auth::id())->with('photos')->latest()->get();
        return view('profile.index', compact('listings'));
    }
    public function store(ListingStoreRequest $request)
    {
        $data = $request->validated();
        // ✅ Создаём объявление
        $listing = Listing::create([
            'user_id'       => Auth::id(),
            'type_id'       => $data['type_id'],
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
        $listing = Listing::findOrFail($id);
        return view('listings.show', compact('listing'));
    }
    public function ajaxSearch(Request $request)
    {
        $query = Listing::with(['photos', 'city', 'district', 'type', 'user']);

        if ($request->filled('type_id')) {
            $query->where('type_id', $request->type_id);
        }
        if ($request->filled('city_id')) {
            $query->where('city_id', $request->city_id);
        }
        if ($request->filled('district_id')) {
            $query->where('district_id', $request->district_id);
        }
        if ($request->filled('rooms')) {
            $query->where('rooms', $request->rooms);
        }
        if ($request->filled('area_min')) {
            $query->where('area', '>=', $request->area_min);
        }
        if ($request->filled('area_max')) {
            $query->where('area', '<=', $request->area_max);
        }
        if ($request->filled('price_min')) {
            $query->where('price_current', '>=', $request->price_min);
        }
        if ($request->filled('price_max')) {
            $query->where('price_current', '<=', $request->price_max);
        }

        $listings = $query->latest()->take(50)->get();

        // Возвращаем HTML карточек, чтобы заменить контейнер на фронтенде
        return view('components.listings-grid', compact('listings'))->render();
    }

}
