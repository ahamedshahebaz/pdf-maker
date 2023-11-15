var express = require('express');
var router = express.Router();
const multer = require('multer');
const pdfkit = require('pdfkit');
const mammoth = require('mammoth');
const crypto = require('crypto');

const storage = multer.memoryStorage(); // Keep the file in memory
const upload = multer({ storage: storage });

// Function to convert DOCX to PDF
async function convertDocxToPdf(buffer,text) {
  const { value } = await mammoth.extractRawText({ buffer: buffer });
  const pdfDoc = new pdfkit();
  const pages = value.split('\f');

  // Add watermark to each page
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      pdfDoc.addPage(); // Add a new page for each iteration (except the first one)
    }
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
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/convert', upload.single('file'), async (req, res) => {
  // 'file' is the field name in the form
  // req.file contains information about the uploaded file

  if (req.file) {
    try {
      const pdfDoc = await convertDocxToPdf(req.file.buffer,req.body.text);
      const fileHash = generateHash(req.file.buffer);
      console.log(fileHash);
      // Set the response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileHash}_converted.pdf`);

      // Pipe the PDF content to the response
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send('No file uploaded.');
  }
});

module.exports = router;
