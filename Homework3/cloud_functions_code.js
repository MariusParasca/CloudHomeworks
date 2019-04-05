const mysql = require('mysql');
const url = require('url');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({ 'projectId': 'cloud-week5-235308' });
const bucketName = 'httpdogs-images';
const connectionName = process.env.INSTANCE_CONNECTION_NAME || 'tranzactions';
const dbUser = process.env.SQL_USER || 'root';
const dbPassword = process.env.SQL_PASSWORD || 'notSafePassword';
const dbName = process.env.SQL_NAME || 'tranzactions_database';

const mysqlConfig = {
    connectionLimit: 1,
    user: dbUser,
    password: dbPassword,
    database: dbName,
};
if (process.env.NODE_ENV == 'production') {
    mysqlConfig.socketPath = '/cloudsql/cloud-week5-235308:europe-west1:tranzactions';
}

let mysqlPool;

function loadImage(res, statusCode) {
    var remoteFile = storage.bucket(bucketName).file(statusCode + ".jpg");
    var bufferArray = [];
    var dataLen = 0;
    new Promise((resolve, reject) => {
        remoteFile.createReadStream().on('data', (data) => {
            bufferArray.push(data);
            dataLen += data.length;
        }).on('end', () => {
            var buf = Buffer.alloc(dataLen);
            for (var i = 0, pos = 0; i < bufferArray.length; i++) {
                bufferArray[i].copy(buf, pos);
                pos += bufferArray[i].length;
            }
            resolve(buf);
        });
    }).then((imageData) => {
        res.write('<html><body><img src="data:image/jpeg;base64,');
        res.write(Buffer.from(imageData).toString('base64'));
        res.write('"/></br><pre>');
        res.end("</pre></body></html>");
    });
}

exports.handleRequest = (req, res) => {
    if (!mysqlPool) {
        mysqlPool = mysql.createPool(mysqlConfig);
    }
    const queryData = url.parse(req.url, true).query;
    const route = req.url.split("?")[0];
    const method = req.method;

    switch (method) {
        case 'GET':
            handleGetRequest(res, route);
            break;
        case 'POST':
            handlePostRequest(res, route);
            break;
        case 'PUT':
            handlePutRequest(res, route);
            break;
        case 'DELETE':
            handleDeleteRequest(res, route);
            break;
        default:
            writeResponse(res, "" + method, 400); // Bad request
            break;
    }
};

function writeResponse(res, data, statusCode) {
    res.writeHead(statusCode, { "Content-Type": 'text/html' });
    if (data != "")
        res.write(data + '\n');
    loadImage(res, statusCode);
}

function handlePutRequest(res, route) {
    if (matcher = route.match(/^\/users\/(\d+)\/([A-Za-z]{1,30})$/))
        sendResponseForPutRequest(res, 'Users', matcher[1], matcher[2]);
    else if (matcher = route.match(/^\/category\/(\d+)\/([A-Za-z]{1,30})$/))
        sendResponseForPutRequest(res, 'Category_Income', matcher[1], matcher[2]);
    else if (matcher = route.match(/^\/transactions\/(\d+)\/category\/(\d+)\/value\/(\d{1,6})\/currency\/([A-Za-z]{1,30})$/))
        sendResponseForPutRequestAtTransactions(res, matcher[1], matcher[2], matcher[3], matcher[4]);
    else
        writeResponse(res, "", 400); // Bad request
}

function handleDeleteRequest(res, route) {
    if (matcher = route.match(/^\/users\/(\d+)$/))
        sendResponseForDeleteRequest(res, 'Users', matcher[1]);
    else if (matcher = route.match(/^\/transactions\/(\d+)$/))
        sendResponseForDeleteRequest(res, 'Transactions_income', matcher[1]);
    else if (matcher = route.match(/^\/category\/(\d+)$/))
        sendResponseForDeleteRequest(res, 'Category_Income', matcher[1]);
    else
        writeResponse(res, "", 400); // Bad request
}
function sendResponseForPutRequestAtTransactions(res, trsID, catID, value, currency) {
    mysqlPool.query('SELECT 1 FROM `Transactions_income` WHERE `ID` = ' + trsID, (err, result) => {
        if (err)
            writeResponse(res, "", 500);
        else {
            if (result.length == 0)
                writeResponse(res, "Transaction not found.", 404);
            else {
                mysqlPool.query('SELECT 1 FROM `Category_Income` WHERE `ID` = ' + catID, (err, result) => {
                    if (err)
                        writeResponse(res, "", 500);
                    else {
                        if (result.length == 0)
                            writeResponse(res, "Category not found.", 404);
                        else {
                            mysqlPool.query("UPDATE `Transactions_income` SET `ID_Category` = '" + catID + "', `Value` = '" + value + "', `Currency` = '" + currency + "' WHERE `id` = " + trsID, (err, result) => {
                                if (err)
                                    writeResponse(res, "", 500);
                                else
                                    writeResponse(res, "", 202);
                            });
                        }
                    }
                });
            }
        }
    });
}
function sendResponseForPutRequest(res, table, id, name) {
    mysqlPool.query('SELECT 1 FROM `' + table + '` WHERE `ID` = ' + id, (err, result) => {
        if (err)
            writeResponse(res, "", 500);
        else {
            if (result.length == 0)
                writeResponse(res, "", 404); // Not found
            else {
                mysqlPool.query("SELECT 1 FROM `" + table + "` WHERE `Name` = '" + name + "'", (err, result) => {
                    if (err)
                        writeResponse(res, "", 500);
                    else {
                        if (result.length != 0)
                            writeResponse(res, "", 409); // Conflict
                        else {
                            mysqlPool.query("UPDATE `" + table + "` SET `Name` = '" + name + "' WHERE `ID` = " + id, (err, result) => {
                                if (err)
                                    writeResponse(res, "", 500);
                                else
                                    writeResponse(res, "", 202); // Accepted
                            });
                        }
                    }
                });
            }
        }
    });
}
function sendResponseForDeleteRequest(res, table, id) {
    mysqlPool.query('SELECT 1 FROM `' + table + '` WHERE `ID` = ' + id, (err, result) => {
        if (err)
            writeResponse(res, "" + err, 500);
        else {
            if (result.length == 0)
                writeResponse(res, "", 404);
            else {
                switch (table) {
                    case 'Users':
                        mysqlPool.query('DELETE FROM `Transactions_income` WHERE `ID_User` = ' + id, (err, result) => {
                            if (err)
                                writeResponse(res, "" + err, 500);
                            else {
                                mysqlPool.query('DELETE FROM `Users` WHERE `ID` = ' + id, (err, result) => {
                                    if (err)
                                        writeResponse(res, "" + err, 500);
                                    else
                                        writeResponse(res, "", 200);
                                });
                            }
                        });
                        break;
                    case 'Transactions_income':
                        mysqlPool.query('DELETE FROM `Transactions_income` WHERE `ID` = ' + id, (err, result) => {
                            if (err)
                                writeResponse(res, "" + err, 500);
                            else
                                writeResponse(res, "", 200);
                        });
                        break;
                    case 'Category_Income':
                        mysqlPool.query('DELETE FROM `Transactions_income` WHERE `ID_Category` = ' + id, (err, result) => {
                            if (err)
                                writeResponse(res, "" + err, 500);
                            else {
                                mysqlPool.query('DELETE FROM `Category_Income` WHERE `ID` = ' + id, (err, result) => {
                                    if (err)
                                        writeResponse(res, "" + err, 500);
                                    else
                                        writeResponse(res, "", 200);
                                });
                            }
                        });
                        break;
                }
            }
        }
    });
}
function handleGetRequest(res, route) {
    if (matcher = route.match(/^\/users\/(\d+)$/))
        sendResponseForGetRequest(res, 'SELECT `Name` FROM `Users` WHERE `ID` = ' + matcher[1]);
    else if (matcher = route.match(/^\/users\/(\d+)\/transactions$/))
        sendResponseForGetRequest(res, 'SELECT * FROM `Transactions_income` WHERE `ID_User` = ' + matcher[1]);
    else if (matcher = route.match(/^\/transactions\/(\d+)$/))
        sendResponseForGetRequest(res, 'SELECT * FROM `Transactions_income` WHERE `id` = ' + matcher[1]);
    else if (matcher = route.match(/^\/category\/(\d+)$/))
        sendResponseForGetRequest(res, 'SELECT * FROM `Category_Income` WHERE `ID` = ' + matcher[1]);
    else {
        var response = "GET: /users/{id}<br>\n" +
            "     /users/{id}/transactions<br>\n" +
            "     /transactions/{id}<br>\n" +
            "     /category/{id}<br>\n" +
            "POST: /users/name/{name}<br>\n" +
            "      /category/{name}<br>\n" +
            "      /transactions/user/{id}/category/{id}/value/{value}/currency/{currency}<br>\n" +
            "PUT: /users/{id}/{name}<br>\n" +
            "     /category/{id}/{name}<br>\n" +
            "     /transactions/{id}/category/{id}/value/{value}/currency/{currency}<br>\n" +
            "DELETE: /users/{id}<br>\n" +
            "        /transactions/{id}<br>\n" +
            "        /category/{id}<br>\n";
        writeResponse(res, response, 400); // Bad request
    }
}
function handlePostRequest(res, route) {
    if (matcher = route.match(/^\/users\/name\/([A-Za-z]{1,30})$/))
        sendResponseForPostRequest(res, "INSERT INTO `Users`(`ID`, `Name`) VALUES(NULL, '" + matcher[1] + "')", matcher[1], "Users");
    else if (matcher = route.match(/^\/category\/([A-Za-z]{1,30})$/))
        sendResponseForPostRequest(res, "INSERT INTO `Category_Income`(`ID`, `Name`) VALUES(NULL, '" + matcher[1] + "')", matcher[1], "Category_Income");
    else if (matcher = route.match(/^\/transactions\/user\/(\d+)\/category\/(\d+)\/value\/(\d+)\/currency\/([A-Z]+)$/))
        sendResponseForPostRequestAtTransactions(res, matcher[1], matcher[2], matcher[3], matcher[4]);
    else
        writeResponse(res, "", 400); // Bad request
}
function sendResponseForPostRequestAtTransactions(res, userID, categoryID, value, currency) {
    mysqlPool.query("SELECT 1 FROM `Users` WHERE `ID` = " + userID, (err, result) => {
        if (err)
            writeResponse(res, "", 500);
        else {
            if (result.length == 0)
                writeResponse(res, "", 404);
            else {
                mysqlPool.query("SELECT 1 FROM `Category_Income` WHERE `ID` = " + categoryID, (err, result) => {
                    if (err)
                        writeResponse(res, "", 500);
                    else {
                        if (result.length == 0)
                            writeResponse(res, "", 404);
                        else {
                            var date = new Date();
                            var d = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
                            query = "INSERT INTO `Transactions_income`(`id`, `ID_User`, `ID_Category`, `Transaction_Data`,`Value`, `Currency`) \
              VALUES(NULL, '" + userID + "', '" + categoryID + "', '" + d + "', '" + value + "', '" + currency + "')";
                            mysqlPool.query(query, (err, result) => {
                                if (err)
                                    writeResponse(res, "", 500);
                                else
                                    writeResponse(res, "", 201);
                            });
                        }
                    }
                });
            }
        }
    });
}
function sendResponseForPostRequest(res, query, data, table) {

    mysqlPool.query("SELECT 1 FROM `" + table + "` WHERE `Name` = '" + data + "'", (err, results) => {
        if (err) {
            res.write(err);
            res.end();
        }
        else {
            if (results.length != 0)
                writeResponse(res, "", 409); // Conflict
            else {
                mysqlPool.query(query, (err, results) => {
                    if (err) {
                        res.write(err);
                        res.end();
                    }
                    else
                        writeResponse(res, "", 201);
                });
            }
        }
    });
}
function sendResponseForGetRequest(res, query) {
    mysqlPool.query(query, (err, results) => {
        if (err)
            writeResponse(res, "", 500);
        else {
            if (results.length == 0)
                writeResponse(res, "", 404); // Not found
            else
                writeResponse(res, JSON.stringify(results), 200);
        }
    });
}