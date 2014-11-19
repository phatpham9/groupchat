// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 80;
var redis = require('redis').createClient(process.env.REDISCLOUD_PORT || 6379, process.env.REDISCLOUD_URL || '113.161.96.234', {});
var sha1 = require('sha1');

redis.on("error", function (err) {
    console.log("Redis error " + err);
});

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

var room = 'test';

// Routing-------------------------------------------------------------
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
	res.redirect('/' + sha1(new Date()));
})
app.get('/:room', function (req, res) {
	room = req.params.room;
	res.sendFile(__dirname + '/public/home.html');
})

// Chatroom------------------------------------------------------------
io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
  	var newMessage = {
      username: socket.username,
      message: data,
      dateCreated: new Date()
    };

    redis.rpush('room:' + room + ':chat_logs', JSON.stringify(newMessage));

    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', newMessage);
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username db
    redis.hset('room:' + room + ':participants', socket.username, JSON.stringify({username: socket.username}));
    redis.incr('room:' + room + ':num_participants');
    addedUser = true;

  	redis.lrange('room:' + room + ':chat_logs', 0, -1, function(err, data) {
  		socket.emit('chat log', {
	  		log: data
	  	});
  	});

    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      redis.hdel('room:' + room + ':participants', socket.username);
      redis.decr('room:' + room + ':num_participants');

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username
      });
    }
  });
});