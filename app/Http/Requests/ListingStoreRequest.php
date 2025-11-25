<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListingStoreRequest extends FormRequest
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
            'type_id'  => 'required|exists:types,id',
            'region_id' => 'required|exists:regions,id',
            'city_id'  => 'required|exists:cities,id',
            'district_id'  => 'required|exists:districts,id',
            'area'  => 'required|numeric|min:0',
            'rooms'  => 'required|integer|min:1',
            'price_base'  => 'required|numeric|min:0',
            'description' => 'required|string|max:5000',
            'photos.*'  => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ];
    }
    public function messages(): array
    {
        return [
            'type_id.required' => 'Выберите тип недвижимости.',
            'type_id.exists' => 'Выбранный тип не существует.',

            'region_id.required' => 'Выберите область.',
            'region_id.exists' => 'Выбранный  область не найдена.',

            'city_id.required' => 'Выберите город.',
            'city_id.exists' => 'Выбранный город не найден.',

            'district_id.required' => 'Выберите район.',
            'district_id.exists' => 'Выбранный район не найден.',

            'area.required' => 'Укажите площадь объекта.',
            'area.numeric' => 'Площадь должна быть числом.',
            'area.min' => 'Площадь не может быть отрицательной.',

            'rooms.required' => 'Введите количество комнат.',
            'rooms.integer' => 'Количество комнат должно быть целым числом.',
            'rooms.min' => 'Минимум одна комната.',

            'price_base.required' => 'Укажите цену объекта.',
            'price_base.numeric' => 'Цена должна быть числом.',
            'price_base.min' => 'Цена не может быть отрицательной.',

            'description.required' => 'Добавьте описание объекта.',
            'description.string' => 'Описание должно быть текстом.',
            'description.max' => 'Описание слишком длинное (максимум 5000 символов).',

            'photos.*.image' => 'Каждый файл должен быть изображением.',
            'photos.*.mimes' => 'Допустимые форматы: jpeg, png, jpg.',
            'photos.*.max' => 'Размер каждого изображения не должен превышать 4 МБ.',
        ];
    }
}
