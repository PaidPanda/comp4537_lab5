const STRINGS = {
    dbDisconnect: "Database disconnected",
    pathError: "No route found for ${method} ${path}",
    bodyError: "Invalid data format in request body",
    invalidData: "Invalid patient data",
    insertError: "Error inserting patient data",
    insertSuccess: "Patient data inserted successfully",
    getError: "Invalid request. Missing query parameter",
    invalidType: "Only SELECT and INSERT queries are allowed",
    invalidGet: "GET requests only support SELECT queries",
    invalidPost: "POST requests only support INSERT queries",
    successGet: "SELECT query executed successfully",
    successPost: "INSERT query executed successfully",
    invalidExecution: "Error executing query",
    invalidPostFormat: "POST request body must contain a 'body' field"
}

module.exports = STRINGS