var express = require('express');
var router = express.Router();
const multer = require('multer');
const pdfkit = require('pdfkit');
const mammoth = require('mammoth');
const crypto = require('crypto');

const storage = multer.memoryStorage(); // Keep the file in memory
const upload = multer({ storage: storage });


async function convertDocxToPdf(buffer, text) {
  const { value } = await mammoth.extractRawText({ buffer: buffer });

  // Create a new PDF document
  const pdfDoc = new pdfkit();

  // Split the text into pages
  const pages = value.split('\f');

  // Add watermark to each page
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      pdfDoc.addPage(); // Add a new page for each iteration (except the first one)
    }

    // Add text content to the page
    pdfDoc.text(pages[i]);

    // Calculate the center coordinates dynamically
    const centerX = pdfDoc.page.width / 2;
    const centerY = pdfDoc.page.height / 2;

    // Add watermark to the center of the PDF
    pdfDoc.font('Helvetica').fontSize(30).fillOpacity(0.3).text(text, centerX, centerY, { align: 'center' });
  }

  return pdfDoc;
}

function generateHash(buffer) {
  const secretKey = "0xbfd9c29ad364336ea839ef29f2537f8481658051a70889b9ddb3fc1d8998b1e9";
  const dataWithSecret = Buffer.concat([Buffer.from(secretKey), buffer]);
  const hash = crypto.createHash('sha256');
  hash.update(dataWithSecret);
  return hash.digest('hex');
}
async function generatePdfBuffer(pdfDoc) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    pdfDoc.on('data', buffer => buffers.push(buffer));
    pdfDoc.on('end', () => resolve(Buffer.concat(buffers)));
    pdfDoc.end();
  });
}
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/convert', upload.single('file'), async (req, res) => {
  // 'file' is the field name in the form
  // req.file contains information about the uploaded file

  if (req.file) {
    try {
      const pdfDoc = await convertDocxToPdf(req.file.buffer, req.body.text);
      const pdfBuffer = await generatePdfBuffer(pdfDoc);
      const fileHash = generateHash(pdfBuffer);
      console.log(fileHash);
      // Set the response headers for PDF
      res["Access-Control-Expose-Headers"] = "Content-Disposition"
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${fileHash}`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send('No file uploaded.');
  }
});
router.post('/verify', upload.single('file'), async (req, res) => {
  // 'file' is the field name in the form
  // req.file contains information about the uploaded file

  if (req.file) {
    try {

      const fileHash = generateHash(req.file.buffer);
      const isValid = fileHash == req.body.text;
      // Set the response headers for PDF
      res.status(200).json({ isValid: isValid ? "PDF is verified and authentic" : "PDF was altered or incorrect" });
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send('No file uploaded.');
  }
});

module.exports = router;
