/* 
List of desired features:
0. Simple frontend to take in the desired url 
1. Map to frontend with /generate-qr 
2. Scan the URL for malware using VirusTotal
3. Use the qr-image npm package to turn the user entered URL into a QR code image.
4. Create a redirect to lead the user to new image file, replacing existing image file
*/

import "@inquirer/prompts";
import express, { urlencoded } from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import 'dotenv/config';
import bodyparser from "body-parser";
import GSBNode from 'gsb-node';
import qr from 'qr-image';
import fs from 'fs';


// const { qr } = pkg;
/* Defining constants for ease of use later. We use:
1. FileURLToPath and dirname to get the current directory name
2. GSBNode to create a Google Safebrowising scanner method utilizing the API Key 
3. Port and express are simple enough */
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const gsb = new GSBNode({ apiKey: process.env.GSB_API_KEY });
const port = 3000;


app.use(bodyparser.urlencoded( { extended: true }));
app.use(express.static(__dirname + '/public'));


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html")
} );

/*Using the scan function we first:
1. Get the link from the request body
2. Check if the link is an array or a single string and convert it to an array
3. Use the gsb.lookup method to check the URLs against the Google Safe Browsing API
4. If any matches are found, we log a message and return a 403 status with an error message
5. If no matches are found, we call next() to proceed to the next middleware or route handler
This function is used to scan the URL for malware before generating the QR code.*/

function Scan (req, res, next) {
    const toScan = req.body.link;
    console.log(toScan);
    const urls = Array.isArray(toScan) ? toScan : [toScan];
    gsb.lookup(urls).then((matches) => {
        if (matches.length> 0) {
        console.log("bad domain!");
        return res.status(403).json({ error: 'Malicious URL detected' });
    }
    next();
  });
}
// app.post("/virus-scan", Scan);

/* Using the qrGenerate function we:
1. Get the link from the request body
2. Use the qr.image method to generate a QR code in SVG format 
3. Create a write stream to save the QR code to a file named 'i_love_qr.svg'
4. Pipe the QR code data to the write stream
5. Listen for the 'finish' event to log a success message and call next()
6. Listen for the 'error' event to log an error message and send a 500
status with an error message
This function is used to generate the QR code from the user-entered URL and save it to
*/
function qrGenerate(req, res, next) {
     const toMake = req.body.link;
    const qr_svg = qr.image(toMake, { type: 'svg' });
    const writeStream = fs.createWriteStream('i_love_qr.svg');
    qr_svg.pipe(writeStream);
        writeStream.on('finish', () => {
        console.log("QR code written to file.");
        next();
    });

        writeStream.on('error', (err) => {
        console.error("Error writing QR code:", err);
        res.status(500).send("Failed to generate QR code.");
    });
}
app.post("/generate-qr", Scan, qrGenerate, (req, res) => {
    console.log("POST /generate-qr hit");
    res.redirect('/qr-image');
});
// app.post("/generate-qr", qrGenerate);

app.get('/qr-image', (req, res) => {
     console.log("GET /qr-image hit");
    res.sendFile(__dirname + "/i_love_qr.svg");
} )

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});