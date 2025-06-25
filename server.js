import express, { response } from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from 'bcrypt';

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
  user: 'movies_i3n8_user',
  host: process.env.DATABASE_URL,
  database: 'movies_i3n8',
  password: 'GmP9fujyyERqF7HqVwvEsPw9wIh69qB5',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
})

db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

async function getNumber(movieName){
    const searchMovieName = movieName.toLowerCase().replace("'", "").replace("?", "");
    console.log(searchMovieName.charAt(0));
    const response = await db.query("SELECT * FROM movies WHERE LOWER (letter) = $1 ORDER BY REPLACE(name, ' ', '') ASC", [searchMovieName.charAt(0)]);
    const movieIndex = response.rows.findIndex(row => row.name.toLowerCase().replace("'", "").replace("?", "") === searchMovieName);
    return movieIndex+1;
} 

async function changeLogs(movieData, type){
    const date = String(new Date());
    await db.query("INSERT INTO change_logs (name, location, letter, category, main_actors, date, type) VALUES ($1, $2, $3, $4, $5, $6, $7)", [
        movieData.name, 
        movieData.location, 
        movieData.letter, 
        movieData.category, 
        movieData.main_actors,
        date,
        type
    ]);
}

app.get("/", (req, res) => {
    res.render("index.ejs");
})

app.post("/search", async (req, res) => {
    const page = req.body.page;
    const requestedMovie = req.body.param.toLowerCase();
    const response = await db.query(
        `SELECT * FROM movies
        WHERE LOWER(REPLACE(REPLACE(name, '''', ''), '?', '')) = REPLACE(REPLACE(LOWER($1), '''', ''), '?', '')
        ORDER BY REPLACE(REPLACE(REPLACE(name, ' ', ''), '''', ''), '?', '') ASC`,
        [requestedMovie.toLowerCase()]
    );
    if (response.rows.length === 0){
        if(page === "index-page"){
            res.render("index.ejs", {errorResponse: "Movie not found try again"});
        }
        else if(page === "admin-page"){
            res.render("admin_page.ejs", {errorResponse: "Movie not found try again"});
        }
    }else{
        const movieNumber = await getNumber(requestedMovie);
        if(page === "index-page"){
            res.render("index.ejs", {movieData: response.rows[0], movieNumber: movieNumber});
        }
        else if(page === "admin-page"){
            res.render("admin_page.ejs", {movieData: response.rows[0], movieNumber: movieNumber});
        }
    }
})

app.post("/random", async (req, res) => {
    const randomParam = req.body.param.toLowerCase();
    let response = await db.query("SELECT * FROM movies WHERE LOWER (category) LIKE '%' || $1 || '%' ORDER BY REPLACE (name, ' ', '') ASC", [randomParam]);
    if (response.rows.length === 0){
        response = await db.query("SELECT * FROM movies WHERE LOWER (main_actors) LIKE '%' || $1 || '%' ORDER BY REPLACE (name, ' ', '') ASC", [randomParam]);
        if (response.rows.length === 0){
            res.render("index.ejs", {errorResponse: "Invalid Movie Category or Main Actor"});
            return
        }
    }
    const randomIndex = Math.floor(Math.random()*response.rows.length);
    const movieData = response.rows[randomIndex];
    const movieNumber = await getNumber(movieData.name);
    res.render("index.ejs", {movieData: response.rows[randomIndex], movieNumber: movieNumber});
})

app.get("/add", (req, res) => {
    res.render("adding_page.ejs");
})

app.post("/add", async (req, res) => {
    try{
        await db.query("INSERT INTO movies (name, location, letter, category, main_actors) VALUES ($1, $2, $3, $4, $5)", Object.values(req.body));
        await changeLogs(req.body, "add");
        res.render("adding_page.ejs", {response: "Success"})
    }catch(err){
        res.render("adding_page.ejs", {response: "Failed, Movie already exists"})
    }
})

app.post("/update", async (req, res) => {
    const updateMovieName = req.body.param;
    const response = await db.query(
        `SELECT * FROM movies
        WHERE LOWER(REPLACE(REPLACE(name, '''', ''), '?', '')) = REPLACE(REPLACE(LOWER($1), '''', ''), '?', '')
        ORDER BY REPLACE(REPLACE(REPLACE(name, ' ', ''), '''', ''), '?', '') ASC`,
        [updateMovieName.toLowerCase()]
        );
    if (response.rows.length === 0){
        res.render("index.ejs", {response: `Failed, Movie: ${req.body.param} does not exist`});
    }else{
        res.render("update_page.ejs", {movieData: response.rows[0]});
    }
})

app.post("/update-current-movie", async (req, res) => {
    await db.query("UPDATE movies SET name = $1, location = $2, letter = $3, category = $4, main_actors = $5 WHERE id = $6", Object.values(req.body));
    await changeLogs(req.body, "update");
    res.redirect("/admin");
})

app.post("/delete", async (req, res) => {
    const response = await db.query("DELETE FROM movies WHERE LOWER (name) = $1 RETURNING *", [req.body.param.toLowerCase()]);
    if (response.rowCount === 0){
        res.render("index.ejs", {response: `Failed, Movie: ${req.body.param} does not exist`});
    }else {
        await changeLogs(response.rows[0], "delete");
        res.render("index.ejs", {response:"Success"});
    }
});

app.get("/login", (req, res) => {
    res.render("login_page.ejs");
})

app.post("/login", async (req, res) => {
    const inputUsername = req.body.username;
    const inputPassword = req.body.password;
    try{
        const response = await db.query("SELECT * FROM logins WHERE username=$1",[inputUsername]);
        const passwordMatch = await bcrypt.compare(inputPassword, response.rows[0].password);
        if(passwordMatch){
            res.render("admin_page.ejs");
        }else{
            res.render("login_page.ejs", {response:"Incorrect Password"});
        }
    }catch(err){
        res.render("login_page.ejs", {response:"User does not exist"});
    }
})

app.get("/admin", (req, res) => {
    res.render("admin_page.ejs");
})

app.get("/logs", async (req, res) => {
    const response = await db.query("SELECT * FROM change_logs");
    res.render("log_page.ejs", {logs: response.rows});
})

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})