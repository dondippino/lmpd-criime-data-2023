// Importing necessary modules
const nReadlines = require("n-readlines");
const fetch = require("node-fetch");
const { appendFile } = require("fs");
const { makeURL } = require("./utils")

// Array or stack to store URLs scheduled for parallel processing
const urlBuffer = [];

// Limit of array stack to prevent excessive memory usage
const urlBufferLimit = 4000;

// Current state of buffer - IDLE, BUSY, DONE
let urlBufferState = "IDLE";

// Source file for input data
const CSV_FILE = "./sample.csv";

// API endpoint for fetching data
const API_URL = "http://localhost:8100/search";

// Flag indicating if the CSV file has a header row
const hasHeader = true;

// Timestamp for creating unique destination file names
const timeStamp = Date.now();
const destPath = `./output/${CSV_FILE.replace(/\.csv$/, "")}-${timeStamp}.csv`;
const unresolvedPath = `./output/${CSV_FILE.replace(/\.csv$/, "")}-${timeStamp}-unresolved.csv`;

// Create a reader object for reading lines from the CSV file
const lines = new nReadlines(CSV_FILE);

// If the CSV file has a header, append a modified header to the destination file
if (hasHeader) {
    const header = lines.next();
    appendFile(destPath, `${[...header.toString().split(",").map(v => String(v).trim()), 'lat', 'lon', 'county', 'precision', 'osm_city', 'osm_zip'].join(",")}\n`, err => err);
}

// Set up a timer to continuously read lines from the CSV file and add them to the processing buffer
const timer1 = setInterval(() => {
    if (urlBuffer.length < urlBufferLimit) {
        urlBufferState = "BUSY";
        const line = lines.next();
        if (line) {
            const arr = line.toString('ascii').match(/(?:[^",]+|"[^"]*")+/g);
            urlBuffer.push([arr, 0]);
        } else {
            urlBufferState = "DONE";
        }
    }
}, 0);

// Set up a timer to process URLs from the buffer using parallel HTTP requests
const concurrentHttpLimit = 300;
let httpCount = 0;
const timer2 = setInterval(() => {
    if (urlBuffer.length > 0 && httpCount < concurrentHttpLimit) {
        const [data, retry] = urlBuffer.pop();
        const addr = data[12].replace(" BLOCK ", " ").replace(/^"|"$/g, '').trim().replace(/\s+/g, '+');
        const city = data[13].trim();
        const zip = data[14].trim();

        // Handle different retry scenarios
        if (retry === 0) {
            // Retry 0: Retry with only street and postal code
            (async () => {
                try {
                    httpCount++

                    const searchParams = [{ key: "street", value: String(addr) }, { key: "postalcode", value: String(zip) }]
                    const url = makeURL(API_URL, searchParams).toString();
                    const response = await fetch(url);

                    httpCount--

                    if (!response.ok) {
                        throw new Error("retry0")
                    }

                    const result = await response.json();
                    if (result.length === 0) {
                        throw new Error('retry1')
                    } else {
                        const enriched = [...data, result[0]['lat'], result[0]['lon'], result[0]['address']['county'], 'house_number', result[0]['address']['city'] ?? "", result[0]['address']['postcode']].map(v => String(v).trim())
                        appendFile(destPath, `${enriched.join(",")}\n`, err => err);
                    }
                } catch (error) {
                    if (error.message === "retry0") { urlBuffer.push([data, 0]) }
                    if (error.message === "retry1") { urlBuffer.push([data, 1]) }
                }

            })()
        } else if (retry === 1) {
            // Retry 1: Retry with street and city
            (async () => {
                try {
                    httpCount++

                    const searchParams = [{ key: "street", value: String(addr) }, { key: "city", value: String(city) }]
                    const url = makeURL(API_URL, searchParams).toString();
                    const response = await fetch(url);

                    httpCount--;

                    if (!response.ok) {
                        throw new Error("retry0")
                    }

                    const result = await response.json();
                    if (result.length === 0) {
                        // has a single slash
                        if (/^[^\/]*\/[^\/]*$/.test(addr)) {
                            urlBuffer.push([data, 4]);
                            throw new Error()
                        }

                        throw new Error("retry2")

                    } else {
                        const enriched = [...data, result[0]['lat'], result[0]['lon'], result[0]['address']['county'], 'house_number', result[0]['address']['city'] ?? "", result[0]['address']['postcode']].map(v => String(v).trim())
                        appendFile(destPath, `${enriched.join(",")}\n`, err => (err));
                    }
                } catch (error) {
                    if (error.message === "retry0") { urlBuffer.push([data, 0]) }
                    if (error.message === "retry2") { urlBuffer.push([data, 2]) }
                }
            })()
        } else if (retry === 2) {
            // Retry 2: Retry with only postal code
            (async () => {
                try {
                    httpCount++

                    const searchParams = [{ key: "postalcode", value: String(zip) }]
                    const url = makeURL(API_URL, searchParams).toString();
                    const response = await fetch(url);

                    httpCount--;

                    if (!response.ok) {
                        throw new Error("retry0")
                    }

                    const result = await response.json();
                    if (result.length === 0) {
                        throw new Error("retry3")

                    } else {
                        const enriched = [...data, result[0]['lat'], result[0]['lon'], result[0]['address']['county'], 'zip', result[0]['address']['city'] ?? "", result[0]['address']['postcode']].map(v => String(v).trim())
                        appendFile(destPath, `${enriched.join(",")}\n`, err => (err));
                    }
                } catch (error) {
                    if (error.message === "retry0") { urlBuffer.push([data, 0]) }
                    if (error.message === "retry3") { urlBuffer.push([data, 3]) }
                }
            })()
        } else if (retry === 3) {
            // Retry 3: Retry with only city
            (async () => {
                try {
                    httpCount++

                    const searchParams = [{ key: "city", value: String(city) }]
                    const url = makeURL(API_URL, searchParams).toString();
                    const response = await fetch(url);

                    httpCount--

                    if (!response.ok) {
                        throw new Error("retry0")
                    }

                    const result = response.json;
                    if (result.length === 0) {
                        // push to anomalies
                        appendFile(unresolvedPath, `${data.join(",")}\n`, err => (err));
                    } else {
                        const enriched = [...data, result[0]['lat'], result[0]['lon'], result[0]['address']['county'], 'city', result[0]['address']['city'] ?? "", ""].map(v => String(v).trim())
                        appendFile(destPath, `${enriched.join(",")}\n`, err => (err));
                    }
                } catch (error) {
                    if (error.message === "retry0") { urlBuffer.push([data, 0]) }
                }
            })()
        } else if (retry === 4) {
            // Retry 4: Retry with a modified street and postal code
            (async () => {
                try {
                    httpCount++

                    const str = addr.match(/^([^\/]*)\/[^\/]*$/)[1]
                    const searchParams = [{ key: "street", value: String(str) }, { key: "postalcode", value: String(zip) }]
                    const url = makeURL(API_URL, searchParams).toString();
                    const response = await fetch(url);

                    httpCount--

                    if (!response.ok) {
                        throw new Error("retry0")
                    }

                    const result = await response.json();
                    if (result.length === 0) {
                        throw new Error('retry2')
                    } else {
                        const enriched = [...data, result[0]['lat'], result[0]['lon'], result[0]['address']['county'], 'house_number', result[0]['address']['city'] ?? "", result[0]['address']['postcode']].map(v => String(v).trim())
                        appendFile(destPath, `${enriched.join(",")}\n`, err => err);
                    }
                } catch (error) {
                    if (error.message === "retry0") { urlBuffer.push([data, 0]) }
                    if (error.message === "retry2") { urlBuffer.push([data, 2]) }
                }
            })()
        }
    }
}, 0);

// Set up a timer to log buffer and processing status, and clear intervals when processing is complete
const timer3 = setInterval(() => {

    import("log-update").then((logUpdate) => {
        logUpdate.default(`URL Buffer Size: ${urlBuffer.length}\nConcurrent HTTP Requests: ${httpCount} connections
        `)
    })

    if (urlBuffer.length === 0 && httpCount === 0 && urlBufferState !== "IDLE") {
        clearInterval(timer1);
        clearInterval(timer2);
        clearInterval(timer3);
    }
}, 1000);
