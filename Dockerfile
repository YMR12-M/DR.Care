FROM node:20-alpine AS mobile-build
WORKDIR /build
COPY mobile-app/package*.json ./
RUN npm ci
COPY mobile-app/ ./
RUN npm run build

FROM php:8.2-apache

RUN apt-get update && apt-get install -y libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN echo "display_errors = Off\nlog_errors = On\nerror_log = /var/log/apache2/php_errors.log" \
    > /usr/local/etc/php/conf.d/production.ini

RUN a2enmod rewrite

RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' \
    /etc/apache2/apache2.conf

COPY . /var/www/html/
COPY --from=mobile-build /build/dist /var/www/html/app

RUN mkdir -p /var/www/html/data \
    && chown -R www-data:www-data /var/www/html/data \
    && chmod 755 /var/www/html/data \
    && rm -f /var/www/html/.env

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80
CMD ["/usr/local/bin/docker-entrypoint.sh"]
