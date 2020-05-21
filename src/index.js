const express = require('express');
const app = express();
const {Datastore} = require('@google-cloud/datastore');
const cors = require('cors');
const crypto = require('crypto');

app.use(cors());


const datastore = new Datastore();
const kind = 'user';

async function retrieveUser(email, password) {
    const passwdHash = crypto.createHash('sha256').update(password).digest('hex')
    const query = datastore.createQuery(kind)
        .filter('email', '=', email )
        .filter('password', '=', passwdHash);
    const users = await datastore.runQuery(query);
    return users[0][0];
}

async function createUser(firstname, lastname, email, password) {
    const userKey = datastore.key(kind);
    const user = {
        firstname,
        lastname,
        email,
        password: crypto.createHash('sha256').update(password).digest('hex'),
    }
    const entity = {
        key: userKey,
        data: user, 
    }
    await datastore.insert(entity);
}

app.get('/', (req, res) => {
  res.send('Hello from App Engine!');
  res.status(200);
});

app.get('/login', (req, res) => {
    const email = req.query.email;
    const password = req.query.password;
    retrieveUser(email, password).then((user) => {
        if (user != null) {
            res.json(user);
            res.status(200);
        }
        else {
            res.send("User not found !")
            res.status(401);
        }    
    });
});

app.post('/signin', (req, res) => {
    const firstname = req.query.firstname;
    const lastname = req.query.lastname;
    const email = req.query.email;
    const password = req.query.password;
    createUser(firstname, lastname, email, password).then(() => {
        res.send("Success");
        res.status(200);
    }, () => {
        res.send("Failure");
        res.status(500);
    });
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});