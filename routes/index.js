const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../utils/database.js');
const session = require('express-session');
const promisePool = pool.promise();


/* GET home page. */
router.get('/', function (req, res) {
    res.render('index.njk', {titel:'Home'})
   // return res.json({ msg: 'Detta är Tim Fagerdals start sida, du är i index.js' });
});

module.exports = router;
