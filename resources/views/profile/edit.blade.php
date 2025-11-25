@extends("layouts.guest")
@section("content")
    <section id="hero" class="hero section">
        <div class="container" data-aos="fade-up" data-aos-delay="100">
            <div class="row align-items-start">
                <div class="col-lg-6">
                    <h2 class="mb-4 text-center">Редактировать объявление</h2>
                    @if ($errors->any())
                        <div class="alert alert-danger">
                            <strong>Ошибка:</strong> проверьте поля ниже.
                        </div>
                    @endif
                    @if (session('success'))
                        <div class="alert alert-success">{{ session('success') }}</div>
                    @endif

                    {{-- ОДНА ФОРМА --}}
                    <form action="{{ route('profile.update', $listing->id) }}" method="POST" enctype="multipart/form-data">
                        @csrf
                        @method('PUT')
                        <div class="row g-3">
                            {{-- Тип --}}
                            <div class="col-md-6">
                                <div class="form-floating">
                                    <select name="type_id" class="form-select" required>
                                        <option value="">Выберите тип</option>
                                        @foreach($types as $t)
                                            <option value="{{ $t->id }}" @selected(old('type_id', $listing->type_id) == $t->id)>
                                                {{ $t->name }}
                                            </option>
                                        @endforeach
                                    </select>
                                    <label>Тип недвижимости</label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-floating">
                                    <select name="region_id" class="form-select" required>
                                        <option value="">Выберите область</option>
                                        @foreach($regions as $region)
                                            <option value="{{ $region->id }}" @selected(old('region_id', $listing->region_id) == $region->id)>
                                                {{ $region->name }}
                                            </option>
                                        @endforeach
                                    </select>
                                    <label>Область</label>
                                </div>
                            </div>

                            {{-- Город --}}
                            <div class="col-md-6">
                                <div class="form-floating">
                                    <select name="city_id" class="form-select" required>
                                        <option value="">Выберите город</option>
                                        @foreach($cities as $c)
                                            <option value="{{ $c->id }}" @selected(old('city_id', $listing->city_id) == $c->id)>
                                                {{ $c->name }}
                                            </option>
                                        @endforeach
                                    </select>
                                    <label>Город</label>
                                </div>
                            </div>

                            {{-- Район --}}
                            <div class="col-md-6">
                                <div class="form-floating">
                                    <select name="district_id" class="form-select" required>
                                        <option value="">Выберите район</option>
                                        @foreach($districts as $d)
                                            <option value="{{ $d->id }}" @selected(old('district_id', $listing->district_id) == $d->id)>
                                                {{ $d->name }}
                                            </option>
                                        @endforeach
                                    </select>
                                    <label>Район</label>
                                </div>
                            </div>

                            {{-- Площадь, комнаты, цена --}}
                            <div class="col-md-6">
                                <div class="form-floating">
                                    <input type="number" step="0.1" name="area" class="form-control" value="{{ $listing->area }}" required>
                                    <label>Площадь (м²)</label>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="form-floating">
                                    <input type="number" name="rooms" class="form-control" value="{{ $listing->rooms }}" required>
                                    <label>Комнат</label>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="form-floating">
                                    <input type="number" name="price_base" class="form-control" value="{{ $listing->price_base }}" required>
                                    <label>Цена в тенге</label>
                                </div>
                            </div>

                            {{-- Описание --}}
                            <div class="col-12">
                                <div class="form-floating">
                                    <textarea class="form-control" name="description" placeholder="Описание">{{ $listing->description }}</textarea>
                                    <label>Описание</label>
                                </div>
                            </div>

                            {{-- Фото --}}
                            <div class="col-12">
                                <label class="form-label">Фотографии объекта</label>
                                <input type="file" name="photos[]" multiple class="form-control" accept="image/*">
                                <small class="text-muted">Можно выбрать сразу несколько изображений (до 4 МБ каждое)</small>
                            </div>

                            {{-- Кнопка сохранения --}}
                            <div class="col-12 mt-3">
                                <button type="submit" class="btn btn-success w-100">
                                    💾 Сохранить изменения
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {{-- Правая колонка: просмотр фото --}}
                <div class="col-lg-6">
                    <h4 class="mb-3">Текущие фото</h4>

                    @if($listing->photos->count())
                        <div class="row g-3">
                            @foreach($listing->photos as $photo)
                                <div class="col-md-6 position-relative">
                                    <img src="{{ asset($photo->url) }}" class="img-fluid rounded shadow-sm" style="object-fit:cover; height:200px; width:100%;">
                                    <form action="{{ route('profile.listings.photos.delete', [$listing->id, $photo->id]) }}" method="POST" class="position-absolute top-0 end-0 m-1">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn btn-danger btn-sm px-2 py-1">✕</button>
                                    </form>
                                </div>
                            @endforeach
                        </div>
                    @else
                        <p class="text-muted">Фотографии пока не добавлены.</p>
                    @endif
                </div>
            </div>
        </div>
    </section>

@endsection
