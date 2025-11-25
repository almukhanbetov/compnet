<div class="alert alert-info">
    cities: {{ isset($cities) ? $cities->count() : '—' }},
    districts: {{ isset($districts) ? $districts->count() : '—' }},
    types: {{ isset($types) ? $types->count() : '—' }}
</div>
