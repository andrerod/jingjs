var fs = require('fs');
var express = require('express');
var azure = require('azure');

var app = express();

app.use(express.static(__dirname + '/public'));
app.use('/static', express.static(__dirname + '/public'));

app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.use(express.bodyParser());

app.get('/', function(req, res){
  res.render('index');
});

app.get('/background', function (req, res) {
  // TODO: implement
});

app.get('/get_username_score', function (req, res) {
  var username = req.query.username;

  var tableService = azure.createTableService();
  tableService.createTableIfNotExists('users', function () {
    tableService.queryEntity ('users', 'user', username, function (err, user) {
      if (!err && user) {
        res.json({ max_score: user.max_score });
      } else {
        res.json({ max_score: 0 });
      }
    });
  });
});

app.post('/update_username_score', function (req, res) {
  var username = req.body.username;
  var score = req.body.score;

  // TODO: update user score
});

if (!module.parent) {
  app.listen(process.env.PORT || 8080);
  console.log('Express app started on port 8080');
}