@extends('layouts.profile')

@section('content')
    <div class="container py-4">
        <a href="{{ route('profile.index') }}" class="btn btn-sm btn-outline-secondary mb-3">
            ← Назад к списку
        </a>

        <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
            <!-- Фото -->
            @if($listing->photos->isNotEmpty())
                <img src="{{ asset($listing->photos->first()->url) }}"
                     class="w-100"
                     alt="Фото недвижимости"
                     style="max-height:400px;object-fit:cover;">
            @else
                <img src="{{ asset('images/no-photo.jpg') }}"
                     class="w-100"
                     alt="Нет фото"
                     style="max-height:400px;object-fit:cover;">
            @endif

            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h3 class="fw-bold text-success mb-0">
                        {{ number_format($listing->price_base, 0, ',', ' ') }} ₸
                    </h3>
                    <span class="badge
                    @if($listing->moderation == 'approved') bg-success
                    @elseif($listing->moderation == 'pending') bg-warning text-dark
                    @else bg-danger @endif">
                    {{ ucfirst($listing->moderation) }}
                </span>
                </div>

                <h5 class="fw-semibold mb-2">{{ $listing->type->name ?? '—' }}</h5>
                <p class="text-muted mb-3">
                    <i class="bi bi-geo-alt"></i>
                    {{ $listing->region->name ?? '' }},
                    {{ $listing->city->name ?? '' }},
                    {{ $listing->district->name ?? '' }}
                </p>

                <div class="d-flex flex-wrap text-muted small mb-4">
                    <div class="me-3"><i class="bi bi-door-closed"></i> Комнат: {{ $listing->rooms }}</div>
                    <div class="me-3"><i class="bi bi-house-door"></i> Площадь: {{ $listing->area }} м²</div>
                </div>

                <p class="text-dark lh-base">{{ $listing->description }}</p>
            </div>

            @if($listing->photos->count() > 1)
                <div class="px-4 pb-4">
                    <div class="row g-2">
                        @foreach($listing->photos->skip(1) as $photo)
                            <div class="col-6 col-md-4">
                                <img src="{{ asset($photo->url) }}"
                                     class="rounded-3 w-100"
                                     style="height:250px;object-fit:cover;"
                                     alt="Фото объявления">
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            <div class="card-footer bg-white border-top text-end">
                <a href="{{ route('profile.edit', $listing->id) }}" class="btn btn-outline-primary btn-sm me-2">
                    <i class="bi bi-pencil"></i> Редактировать
                </a>
                <form action="{{ route('profile.destroy', $listing->id) }}"
                      method="POST"
                      class="d-inline"
                      onsubmit="return confirm('Удалить объявление?')">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-outline-danger btn-sm">
                        <i class="bi bi-trash"></i> Удалить
                    </button>
                </form>
            </div>
        </div>
    </div>
@endsection
