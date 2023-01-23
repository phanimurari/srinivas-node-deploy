const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bp = require("body-parser");

const dbPath = path.join(__dirname, "srinivas.db");
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  cors({
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));


let db = null;
const port = process.env.PORT || 3004;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(port, () => {
      console.log("Server Running at http://localhost:3004/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

	
//User Register API
app.post("/users/", cors(), async (request, response) => {
  const { username, password } = request.body
  
  console.log(request.body, "request body")

  // const hashedPassword = await bcrypt.hash(request.body.password, 10);
  // const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  // const dbUser = await db.get(selectUserQuery);
  // if (dbUser === undefined) {
  //   const createUserQuery = `
  //     INSERT INTO 
  //       user (username,  password) 
  //     VALUES 
  //       (
  //         '${username}', 
  //         '${hashedPassword}')`;
  //   await db.run(createUserQuery);
  //   response.status(200).json({ login: true });
  // } else {
  //   response.status(400).json({ userAlreadyExist : true})
  // }
});

//User Login API
app.post("/login/", cors(), async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400).json({invalidUser: true})
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.status(200).json({ jwtToken });
    } else {
      response.status(400).json({invalidPassword: true})
    }
  }
});


app.get("/fruits/", cors(), authenticateToken, async (request, response) => {
    const fruitsGetQuery = `
      SELECT * FROM fruits;`;
  
    const fruits = await db.all(fruitsGetQuery);
    response.send(fruits)
    
  });




  
  app.get("/fruits/:fruitId/", cors(), authenticateToken, async (request, response) => {
    const { fruitId } = request.params;
    const getFruitQuery = `
      SELECT 
        *
      FROM 
        fruits 
      WHERE 
        id = ${fruitId};`;
    const fruit = await db.get(getFruitQuery);
    response.send(fruit);
  });

  
  app.post("/fruits/", cors(), authenticateToken, async (request, response) => {
    const { fruitName } = request.body;
    const postFruitQuery = `
    INSERT INTO
      fruits ( fruit_name)
    VALUES
      ('${fruitName}');`;
  
    await db.run(postFruitQuery);
    const afterpost = `SELECT * FROM fruits`
    response.json(await db.all(afterpost));
    // response.send("Fruit Successfully Added");
  });
  


  app.delete("/fruits/:fruitId/",
    authenticateToken,
    async (request, response) => {
      const { fruitId } = request.params;
      const deleteFruitQuery = `
    DELETE FROM
      fruits
    WHERE
      id = ${fruitId};`;
      await db.run(deleteFruitQuery);
      const afterdelete = `SELECT * FROM fruits`
      response.json(await db.all(afterdelete));
    }
  );
  

  app.put(
    "/fruits/:fruitId/",
    authenticateToken,
    async (request, response) => {
      const {fruitName} = request.body;
      const { fruitId } = request.params;
      const updateFruitQuery = `
              UPDATE
                fruits
              SET
                fruit_name = '${fruitName}'
            WHERE
                id = ${fruitId};`;
  
      await db.run(updateFruitQuery);
      const afterput = `SELECT * FROM fruits`
      response.json(await db.all(afterput));
    //   response.send("Fruit Updated Successfully");
    }
  );
  

  module.exports = app