const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const hostname = '127.0.0.1';
const port = 80

var stream = fs.createWriteStream("logs/log" + getCurrentDate() + ".json", { flags: 'a' });
const stats = fs.statSync("logs/log" + getCurrentDate() + ".json");
if (stats.size == 0)
    stream.write('[');

fs.readFile('index.html', (err, html) => {
    const server = http.createServer(handleRequests.bind({"html": html}));
    server.listen(port, hostname, () => {
        console.log('Server stared on port: ' + port);
    });
})

var promisesArray = [];

function handleRequests(req, res) {
    var queryData = url.parse(req.url, true).query;
    var route = req.url.split("?")[0];
    
    if (route == '/api') {
        handleApiRequest(queryData, req, res, this.html);
    } else if (route == '/posttogooglesheets') {
        handleGoogleSheetsApiRequest(res);
    } else if (route == '/apifortest') {
        handleApiRequest(queryData, req, res, this.html);
        // handleGoogleSheetsApiRequest(res);
        res.end();
    } else if (route == '/') {
        res.write(this.html);
        res.end();
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write("404 Not found");
        res.end();
    }
}

function handleGoogleSheetsApiRequest(res) {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        if (promisesArray.length == 0) {
            res.end("No request send! Send request first and the try to post to google sheets");
        } else {
            Promise.all(promisesArray)
                .then(sendDataToGoogleSpreadSheet.bind({ "res": res, "content": content }))
                .catch(printPromiseError);
        }
    });
}

function handleApiRequest(queryData, req, res, html) {
    var promise = new Promise((resolve, reject) => {
        var start = new Date();
        https.get('https://restcountries.eu/rest/v2/name/' + queryData['name'], (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                if (resp.statusCode == 200)
                    resolve(`The ${queryData['name']} capital is ${JSON.parse(data)[0]['capital']}`);
                else {
                    resolve("Tara nu exista!");
                }
                var latency = new Date() - start;
                writeToLogs("get", `https://restcountries.eu/rest/v2/name/${queryData['name']}`, resp, latency);
            });
        }).on("error", (err) => {
            reject(err.message);
        });
    });
    promise.then(printPromiseData).catch(printPromiseError);
    promisesArray.push(promise);

    var optionsget = { headers: { 'X-RapidAPI-Key': '5c9305367bmsh31063ebe045f5ddp16b640jsn31bc0731b843' } };
    promise = new Promise((resolve, reject) => {
        var start = new Date();
        https.get("https://pozzad-email-validator.p.rapidapi.com/emailvalidator/validateEmail/" + encodeURIComponent(queryData['email']),
            optionsget, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });

                resp.on('end', () => {
                    resolve(JSON.parse(data)['isValid'] ? `Yes, the ${queryData['email']} is valid` : `The ${queryData['email']} is not valid`);
                    var latency = new Date() - start;
                    writeToLogs("get", "https://pozzad-email-validator.p.rapidapi.com/emailvalidator/validateEmail/" + encodeURIComponent(queryData['email']),
                        resp, latency);
                });
            }).on("error", (err) => {
                reject(err.message);
            });
    });
    promise.then(printPromiseData).catch(printPromiseError);
    promisesArray.push(promise);
   
    res.write(html);
    res.end("<b>Requests</b> send! You can now post the data on google sheets by pressing the button <i>'Post info on google sheets'</i>");
}

function getCurrentDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }

    today = mm + '-' + dd + '-' + yyyy;
    return today;
}

function writeToLogs(method, url, resp, latency) {
    stream.write(`{"req": {"method": "${method}", "url": "${url}"},` +
        `"res": { "statusCode": "${resp.statusCode}" },` +
        `"latency": "${latency} ms" },`);
}

function sendDataToGoogleSpreadSheet(values) {
    var start = new Date();
    authorize(JSON.parse(this.content), writeData.bind({ "values": values, "res": this.res, "start": start }));
    promisesArray = [];
}

function printPromiseError(e) {
    console.log(e);
}

function printPromiseData(data) {
    console.log("Data recevied: " + data);
}

function writeData(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    let values = [
        this.values,
    ];
    let resource = {
        values,
    };
    sheets.spreadsheets.values.append({
        spreadsheetId: '1IFN4tQj0tFyr1r-IMLNSTNMqpLjl6qQnKCQkOUMUSW4',
        range: 'Foaie1!A1:E',
        valueInputOption: 'USER_ENTERED',
        resource,
    }, (err, result) => {
        if (err) {
            // Handle error.
            console.log(err);
        } else {
            var latency = new Date() - this.start;
            writeToLogs("Post", "https://sheets.googleapis.com/v4/spreadsheets/1IFN4tQj0tFyr1r-IMLNSTNMqpLjl6qQnKCQkOUMUSW4/values/Sheet1!A1:E:append?valueInputOption=USER_ENTERED",
                        {statusCode: result.status}, latency)
            this.res.end('Data written to spreadsheet!>');
        }
    });
}


// Promise.all(promisesArray)
//     .then(printPromiseData)
//     .catch(printPromiseError);
// () => {
//     var latency = new Date() - startTime;
//     writeToLogs("get", `https://restcountries.eu/rest/v2/name/${queryData['name']} &&` +
//         " https://pozzad-email-validator.p.rapidapi.com/emailvalidator/validateEmail/" + encodeURIComponent(queryData['email']),
//         { statusCode: 200 }, latency)
// }

// Google SpreadSheets API Authentication -----------------------------------------------------------

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}
