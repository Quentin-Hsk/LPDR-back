const express = require("express");
const app = express();
const { Datastore } = require("@google-cloud/datastore");
const { Storage } = require("@google-cloud/storage");
const cors = require("cors");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const {format} = require("util");

app.use(cors());
app.use(bodyParser.json({
  extended: true,
  limit: '50mb'
}));

const datastore = new Datastore();
const storage = new Storage();

const bucket = storage.bucket("lpdr_avatar_bucket");

async function retrieveUser(email, password) {
  const passwdHash = crypto.createHash("sha256").update(password).digest("hex");
  const query = datastore
    .createQuery("user")
    .filter("email", "=", email)
    .filter("password", "=", passwdHash);
  const users = await datastore.runQuery(query);
  return users[0][0];
}

async function createUser(user) {
  const userKey = datastore.key("user");
  user.password = crypto
    .createHash("sha256")
    .update(user.password)
    .digest("hex");
  const entity = {
    key: userKey,
    data: user,
  };
  await datastore.insert(entity);
}

async function addArtwork(artwork) {
  const artworkKey = datastore.key("artwork");
  const entity = {
    key: artworkKey,
    data: artwork,
  };
  await datastore.insert(entity);
}

async function editArtwork(artwork) {
  const artworkKey = datastore.key(["artwork", datastore.int(artwork.id)]);
  const DSartwork = {
    movement: artwork.movement,
    title: artwork.title,
    author: artwork.author,
    creation: artwork.creation,
    lastEdit: artwork.lastEdit,
    tags: artwork.tags,
    description: artwork.description,
    image: artwork.image,
  };
  const entity = {
    key: artworkKey,
    data: DSartwork,
  };
  await datastore.update(entity);
}

async function retrieveArtwork(tags) {
  let query;
  if (tags !== null) {
    query = datastore
      .createQuery("artwork")
      .filter("tags", "=", tags)
      .order("lastEdit", {
        descending: true,
      });
  } else {
    query = datastore.createQuery("artwork").order("lastEdit", {
      descending: true,
    });
  }
  const artworks = await datastore.runQuery(query);
  return artworks[0];
}

app.get("/", (req, res) => {
  res.status(200);
  res.send("Hello from App Engine!");
});

app.get("/login", (req, res) => {
  const email = req.query.email;
  const password = req.query.password;
  retrieveUser(email, password).then((user) => {
    if (user != null) {
      const userData = {
        avatar: user.avatar,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        id: user[Datastore.KEY].id,
      };
      res.status(200);
      res.json(userData);
    } else {
      res.status(401);
      res.send("User not found !");
    }
  });
});

app.post("/signup", (req, res) => {
  let avatar = '';
  
  if (req.body.avatar) {
    const file = bucket.file(req.body.username + "-avatar.jpg");
    file.save(req.body.avatar, function(err) {
      if (!err) {
        // File written successfully.
        avatar = file.publicUrl();
      }
    });
   
  }

  const user = {...req.body, avatar};
  createUser(user).then(
    () => {
      res.status(200);
      res.send("Success");
    },
    (resp) => {
      console.log(resp);
      res.status(500);
      res.send("Failure");
    }
  );
});

app.post("/addArtwork", (req, res) => {
  const artwork = req.body;
  addArtwork(artwork).then(
    () => {
      res.status(200);
      res.send("Success");
    },
    () => {
      res.status(500);
      res.send("Failure");
    }
  );
});

app.post("/editArtwork", (req, res) => {
  const artwork = req.body;
  editArtwork(artwork).then(
    () => {
      res.status(200);
      res.send("Success");
    },
    (resp) => {
      res.status(500);
      res.send(resp);
    }
  );
});

app.get("/searchArtwork", (req, res) => {
  const search = req.query.search ? req.query.search : null;
  retrieveArtwork(search).then(
    (artworks) => {
        if (artworks !== null) {
            artworks = artworks.map(art => ({ ...art, id: art[Datastore.KEY].id,
            }));
            res.status(200);      
            res.json(artworks);
        }
        else {
            res.status(401);
            res.send("Artworks not found !")
        }    
    },
    () => {
      res.status(500);
      res.send("Failure");
    }
  );
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
