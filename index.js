var express = require('express')
var fs = require('fs')
var app = express()
var http = require('http').Server(app)

/*
	establish where static content is stored
*/

app.use(express.static('./'))

/*
	url handling
*/

//	app

app.get('/', function(req, res) {
	res.sendFile('index.html',{ root: __dirname })
});

//	favicon

app.get('/favicon.ico', function(req, res) {
	res.sendFile('static/img/favicon.ico',{ root: __dirname });
})

//	serve sounds

app.get('/sounds/:soundName', function(req, res) {
	var filename = './sounds' + req.params.soundName;

	fs.stat(filename, function(err, stat) {
		if (err === null) {
			res.sendFile(filename, { root: __dirname })
			return;
		}
		res.status(404).send('Not Found')
	})
})

/*
	start server
*/

http.listen(process.env.PORT || 3000, function() {
	console.log('listening on *:3000')
})
