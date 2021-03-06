var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var messages = require('./lib/middleware/messages');
var session = require('express-session');
var main = require('./routes/main');
var admin = require('./routes/admin');
var port = require('./routes/port');
var account = require('./routes/account');
var dish = require('./routes/dish');
var order = require('./routes/order');
var kitchen = require('./routes/kitchen');
var auth = require('./lib/middleware/auth');
var settings = require('./settings');
var app = express();
var io = require('socket.io').listen(9527);

// io callback
require('./lib/io')(io);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('upload', path.join(__dirname, 'upload'));
app.set('settings-port', settings.port);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(settings.cookieSecret));
app.use(session({
  secret: settings.cookieSecret,
  resave:false,
  saveUninitialized: true,
  cookie: {secure: false}
}));
app.use(messages);
app.use(require('./lib/middleware/passio')(io));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/admin', auth('admin', '/account/signin?next=/admin'), admin);
app.use('/order', auth('user'), order);
app.use('/dish', dish);
app.use('/port', auth('user'), port);
app.use('/kitchen', auth('kitchen', '/account/signin?next=/kitchen'), kitchen);
app.use('/account', account);
app.use('/', main);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
