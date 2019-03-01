var http = require('http');
var async = require('async');

var requests = [];

// Build a large list of requests:
for (i = 0; i < 500; i++) {
    requests.push(function (callback) {
        http.request({
            host: '127.0.0.1',
            path: '/apifortest?name=Germany&email=mrs.parasca%40gmail.com'
        }, function (res) {
            callback(null, res.statusCode);
        }).end()
    });
}

async.parallelLimit(requests, 50, function (err, results) {
    // console.log(JSON.stringify(results));
});
