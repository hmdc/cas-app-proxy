var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var proxy = require('http-proxy-middleware');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var passport_cas = require('passport-cas');
var uuid = require('uuid');
var app = express();
var env = process.env.NODE_ENV || 'development';

app.locals.ENV = env;
app.locals.SESSION_SECRET = process.env.SESSION_SECRET || uuid.v4();
app.locals.DEST = process.env.DEST || '127.0.0.1';
app.locals.DESTPORT = process.env.DESTPORT || 8080;
app.locals.VALIDUSER = process.env.VALIDUSER;
app.locals.ENV_DEVELOPMENT = env == 'development';

const DESTURI = `http://${app.locals.DEST}:${app.locals.DESTPORT}`;

// setup passport for harvard cas
passport.use(new passport_cas.Strategy({
    version: 'CAS3.0',
    ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
    serverBaseURL: 'https://aws.sid.hmdc.harvard.edu',
    validateURL: '/serviceValidate',
    serviceURL: 'https://aws.sid.hmdc.harvard.edu'
}, function(login, cb) {
    cb(null, login.attributes.netid);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(require('express-session')({ secret: app.locals.SESSION_SECRET }));
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
            var err = new Error('User data not found in session.');
            err.status = 401;
            next(err);
        default:
            var err = new Error('User not authorized.');
            err.status = 401;
            next(err);
            break;
    }
});

app.use('/', proxy({ target: DESTURI, ws: true }));

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.json({
            error: err,
            message: err.message,
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        error: err,
        message: err.message,
    });
});


module.exports = app;