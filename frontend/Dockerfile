FROM nginx:alpine

# Копируем все файлы фронтенда в нужную директорию nginx
COPY . /usr/share/nginx/html/

# Открываем порт
EXPOSE 80

# nginx запускается по умолчанию
CMD ["nginx", "-g", "daemon off;"]