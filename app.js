var express = require('express');
var path = require('path');
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
app.locals.DESTPORT = process.env.DESTPORT || 9000;
app.locals.VALIDUSER = process.env.VALIDUSER;
app.locals.ENV_DEVELOPMENT = env == 'development';
app.locals.SERVICE_URL = process.env.SERVICE_URL;
app.locals.BASE_URL = process.env.BASE_URL;
app.locals.JOB_ID = process.env.JOB_ID;

const DESTURI = `http://${app.locals.DEST}:${app.locals.DESTPORT}`;

// setup passport for harvard cas
passport.use(new passport_cas.Strategy({
    version: 'CAS3.0',
    ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
    serverBaseURL: 'https://aws.sid.hmdc.harvard.edu',
    validateURL: '/serviceValidate',
    serviceURL: app.locals.SERVICE_URL
}, function(login, cb) {

    switch (login.attributes.netid) {
        case app.locals.VALIDUSER:
            cb(null, login.attributes.netid);
            break;
        case undefined:
            var err = new Error('User data not found in session.');
            err.status = 401;
            cb(err);
        default:
            var err = new Error('User not authorized.');
            err.status = 401;
            cb(err);
            break;
    }

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
app.use(require('express-session')({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());


app.use(app.locals.JOB_ID + '/authenticate', passport.authenticate('cas', {
    successRedirect: app.locals.BASE_URL,
    failureRedirect: '/authentication-failure',
    failureFlash: true
}));

app.use(app.locals.JOB_ID + '/authentication-failure', function(req, res, next) {
    var err = new Error('Not authorized');
    err.status = 401;
    next(err);
});

app.use(app.locals.JOB_ID + '/', function(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect(app.locals.SERVICE_URL);
    }
});

app.use(app.locals.JOB_ID + '/', proxy({ target: DESTURI, ws: true }));

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