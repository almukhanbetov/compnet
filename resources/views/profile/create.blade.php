@extends("layouts.profile")
@section('content')
    <div class="container py-4">
        <h2 class="fw-semibold mb-4" style="color:#163f3c;">Добавить объявление</h2>
        @if ($errors->any())
            <div class="alert alert-danger small py-2 px-3">
                <strong>Ошибка:</strong> проверьте поля ниже.
            </div>
        @endif
        @if (session('success'))
            <div class="alert alert-success small py-2 px-3">{{ session('success') }}</div>
        @endif
        <div class="card shadow-sm border-0 rounded-4 p-4">
            <form method="POST" action="{{ route('profile.store') }}" enctype="multipart/form-data">
                @csrf

                <div class="row g-3">
                    <!-- Тип недвижимости -->
                    <div class="col-md-6">
                        <label class="form-label small fw-medium text-secondary mb-1">Тип недвижимости</label>
                        <select name="type_id"  class="form-select form-select-sm rounded-3 border border-success-subtle">
                            <option value="">Выберите тип</option>
                            @foreach($types as $type)
                                <option value="{{ $type->id }}" @selected(old('$type_id')==$type->id)>
                                    {{ $type->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('type_id')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Область -->
                    <div class="col-md-6">
                        <label class="form-label small fw-medium text-secondary mb-1">Область</label>
                        <select name="region_id" class="form-select form-select-sm rounded-3 border border-success-subtle">
                            <option value="">Выберите область</option>
                            @foreach($regions as $region)
                                <option value="{{ $region->id }}" @selected(old('region_id')==$region->id)>
                                    {{ $region->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('region_id')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Город -->
                    <div class="col-md-6">
                        <label class="form-label small fw-medium text-secondary mb-1">Город</label>
                        <select name="city_id" class="form-select form-select-sm rounded-3 border border-success-subtle">
                            <option value="">Выберите город</option>
                            @foreach($cities as $city)
                                <option value="{{ $city->id }}" @selected(old('city_id')==$city->id)>
                                    {{ $city->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('city_id')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Район -->
                    <div class="col-md-6">
                        <label class="form-label small fw-medium text-secondary mb-1">Район</label>
                        <select name="district_id" class="form-select form-select-sm rounded-3 border border-success-subtle">
                            <option value="">Выберите район</option>
                            @foreach($districts as $district)
                                <option value="{{ $district->id }}" @selected(old('district_id')==$district->id)>
                                    {{ $district->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('region_id')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Площадь -->
                    <div class="col-md-4">
                        <label class="form-label small fw-medium text-secondary mb-1">Площадь (м²)</label>
                        <input type="number" name="area" value="{{old("area")}}" class="form-control form-control-sm rounded-3 border border-success-subtle">
                        @error('area')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Комнаты -->
                    <div class="col-md-4">
                        <label class="form-label small fw-medium text-secondary mb-1">Комнат</label>
                        <input type="number" name="rooms" value="{{old("rooms")}}" class="form-control form-control-sm rounded-3 border border-success-subtle">
                        @error('rooms')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Цена -->
                    <div class="col-md-4">
                        <label class="form-label small fw-medium text-secondary mb-1">Цена (₸)</label>
                        <input type="number" name="price_base" value="{{old("price_base")}}" class="form-control form-control-sm rounded-3 border border-success-subtle">
                        @error('price_base')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Описание -->
                    <div class="col-12">
                        <label class="form-label small fw-medium text-secondary mb-1">Описание</label>
                        <textarea name="description" rows="3" class="form-control form-control-sm rounded-3 border border-success-subtle" placeholder="Введите краткое описание...">{{old("description")}}</textarea>
                        @error('description')
                        <div class="invalid-feedback d-block small text-danger mt-1">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <!-- Фото -->
                    <div class="col-12">
                        <label class="form-label small fw-medium text-secondary mb-1">Фотографии</label>

                        <input type="file"
                               id="photoInput"
                               name="photos[]"
                               multiple
                               accept="image/*"
                               class="form-control form-control-sm rounded-3 border border-success-subtle @error('photos') is-invalid @enderror @error('photos.*') is-invalid @enderror">

                        {{-- Ошибки для массива файлов --}}
                        @error('photos')
                        <div class="invalid-feedback d-block text-danger mt-1 small">{{ $message }}</div>
                        @enderror
                        @error('photos.*')
                        <div class="invalid-feedback d-block text-danger mt-1 small">{{ $message }}</div>
                        @enderror

                        <small class="text-muted">Можно выбрать несколько файлов</small>
                    </div>
                    <!-- Кнопка -->
                    <div class="col-12 text-end mt-3">
                        <button type="submit" class="btn btn-success px-4 py-2 rounded-3" style="background:#176c61; border:none;">
                            💾 Сохранить
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
@endsection


