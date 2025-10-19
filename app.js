const http = require("http");
const url = require("url");
const STRINGS = require("./lang/messages/en/user.js");
const mysql = require("mysql");

const GET = "GET";
const POST = "POST";
const OPTIONS = "OPTIONS";

let requestCount = 0;
const port = process.env.PORT || 3000;
const ALLOWED_ORIGINS = "*";

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "comp4537_lab5",
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log("Connected to database!");
    let sql = "INSERT INTO patient(name, dateOfBirth) VALUES ('Elon Musk', '1999-01-01')";
    db.query(sql, (err, result) => {
        if (err) {
            throw err;
        }
        console.log("1 record inserted");
    });
});