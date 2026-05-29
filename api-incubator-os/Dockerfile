FROM php:8.1-apache

# Install necessary extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libcurl4-openssl-dev \
    ca-certificates && \
    docker-php-ext-install pdo_mysql curl

# Enable mod_rewrite
RUN a2enmod rewrite

# Restart Apache in foreground
CMD ["apache2-foreground"]
