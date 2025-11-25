<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
            return [
                'region_id' => 'required|exists:regions,id',
                'city_id' => 'required|exists:cities,id',
                'district_id' => 'required|exists:districts,id',
                'type_id' => 'required|exists:types,id',
                'area' => 'required|numeric|min:1',
                'rooms' => 'required|integer|min:1',
                'price_base' => 'required|numeric|min:0',
                'description' => 'required|string|max:5000',
                'photos.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            ];

    }
    public function messages(): array
    {
        return [
            'region_id.required' => 'Выберите регион',
            'region_id.exists' => 'Указанный регион не найден',

            'city_id.required' => 'Выберите город',
            'city_id.exists' => 'Указанный город не найден',

            'district_id.required' => 'Выберите район',
            'district_id.exists' => 'Указанный район не найден',

            'type_id.required' => 'Выберите тип недвижимости',
            'type_id.exists' => 'Указанный тип не найден',

            'area.required' => 'Укажите площадь объекта',
            'rooms.required' => 'Укажите количество комнат',
            'price_base.required' => 'Укажите цену',
            'description.required' => 'Добавьте описание',
            'photos.*.image' => 'Каждый файл должен быть изображением',
            'photos.*.max' => 'Размер фото не должен превышать 4 МБ',
        ];
    }
}
