const request = require('request-promise');
const fs = require('fs');

const debug = process.env.NODE_ENV === 'development';

let token;
loadToken();

function log() {
    const args = Array.prototype.slice.call(arguments);
    args.unshift("Omega: ");
    if (debug) console.log.apply(null, args);
}

function requestToken() {
    log('Requesting new token...');
    return request({
        method: 'POST',
        url: 'http://api.omega-auto.biz/api/v1.0/accounts/login',
        json: {"Username":"","Password":"","Captcha":null}
    }).then(function (res) {
        log('Token recieved.', res.token);
        fs.writeFile(__dirname + '/token', res.token); // Save token to file
        return res.token;
    });
}

function loadToken() {
    fs.readFile(__dirname + '/token', 'utf8', function (err, data) {
        if (err) {
            log('Loading token error ', err.message);
            return requestToken().then(function (res) {
                token = res;
            });
        }
        log('Token loaded', data);
        token = data;
    });
}

async function makeRequest(param) {
    try {
        return await request(param);
    } catch(e) {
        if (e.statusCode === 401) {
            log('Authorization error. Requesting new token...');
            await requestToken();
            return await request(param);
        } else {
            log(e);
            throw e;
        }
    }
}

function search(searchString) {
    return makeRequest({
        url: 'http://api.omega-auto.biz/api/v1.0/search/simplepaged',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.98 Safari/537.36',
            'Host': 'api.omega-auto.biz',
            'Origin': 'http://new.omega-auto.biz'
        },
        json: {"SearchPhrase":searchString,"CarTypes":[],"CarModels":[],"CarTypesOptic":[],"CarModelsOptic":[],"ProductLines":[],"CartManufacturers":[],"FormFactor":2,"Rest":0,"CodeString":"","CodeOperation":0,"CardString":"","CardOperation":0,"CrossCodeString":"","CrossCodeOperation":0,"DescriptionString":"","DescriptionOperation":0,"isSelected":false,"SortOrder":1,"SortField":"","From":0,"Count":100,"Mode":1,"Id":0}
    })
}

async function requestPrices(articles) {
    return makeRequest({
        url: 'http://api.omega-auto.biz/api/v1.0/client/prices',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.98 Safari/537.36',
            'Host': 'api.omega-auto.biz',
            'Origin': 'http://new.omega-auto.biz'
        },
        json: {articles: articles}
    })
}

module.exports = async function (searchString) {
    log('Searching', searchString);
    let searchResponse = await search(searchString);

    log(searchResponse.Result.length, ' search results');
    const articles = searchResponse.Result.map(item => item.Id);

    const pricesResponse = await requestPrices(articles);

    let prices = [];
    if (pricesResponse.prices && pricesResponse.prices.length) {
        log(pricesResponse.prices.length, ' prices loaded');
        prices = pricesResponse.prices
    } else {
        log('No prices loaded. Response: ', pricesResponse);
    }

    const result = {};

    result.data = searchResponse.Result.map(item =>
        {
            const price = prices. find(price => price.articleid === item.Id);
            return {
                id: item.Number,
                description: item.Description,
                price: price && price.customerprice || '-',
                brand: item.BrandDescription
            }
        }
    );

    result.status = 'ok';

    return result;
};

