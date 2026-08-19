const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Mahalaxmi Enterprise CRM</title>
      </head>
      <body>
        <h1>Mahalaxmi Enterprise AI CRM</h1>
        <p>CRM system is running successfully.</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`CRM running on port ${PORT}`);
});
