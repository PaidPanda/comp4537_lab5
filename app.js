const http = require("http");
const url = require("url");
const STRINGS = require("./lang/messages/en/user.js");
const mysql = require("mysql2");

const GET = "GET";
const POST = "POST";
const OPTIONS = "OPTIONS";

let requestCount = 0;
const port = process.env.PORT || 3000;
const ALLOWED_ORIGIN = "https://genuine-concha-06c14a.netlify.app";

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    multipleStatements: true,
    timezone: "Z"
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to database:", err);
        return;
    }
    console.log("Connected to database!");
});

// main application class
class App {
  constructor(port) {
    this.port = port;
  }
  // function to start the server
  start() {
    const server = http.createServer((req, res) => {
      const method = req.method;
      const parsedUrl = url.parse(req.url, true);
      const query = parsedUrl.query;
      const path = parsedUrl.pathname;

      // accumulate request body data
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      // handle the end of the request
      req.on("end", () => {
        // handle OPTIONS requests for CORS preflight
        if (method === OPTIONS) {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type", // Add any headers your frontend sends
            "Access-Control-Max-Age": 86400, // Cache preflight for 24 hours
          });
          res.end();
          return;
        }

        // set common headers for all responses (all non-OPTIONS requests)
        res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
        res.setHeader("Content-Type", "application/json");

        // test database connection on /testdb route
        if (method === GET && path ==="/testdb") {
          db.query("SELECT 1+1 AS result", (err, results) => {
            if (err) {
              res.writeHead(500);
              res.end(JSON.stringify({ message: "Test failed", error: err.message }));
            } else {
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Test successful", result: results[0].result }));
            }
          });
          return;
        }

        // check if client request is POST to /sql
        if (method === POST && path.endsWith("/sql")) {
            this.handlePost(req, res, body);
            return;
        }

        // check if client request is GET to /sql
        if (method === GET && path.endsWith("/sql")) {
            this.handleGet(req, res, query);
            return;
        }
        
        // handle requests that don't match any route
        const errorMessage = this.replacePlaceholder( STRINGS.pathError, {
          method,
          path,
        });
        res.writeHead(404);
        res.end(JSON.stringify({ message: errorMessage }));
      });
    });
    // start listening on the specified port
    server.listen(this.port, () => {
      console.log(`Server is listening on port ${this.port}`);
    });
  }

  // fuction to handle POST /patient requests
  handlePost(req, res, body) {
    //testing
    console.log("POST body:", body);
    requestCount++;

    try {
        // convert JSON string back to object
        const data = JSON.parse(body);
        // if query field exists, trim and store, else set to null
        const reqQuery = data.query ? data.query.trim() : null;

        // if query field exists, handle as raw INSERT query
        if (reqQuery) {
            this.handleQuery(res, reqQuery, "INSERT");
            return;
        }

        // variable to hold array of patient objects
        let queryArray;

        // check if data is array or single object
        if (Array.isArray(data)) {
            queryArray = data;
        } else if (data.name && data.dateOfBirth) {
            queryArray = [data];
        } else {
            res.writeHead(400);
            res.end(JSON.stringify({ message: STRINGS.bodyError }));
            return;
        }

        // prepare values for bulk insert
        const values = queryArray.map(patient => {
            if (!patient.name || !patient.dateOfBirth || typeof patient.name !== "string" 
                || typeof patient.dateOfBirth !== "string") {
                throw new Error(STRINGS.invalidData);
            }
            return [patient.name.trim(), patient.dateOfBirth.trim()];
        });

        // prepare SQL INSERT statement
        const sql = "INSERT INTO patient (name, dateOfBirth) VALUES ?";

        // execute the query
        db.query(sql, [values], (err, result) => {
            if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ message: STRINGS.insertError }));
                return;
            }
            
            // respond with success message and number of affected rows
            res.writeHead(201);
            res.end(JSON.stringify({ message: `${STRINGS.insertSuccess} : ${result.affectedRows}` }));
        });
    } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: STRINGS.invalidPostFormat, error: err.message }));
    }
  }

  // function to handle GET /patient requests
  handleGet(req, res, query) {
    requestCount++;

    // if query field exists, trim and store, else set to null
    const reqQuery = query.query ? query.query.trim() : null;

    // if no query provided, respond with error
    if (!reqQuery) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: STRINGS.getError }));
        return;
    }
    // handle as raw SELECT query
    this.handleQuery(res, reqQuery, "SELECT");
  }

  // function to handle raw SQL queries
  handleQuery(res, reqQuery, queryType) {
    // validate query 
    const allowedSelect = /^SELECT\s.+/i.test(reqQuery);
    const allowedInsert = /^INSERT\sINTO\s.+/i.test(reqQuery);

    // invalid query types
    const invalidTypes = /\b(UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE)\b/i;

    // check for invalid query types
    if (invalidTypes.test(reqQuery)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ message: STRINGS.invalidType }));
    }

    // check for valid GET request using SELECT
    if (queryType === "SELECT" && !allowedSelect) {
        res.writeHead(403);
        return res.end(JSON.stringify({ message: STRINGS.invalidGet }));
    }

    // check for valid POST request using INSERT
    if (queryType === "INSERT" && !allowedInsert) {
        res.writeHead(403);
        return res.end(JSON.stringify({ message: STRINGS.invalidPost }));
    }

    // execute the query
    db.query(reqQuery, (err, results) => {
        // handle query errors
        if (err) {
            res.writeHead(400);
            return res.end(JSON.stringify({ message: STRINGS.invalidExecution }));
        }

        // respond with success message if GET or POST request is successful
        if (queryType === "SELECT") {
            res.writeHead(200);
            return res.end(JSON.stringify({ message: STRINGS.successGet, 
              results: results }));
        } else {
            res.writeHead(201);
            return res.end(JSON.stringify({ message: STRINGS.successPost, 
              affectedRows: results.affectedRows,
              insertId: results.insertId
             }));
        }
    });
  }

  // function to replace placeholders in strings
  replacePlaceholder(str, data) {
    return str.replace(/\$\{(\w+)\}/g, (match, key) => data[key]);
  }
}

// create and start the app
const app = new App(port);
app.start();
