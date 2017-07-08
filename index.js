const express = require('express');
const omega = require('./providers/omega');
const vlad = require('./providers/vlad');
const app = express();

// app.get('/', function (req, res) {
//     res.send('Hello World!')
// });

app.use(express.static('public'));

app.get('/search/:item', function (req, res, next) {
    omega(req.params.item)
        .then(result => res.json(result));
});

app.listen(3001, function () {
    console.log('listening on port 3001!')
});