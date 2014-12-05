var express = require('express');
var router = express.Router();
var sha1 = require('sha1');

router.get('/', function(req, res) {
	res.redirect('/room/' + sha1(new Date()));
});

module.exports = router;
