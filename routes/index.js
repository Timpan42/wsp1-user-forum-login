const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../utils/database.js');
const session = require('express-session');
const validator = require('validator')
const { response } = require('../app.js');
const promisePool = pool.promise();


/* GET home page. */
router.get('/', async function (req, res) {
    res.render('index.njk', {
        titel:'Home',
        user: req.session.login || 0
    });
});

/* GET login page. */
router.get('/login', async function (req, res, next) {
    res.render('login.njk', {titel: 'Login'})
});
/* Fråga om man får loga in. */
router.post('/login', async function (req, res, next) {
    const { username, password } = req.body;

    if (username.length == 0) {
        return res.send('Username is Required')
    }
    if (password.length == 0) {
        return res.send('Password is Required')
    }

    if(username && username.length <= 3){
        return res.send('Username must be at least 3 characters')
    }
    if(password && password.length <= 3){
        return res.send('Password must be at least 3 characters')
    }

    const [user] = await promisePool.query('SELECT * FROM tf03users WHERE name = ?', [username]);

    bcrypt.compare(password, user[0].password, async function (err, result) {
        //logga in eller nåt
        if (result === true) {
            id = user[0].id
            req.session.username = username;
            req.session.userId = id;
            req.session.login = 1;
            return res.redirect('/profile');
        }
        else {
            return res.send("Invalid username or password")
        }
    })
});
// Kryptera lössenordet  
router.get('/crypt/:password', async function (req, res, next) {
    const password = req.params.password
    bcrypt.hash(password, 10, function (err, hash) {
        return res.json({ hash });
    })
});

/* GET register page. */
router.get('/register', function (req, res, next) {
    res.render('register.njk', { title: 'Register' });

});
/* Skapa ett konto i register. */
router.post('/register', async function (req, res, next) {
    const { username, password, passwordConfirmation } = req.body;

    if (username === "") {
        return res.send('Username is Required')

    }
    else if (password.length === 0) {
        return res.send('Password is Required')
    }
    if(username && username.length <= 3){
        return res.send('Username must be at least 3 characters')
    }
    if(password && password.length <= 3){
        return res.send('Password must be at least 3 characters')
    }
    else if (passwordConfirmation.length === 0) {
        return res.send('Password is Required')
    }
    else if (password !== passwordConfirmation) {
        return res.send('Passwords do not match')
    }
    

    const [user] = await promisePool.query('SELECT name FROM tf03users WHERE name = ?', [username]);

    if (user.length > 0) {
        return res.send('Username is already taken')
    } else {
        bcrypt.hash(password, 10, async function (err, hash) {
            const [creatUser] = await promisePool.query('INSERT INTO tf03users (name, password) VALUES (?, ?)', [username, hash]);
            res.redirect('/login')
        })
    }
});

/* GET profile page. */
router.get('/profile', async function (req, res, next) {
    if (req.session.login == 1) {
        res.render('profile.njk', { title: 'Profile', name: req.session.username, id: req.session.userId})
    }
    else {
        return res.status(401).send('Access denied')
    }
});
/* Om man vill loga utt från profilen*/
router.post('/profile', async function (req, res, next) {
    req.body = { logout };
});

/* GET logout page. man är ut logad*/
router.get('/logout', async function (req, res, next) {
    res.render('logout.njk', { title: 'Logout' });
    req.session.login = 0;
    req.session.username = "";
    req.session.userId = ""; 
});

/* GET delete page. */
router.get('/delete', async function (req, res, next) {

    res.render('delete.njk', { title: 'Delete' });

});
/* fråga om man kan ta bort användaren från databasen */
router.post('/delete', async function (req, res, next) {
    const { username } = req.body;
    if (req.session.login === 1) {
        const [Delet] = await promisePool.query('DELETE FROM tf03users WHERE name = ?', [username]);
        req.session.login = 0
        res.redirect('/')
    }
});
 // GET forum page
router.get('/forum', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT tf03forum.*, tf03users.name FROM tf03forum JOIN tf03users ON tf03forum.authorId = tf03users.id");
    res.render('forum.njk', {
        rows: rows,
        title: 'Forum',
    });
});

// GET new (sidan som man gör ett nytt inlägg)  
router.get('/new', async function (req, res, next) {
    if (req.session.login == 1) {
        const [users] = await promisePool.query('SELECT * FROM tf03users');
    res.render('new.njk', {
        title: 'Nytt inlägg',
        users,
    });
    }
    else {
        return res.status(401).send('Access denied')
    }
});

// her in inlägget från användaren till databasen 
router.post('/new', async function (req, res, next) {
    const { title, content } = req.body;
    let errors = [];
    
    if(title && content.length <= 1){
        errors.push('Title must be at least 1 characters')
    }
    if(content && content.length <= 1){
        errors.push('Content must be at least 1 characters')
    }
    // validatorn 
    if (errors.length === 0){
        const sanitize = (str) =>{
            let temp = str.trim();
            temp = validator.stripLow(temp);
            temp = validator.escape(temp);
            return temp;
        }
        if(title)sanTitle = sanitize(title)
        if(content)sanContent = sanitize(content)
    }

    let user = await promisePool.query('SELECT * FROM tf03users WHERE name = ?', [req.session.username]);
    if (!user) {
        user = await promisePool.query('INSERT INTO tf03users (name) VALUES (?)', [req.session.username]);
    }

    const userId = user.insertId || user[0][0].id;

    const [rows] = await promisePool.query('INSERT INTO tf03forum (authorId, title, content) VALUES (?, ?, ?)', [userId, sanTitle, sanContent]);
    res.redirect('/forum');
});



module.exports = router;
