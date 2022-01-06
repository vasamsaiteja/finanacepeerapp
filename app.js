const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "financePeer.db");

const app = express();
app.use(cors());

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    // console.log(process.env.PORT);

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, password)
     VALUES
      (
       '${username}',
       '${hashedPassword}'
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  //   console.log("data", databaseUser);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "qwertyuiop");
      //   console.log(jwtToken);
      response.send({ jwtToken });
      //    response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.post("/posts", async (request, response) => {
  const postsDetails = request.body;
  //   console.log("request", request);
  // let us assume we have the table named book with title, author_id, and rating as columns
  if (postsDetails) {
    const values = postsDetails.map(
      (eachPost) =>
        `('${eachPost.userId},${eachPost.id},${eachPost.title}',${eachPost.body})`
    );

    const valuesString = values.join(",");

    console.log("valuesString", valuesString);

    const addBookQuery = `
    INSERT INTO
      POSTS (user_id,id,title,body)
    VALUES
       ${valuesString};`;

    const dbResponse = await database.run(addBookQuery);
    const bookId = dbResponse.user_id;
    response.send({ bookId: bookId });
  } else {
    response.send("No data");
  }
});
