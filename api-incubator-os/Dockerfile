FROM php:8.1-apache

# Install necessary extensions
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev && \
    docker-php-ext-install pdo_mysql

# Enable mod_rewrite
RUN a2enmod rewrite

# Restart Apache in foreground
CMD ["apache2-foreground"]
