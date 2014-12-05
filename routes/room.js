var express = require('express');
var router = express.Router();
var sha1 = require('sha1');

router.get('/', function(req, res) {
	res.redirect('/room/' + sha1(new Date()));
});

router.get('/:room_id', function(req, res) {
	res.render('index', {title: 'Simple Groupchat with Express.js + Socket.io + Redis', room_id: req.params.room_id});
});

module.exports = router;
