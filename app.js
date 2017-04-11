var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var passport_cas = require('passport-cas');

var routes = require('./routes/index');
var users = require('./routes/user');

var app = express();

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
// This will only proxy the user if the e-mail attribute matches esarmien@hmdc.harvard.edu.
// At some point this should just use the Harvard LDAP short username since it is unchangab
app.locals.DEST = process.env.DEST || '127.0.0.1';
app.locals.DESTPORT = process.env.DESTPORT || 8080;
app.locals.VALIDUSER = process.env.VALIDUSER || 'esarmien@hmdc.harvard.edu';
app.locals.ENV_DEVELOPMENT = env == 'development';

// setup passport for harvard cas
passport.use(new passport_cas.Strategy({
    version: 'CAS3.0',
    ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
    serverBaseURL: 'https://backup-service.priv.hmdc.harvard.edu',
    validateURL: '/serviceValidate',
    serviceURL: 'https://backup-service.priv.hmdc.harvard.edu',
}, function(login, cb) {
    console.log('In strategy callback: ', login);
    cb(null, login.attributes.mail);
}));

// view engine setup

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('express-session')({secret: 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());

// Authenticate
app.use('/', passport.authenticate('cas', { failureRedirect: '/#!/not-authorized' }), (req, res) => {
    res.render('index', { title: 'Express' });
});

// app.use('/', routes);
// app.use('/users', users);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title: 'error'
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
    });
});


module.exports = app;
