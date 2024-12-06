require("dotenv").config()

const express = require("express");
const path = require("path");
const cors = require("cors")
const morgan = require('morgan');

const port = process.env.PORT;

const app = express();

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({extended: false}));

const routes = require("./routes/Router.js")

app.use(cors({
  credentials: true, 
  origin: ["https://sistema-condo.vercel.app", "http://localhost:8080"]
}))

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

require("./config/db.js")

app.use(routes);

app.listen(port, () => {
    console.log(`app rodando na porta: ${port}`);
});
