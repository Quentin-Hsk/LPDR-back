const express = require('express');
const app = express();
const {Datastore} = require('@google-cloud/datastore');
const cors = require('cors');
const crypto = require('crypto');

app.use(cors());


const datastore = new Datastore();

async function retrieveUser(email, password) {
    const passwdHash = crypto.createHash('sha256').update(password).digest('hex')
    const query = datastore.createQuery('user')
        .filter('email', '=', email )
        .filter('password', '=', passwdHash);
    const users = await datastore.runQuery(query);
    return users[0][0];
};

async function createUser(firstname, lastname, email, password) {
    const userKey = datastore.key('user');
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
};

async function retrieveTimeline(userId) {
    const ancestoreKey = datastore.key(['user', userId]);
    const query = datastore.createQuery('timeline')
        .limit(5)
        .hasAncestor(ancestoreKey);
    const history = await datastore.runQuery(query);
    return history[0];
};

async function addTimeline(userId, origin, destination) {
    const timelineKey = datastore.key(['user', userId, 'timeline']);
    const timeline = {
        origin,
        destination,
    }
    const entity = {
        key: timelineKey,
        data: timeline,
    }
    await datastore.insert(entity);
};

app.get('/', (req, res) => {
    res.status(200);
    res.send('Hello from App Engine!');
});

app.get('/login', (req, res) => {
    const email = req.query.email;
    const password = req.query.password;
    retrieveUser(email, password).then((user) => {
        if (user != null) {
            const userData = {
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                id: user[Datastore.KEY].id,
            }
            res.status(200);
            res.json(userData);
        }
        else {
            res.status(401);
            res.send("User not found !")
        }    
    });
});

app.post('/signup', (req, res) => {
    const firstname = req.query.firstname;
    const lastname = req.query.lastname;
    const email = req.query.email;
    const password = req.query.password;
    createUser(firstname, lastname, email, password).then(() => {
        res.status(200);
        res.send("Success");
    }, (resp) => {
        console.log(resp);
        res.status(500);
        res.send("Failure");
    });
});

app.post('/addTimeline', (req, res) => {
    const userId = parseInt(req.query.userId);
    const origin = req.query.origin;
    const destination = req.query.destination;
    addTimeline(userId, origin, destination).then(() => {
        res.status(200);
        res.send("Success");
    }, () => {
        res.status(500);
        res.send("Failure");
    });
});

app.get('/getTimeline', (req, res) => {
    const userId = parseInt(req.query.userId);
    retrieveTimeline(userId).then((timelines) => {
        if (timelines != null) {
            res.status(200);
            res.json(timelines);
        }
        else {
            res.status(401);
            res.send("Timelines not found !")
        }    
    });
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});