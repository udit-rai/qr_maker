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
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const gsb = new GSBNode({ apiKey: process.env.GSB_API_KEY });
const port = 3000;


console.log(process.env.GSB_API_KEY );

app.use(bodyparser.urlencoded( { extended: true }));
app.use(express.static(__dirname + '/public'));


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html")
} );

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

function qrGenerate(req, res, next) {
     const toMake = req.body.link;
     console.log("Generating QR code for:", toMake);
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