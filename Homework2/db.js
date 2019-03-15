const mysql = require('mysql');

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: 'restdb'
});

db.connect(function (err) {
    if (err) 
        throw err;
    console.log("Connected to database!");
});

module.exports = db;