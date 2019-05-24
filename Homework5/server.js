const http = require('http');
const url = require('url');
const mysql = require('mysql');
const CODE200IMAGE = "200.jpg"; const CODE201IMAGE = "201.jpg"; const CODE204IMAGE = "204.jpg";
const CODE400IMAGE = "400.jpg"; const CODE404IMAGE = "404.jpg";
const dbUser = 'myadmin@mysql-cloud-homework';
const dbPassword = 'not-SafePassword';
const dbName = 'cloudhomework5';
const hostName = 'mysql-cloud-homework.mysql.database.azure.com';
const port = process.env.PORT || 3000;

var config =
{
  host: hostName,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: 3306,
  ssl: true
};

function displayResponse(res, infoData, statusCode) {
  var codeImage;
  if (statusCode == 400)
    codeImage = CODE400IMAGE;
  else if (statusCode == 404)
    codeImage = CODE404IMAGE;
  else if (statusCode == 200)
    codeImage = CODE200IMAGE;
  else if (statusCode == 201)
    codeImage = CODE201IMAGE;
  else if (statusCode == 204)
    codeImage = CODE204IMAGE;
  imageData = "https://cloudhomework599ce.blob.core.windows.net/httpdogs/" + codeImage;
  displayImageReponseCode(res, infoData, imageData, statusCode, 'text/html');
}

const db = new mysql.createConnection(config);

db.connect(
  function (err) {
    if (err) {
      console.log("!!! Cannot connect !!! Error:");
      throw err;
    }
    else {
      console.log("Connection established.");
    }
  });

const server = http.createServer(handleRequest);
server.listen(port, () => {
  console.log('Server stared on port: ' + port);
});

function handleRequest(req, res) {
  const queryData = url.parse(req.url, true).query;
  const route = req.url.split("?")[0];
  const method = req.method;
  
  if (method == 'GET') {
    handleGetRequest(res, route);
  } else if (method == 'POST') {
    handlePostRequest(res, route);
  } else if (method == 'PUT') {
    handlePutRequest(res, route);
  } else if (method == 'DELETE') {
    handleDeleteRequest(res, route);
  } else {
    writeResponse(res, "Not implemented", "", 400, 'text/html');
  }
}

function executeMysqlQuery(query, callback) {
  db.query(query, function (err, result) {
    return callback(err, result);
  });
}

function writeResponse(res, infoData, imageData, statusCode, contentType) {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.write('<html><body><img src="');
  res.write(imageData);
  res.write('"/></br><pre>');
  res.write(infoData);
  res.end("</pre></body></html>");
}

function sendResponseForGetRequest(res, query, firstValue = false) {
  executeMysqlQuery(query,
    (err, result) => {
      var body = null;
      if (err) { 
        displayResponse(res, "Wrong data: " + err, 400);
        return;
      }

      if (firstValue) {
        body = JSON.stringify(result[0]);
      } else {
        body = JSON.stringify(result);
      }

      if (result.length == 0) {
        displayResponse(res, JSON.stringify("No content"), 204);
      } else {
        displayResponse(res, body, 200);
      }
    })
}

function postToDb(res, query, statusCode = 201, errMessage = "Wrong data") {
  executeMysqlQuery(query, (err, result) => {
    if (err) {
      displayResponse(res, errMessage + ": " + err, 204);
    } else {
      displayResponse(res, "", statusCode);
    }
  })
}

function displayImageReponseCode(res, infoData, imageData, statusCode, contentType) {
  writeResponse(res, infoData, imageData, statusCode, contentType)
}



function handleGetRequest(res, route) {
  if (matcher = route.match(/^\/user\/(\d+)\/transactions$/)) {
    sendResponseForGetRequest(res, `SELECT * FROM Transactions_income WHERE id_user = ${db.escape(matcher[1])}`);
  } else if (matcher = route.match(/^\/user\/(\d+)\/transactionid\/(\d+)$/)) {
    sendResponseForGetRequest(res, `SELECT * FROM Transactions_income WHERE id_user = ${db.escape(matcher[1])} 
            AND ID = ${db.escape(matcher[2])}`, true);
  } else if (matcher = route.match(/^\/user\/(\d+)\/transactions\/category\/(\d+)$/)) {
    sendResponseForGetRequest(res, `SELECT * FROM Transactions_income WHERE id_user = ${db.escape(matcher[1])} 
            AND ID_CATEGORY = ${db.escape(matcher[2])}`, true);
  } else if (matcher = route.match(/^\/categories$/)) {
    sendResponseForGetRequest(res, "SELECT * FROM `Category_Income`");
  } else if (matcher = route.match(/^\/category\/(\w+)$/)) {
    sendResponseForGetRequest(res, `SELECT ID FROM Category_Income WHERE name = ${db.escape(matcher[1])}`, true);
  } else if (matcher = route.match(/^\/transaction\/userid\/(\d+)\/categoryid\/(\d+)\/date\/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/)) {
    sendResponseForGetRequest(res, `SELECT * FROM Transactions_income WHERE id_user = ${db.escape(matcher[1])} 
            AND ID_CATEGORY = ${db.escape(matcher[2])} AND DATE(transaction_date) = ${db.escape(matcher[3])}`);
  } else if (matcher = route.match(/^\/users$/)) {
    sendResponseForGetRequest(res, "SELECT * FROM `Users`");
  } else {
    displayResponse(res, "Not found", 404);
  }
}

function handlePostRequest(res, route) {
  if (matcher = route.match(/^\/transaction\/userid\/(\d+)\/categoryid\/(\d+)\/value\/(\d+)\/currency\/([A-Za-z]{1,3})$/)) {
    postToDb(res, `INSERT INTO Transactions_income VALUES (null, ${db.escape(matcher[1])}, ${db.escape(matcher[2])},
            NOW(), ${db.escape(matcher[3])}, ${db.escape(matcher[4])})`);
  } else if (matcher = route.match(/^\/category\/(\w+)$/)) {
    postToDb(res, `INSERT INTO Category_Income VALUES (null, ${db.escape(matcher[1])})`, 200, "Category already exists");
  } else if (matcher = route.match(/^\/user\/(\w+)$/)) {
    postToDb(res, `INSERT INTO Users VALUES (null, ${db.escape(matcher[1])})`, 200, "User already exists");
  } else {
    displayResponse(res, "Not found", 404);
  }
}

function handlePutRequest(res, route) {
  if (matcher = route.match(/^\/transactionid\/(\d+)\/categoryid\/(\d+)\/value\/(\d+)\/currency\/([A-Za-z]{1,3})$/)) {
    postToDb(res, `UPDATE Transactions_income SET id_category = ${db.escape(matcher[2])}, value = ${db.escape(matcher[3])},
            currency = ${db.escape(matcher[4])} WHERE id = ${db.escape(matcher[1])}`, 200);
  } else if (matcher = route.match(/^\/categoryid\/(\d+)\/name\/(\w+)$/)) {
    postToDb(res, `UPDATE Category_Income SET name = ${db.escape(matcher[2])} WHERE id = ${db.escape(matcher[1])}`, 200);
  } else {
    displayResponse(res, "Not found", 404);
  }
}

function handleDeleteRequest(res, route) {
  if (matcher = route.match(/^\/transactionid\/(\d+)$/)) {
    postToDb(res, `DELETE FROM Transactions_income WHERE id = ${db.escape(matcher[1])}`, 200);
  } else if (matcher = route.match(/^\/categoryid\/(\d+)$/)) {
    postToDb(res, `DELETE FROM Category_Income WHERE id = ${db.escape(matcher[1])}`, 200);
  } else {
    displayResponse(res, "Not found", 404);
  }
}
