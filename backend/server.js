const http = require('http');

const server = http.createServer((req, res) => {
    // Разрешаем запросы с frontend (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.url === '/api') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Привет с backend 🚀'
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Backend работает');
    }
});

server.listen(3000, () => {
    console.log('Server started on port 3000');
});