const mongose = require("mongoose");
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASS;

const conn = async () => {
    try {
        const dbConn = await mongose.connect(
            `mongodb+srv://${dbUser}:${dbPassword}@cluster0.ftely.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
        )

        console.log("Conectou ao banco!")

        return dbConn;
    } catch (error) {
        console.log(error);
    }
}

conn();

module.exports = conn;