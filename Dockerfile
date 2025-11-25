FROM node:22 AS vite-builder
WORKDIR /app
# только package.json + lock для кеша
COPY package*.json ./
RUN npm install
# копируем весь проект (кроме vendor)
COPY . .
# собираем фронтенд
RUN npm run build
# -------------------------------------------------------
# 2) PHP Stage — Laravel backend
# -------------------------------------------------------
FROM php:8.3-fpm
# системные пакеты
RUN apt-get update && apt-get install -y \
    nano git zip unzip libpq-dev \
    libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    default-mysql-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql gd \
    && rm -rf /var/lib/apt/lists/*

# composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# копируем Laravel
COPY . .

# копируем собранный Vite build
COPY --from=vite-builder /app/public/build ./public/build

# устанавливаем PHP пакеты
RUN composer install --no-dev --optimize-autoloader \
    && php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear \
    && chmod -R 777 storage bootstrap/cache

CMD ["php-fpm"]
