const http = require('http');
const url = require('url');
const db = require('./db.js');
const hostname = '127.0.0.1';
const port = 80

const server = http.createServer(handleRequest);
server.listen(port, hostname, () => {
    console.log('Server stared on port: ' + port);
});

function handleRequest(req, res) {
    const queryData = url.parse(req.url, true).query;
    const route = req.url.split("?")[0];
    const method = req.method;

    if (req.headers['content-type'] !== undefined && req.headers['content-type'] !== 'text/plain') {
        writeResponse(res, JSON.stringify({ message: "Unknown content type" }), 415, "application/json")
    } else if (method == 'GET') {
        handleGetRequest(res, route);
    } else if (method == 'POST') {
        handlePostRequest(res, route);
    } else if (method == 'PUT') {
        handlePutRequest(res, route);
    } else if (method == 'DELETE') {
        handleDeleteRequest(res, route);
    }
}

function executeMysqlQuery(query, callback) {
    db.query(query, function (err, result) {
        return callback(err, result);
    });
}

function writeResponse(res, body, statusCode, contentType) {
    res.writeHead(statusCode, { "Content-Type": contentType});
    res.write(body);
    res.end();
}

function sendResponseForGetRequest(res, query, firstValue = false) {
    executeMysqlQuery(query,
        (err, result) => {
            var body = null;
            if (err) {
                writeResponse(res, JSON.stringify({ message: "Wrong data" }), 400, "application/json");
                return;
            }

            if (firstValue) {
                body = JSON.stringify(result[0]);
            } else {
                body = JSON.stringify(result);
            }

            if (result.length == 0) {
                writeResponse(res, "", 204, "application/json");
            } else {
                writeResponse(res, body, 200, "application/json");
            } 
        })
}

function postToDb(res, query, statusCode = 201,  errMessage = "Wrong data" ) {
    executeMysqlQuery(query, (err, result) => {
        if (err) {
            writeResponse(res, JSON.stringify({ message: errMessage }), 400, "application/json");
        } else {
            writeResponse(res, "", statusCode, "application/json");
        }
    })
}

// /user/1/transactions | /user/1/transaction/1 | /user/1/category/1 | /categories | /category/food
function handleGetRequest(res, route) {
    if (matcher = route.match(/^\/user\/(\d+)\/transactions$/)) {
        sendResponseForGetRequest(res, `SELECT * FROM restdb.transactions WHERE id_user = ${db.escape(matcher[1])}`);
    } else if (matcher = route.match(/^\/user\/(\d+)\/transactionid\/(\d+)$/)) {
        sendResponseForGetRequest(res, `SELECT * FROM restdb.transactions WHERE id_user = ${db.escape(matcher[1])} 
            AND ID = ${db.escape(matcher[2])}`, true);
    } else if (matcher = route.match(/^\/user\/(\d+)\/transactions\/category\/(\d+)$/)) {
        sendResponseForGetRequest(res, `SELECT * FROM restdb.transactions WHERE id_user = ${db.escape(matcher[1])} 
            AND ID_CATEGORY = ${db.escape(matcher[2])}`, true);
    } else if (matcher = route.match(/^\/categories$/)) {
        sendResponseForGetRequest(res, "SELECT * FROM restdb.categories");
    } else if (matcher = route.match(/^\/category\/(\w+)$/)) {
        sendResponseForGetRequest(res, `SELECT ID FROM restdb.categories WHERE name = ${db.escape(matcher[1])}`, true);
    } else if (matcher = route.match(/^\/transaction\/userid\/(\d+)\/categoryid\/(\d+)\/date\/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/)) {
        sendResponseForGetRequest(res, `SELECT * FROM restdb.transactions WHERE id_user = ${db.escape(matcher[1])} 
            AND ID_CATEGORY = ${db.escape(matcher[2])} AND DATE(transaction_date) = ${db.escape(matcher[3])}`);
    } else {
        writeResponse(res, JSON.stringify({ message: "404 Not found" }), 404, "application/json")
    }
}

// /transaction/userid/1/categoryid/1/value/100/currency/RON | /category/entertainment
function handlePostRequest(res, route) {
    if (matcher = route.match(/^\/transaction\/userid\/(\d+)\/categoryid\/(\d+)\/value\/(\d+)\/currency\/([A-Za-z]{1,3})$/)) {
        postToDb(res, `INSERT INTO restdb.transactions VALUES (null, ${db.escape(matcher[1])}, ${db.escape(matcher[2])},
            NOW(), ${db.escape(matcher[3])}, ${db.escape(matcher[4])})`);
    } else if (matcher = route.match(/^\/category\/(\w+)$/)) {
        postToDb(res, `INSERT INTO restdb.categories VALUES (null, ${db.escape(matcher[1])})`, 200, "Category already exists");
    } else if (matcher = route.match(/^\/user\/(\w+)$/)) {
        postToDb(res, `INSERT INTO restdb.users VALUES (null, ${db.escape(matcher[1])})`, 200, "User already exists");
    } else {
        writeResponse(res, JSON.stringify({ message: "404 Not found" }), 404, "application/json")
    }
}

function handlePutRequest(res, route) {
    if (matcher = route.match(/^\/transactionid\/(\d+)\/categoryid\/(\d+)\/value\/(\d+)\/currency\/([A-Za-z]{1,3})$/)) {
        postToDb(res, `UPDATE restdb.transactions SET id_category = ${db.escape(matcher[2])}, value = ${db.escape(matcher[3])},
            currency = ${db.escape(matcher[4])} WHERE id = ${db.escape(matcher[1])}`, 200);
    } else if (matcher = route.match(/^\/categoryid\/(\d+)\/name\/(\w+)$/)) {
        postToDb(res, `UPDATE restdb.categories SET name = ${db.escape(matcher[2])} WHERE id = ${db.escape(matcher[1])}`, 200);
    } else {
        writeResponse(res, JSON.stringify({ message: "404 Not found" }), 404, "application/json")
    }
}

function handleDeleteRequest(res, route) {
    if (matcher = route.match(/^\/transactionid\/(\d+)$/)) {
        postToDb(res, `DELETE FROM restdb.transactions WHERE id = ${db.escape(matcher[1])}`, 200);
    } else if (matcher = route.match(/^\/categoryid\/(\d+)$/)) {
        postToDb(res, `DELETE FROM restdb.categories WHERE id = ${db.escape(matcher[1])}`, 200);
    } else {
        writeResponse(res, JSON.stringify({ message: "404 Not found" }), 404, "application/json")
    }
}
