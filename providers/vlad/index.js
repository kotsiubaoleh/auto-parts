const request = require('request-promise');
const fs = require('fs');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const debug = process.env.NODE_ENV === 'development';

const jar = request.jar();
loadToken();

function log() {
    const args = Array.prototype.slice.call(arguments);
    args.unshift("Vladislav: ");
    if (debug) console.log.apply(null, args);
}

function requestToken() {
    log('Requesting new token...');
    return request({
        method: 'POST',
        url: 'http://order.vladislav.ua/app/orders.cgi/nabj',
        form: {"act":"backjobmainautentication","psw":"","lgn":""},
        jar: jar
    }).then(function (res) {
        log('Token recieved.', jar.getCookieString("http://order.vladislav.ua"));
        fs.writeFile(__dirname + '/token', jar.getCookieString("http://order.vladislav.ua")); // Save token to file
        return res.token;
    });
}

function loadToken() {
    return new Promise(function (resolve, reject) {
        fs.readFile(__dirname + '/token','utf8', function (err, data) {
            if (err) {
                log('Token loading error ', err.message);
                return requestToken();
            }
            log('Token loaded ', data);
            jar.setCookie(data, "http://order.vladislav.ua");
        });
    });
}

function search(searchString) {
    return request({
        jar: jar,
        url: 'http://order.vladislav.ua/app/orders.cgi/abj',
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.98 Safari/537.36',
            'Host': 'order.vladislav.ua',
            'Origin': 'http://order.vladislav.ua',
            'Referer': 'http://order.vladislav.ua/app/'
        },
        form: {
            act: 'waresearch',
            waresearch: searchString,
            forfirmid:0,
            addlines: '',
            contract:'11993',
        },
        encoding: null
    }).then(body => iconv.decode(body, 'win1251'));
}

module.exports = function (searchString) {
    log('Searching', searchString);
    return search(searchString)
        .then(searchResponse => {
            if (searchResponse.match(/jqswMessageError/)  || searchResponse.match(/bjauthdiv/)) throw new Error('Authorization error');
            return searchResponse;
        })
        .catch(function (error) {
        log('Search failed', error.message);
        return requestToken()
            .then(function () {
                return search(searchString);
            }); // Token is expired. Request new token
        })
        .then(searchResponse => {
            const result = {};

            const match = searchResponse.match(/jqswfillInfo\(\"(<div.+<\/div>\")/);

           if (match) { // Narrow options
               let html = match[1];
               while (html.match(/\\(.)/)) {
                   html = html.replace(/\\(.)/, "$1");
               }

               result.status = 'narrow';
               result.data = [];

               const $ = cheerio.load(html);
               const inputs = $('#waregrouplistdiv input');

               inputs.each(function (index, input) {
                   result.data.push({value: input.attribs.value});
               });

               const labels = $('#waregrouplistdiv span');

               labels.each(function (index, label) {
                   result.data[index].text = label.children[0].data;
               });

               return result;
           }
        });


};
