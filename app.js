require("dotenv").config()

const express = require("express");
const path = require("path");
const cors = require("cors")
const morgan = require('morgan');

const port = process.env.PORT;

const app = express();

app.use(morgan('dev'));

//Configuração Json e form data response
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// routes
const routes = require("./routes/Router.js")

// Cors
app.use(cors({credentials: true, origin: "https://sistema-condo.vercel.app"}))

// diretorio de Upload
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Conexão com banco de dados
require("./config/db.js")

app.use(routes);

app.listen(port, () => {
    console.log(`app rodando na porta: ${port}`);
});
