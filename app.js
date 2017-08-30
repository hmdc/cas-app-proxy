var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var proxy = require('http-proxy-middleware');
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
app.locals.DEST = process.env.DEST || '127.0.0.1';
app.locals.DESTPORT = process.env.DESTPORT || 8080;
app.locals.VALIDUSER = process.env.VALIDUSER || 'esarmien@hmdc.harvard.edu';
app.locals.ENV_DEVELOPMENT = env == 'development';

// setup passport for harvard cas
passport.use(new passport_cas.Strategy({
    version: 'CAS3.0',
    ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
    serverBaseURL: 'https://aws.sid.hmdc.harvard.edu',
    validateURL: '/serviceValidate',
    serviceURL: 'https://aws.sid.hmdc.harvard.edu'
}, function(login, cb) {
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
app.use('/', passport.authenticate('cas', { failureRedirect: '/#!/not-authorized' }), (req, res, next) => {
    console.log(`Authenticated as ${req.user}`);
    switch (req.user) {
        case app.locals.VALIDUSER:
            next();
            break;
        case undefined:
            res.status(401).send('User information not found in session.');
            break;
        default:
            res.status(401).send('User not authorized.')
    }
});

app.use('/', proxy({target: 'http://127.0.0.1:8080', ws: true}));

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

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
