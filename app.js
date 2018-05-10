var express = require('express');
var router = express.Router({
  strict: true
});
var bodyParser = require('body-parser');
var path = require('path');
var proxy = require('http-proxy-middleware');
var logger = require('morgan');
var passport = require('passport');
var passport_cas = require('passport-cas');
var uuid = require('uuid');
var app = express();
var env = process.env.NODE_ENV || 'development';

app.enable('strict routing');

app.locals.ENV = env;
app.locals.SESSION_SECRET = process.env.SESSION_SECRET || uuid.v4();
app.locals.DESTINATION = process.env.DESTINATION || 'http://localhost:8080';
app.locals.VALIDUSER = process.env.VALIDUSER;
app.locals.ENV_DEVELOPMENT = env == 'development';
app.locals.SERVICE_URL = process.env.SERVICE_URL;
app.locals.JOB_ID = process.env.JOB_ID;
app.locals.PROXYING_MODE = process.env.PROXYING_MODE || undefined;
app.locals.SKIP_AUTHENTICATION = process.env.SKIP_AUTHENTICATION || false;

// Rstudio needs special proxying.
var rstudio_onProxyRes = function (proxyRes, req, res) {
  if ([307, 308, 301, 302].indexOf(proxyRes.statusCode) == -1) {
    return;
  }

  var redirect = proxyRes.headers.location;
  redirect = redirect.replace('http://localhost:8787', app.locals.SERVICE_URL);
  proxyRes.headers.location = redirect;
};

var proxyConfiguration = {
  target: app.locals.DESTINATION,
  ws: true,
  pathRewrite: {},
  hostRewrite: true,
  changeOrigin: true,
  onProxyRes: undefined,
  autoRewrite: true,
  httpVersion: '1.0',
  protocolRewrite: 'https'
};

if (app.locals.PROXYING_MODE === 'xpra' || app.locals.PROXYING_MODE === 'rstudio') {
  proxyConfiguration['pathRewrite'][`^/${app.locals.JOB_ID}`] = '/';
}

if (app.locals.PROXYING_MODE === 'rstudio') {
  proxyConfiguration.onProxyRes = rstudio_onProxyRes;
}

// setup passport for harvard cas
passport.use(new passport_cas.Strategy({
  version: 'CAS3.0',
  ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
  serverBaseURL: 'https://aws.sid.hmdc.harvard.edu',
  validateURL: '/serviceValidate',
  serviceURL: app.locals.SERVICE_URL
}, function (login, cb) {

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

app.set('env', env);
app.set('trust proxy', 1);
app.use(logger('dev'));

if (app.get('env') === 'production') {
  app.use(require('express-session')({
    secret: 'keyboard cat',
    cookie: {
      secure: false,
      httpOnly: false
    },
    saveUninitialized: true,
    resave: true,
  }));
} else {
  app.use(require('express-session')({
    secret: 'keyboard cat',
    cookie: {},
    saveUninitialized: true,
    resave: true
  }));
}

app.use(passport.initialize());
app.use(passport.session());

function uppercase_headers(req, res, next) {
  for (oldkey in req.headers) {
    var newkey = oldkey.replace(/((?:^|-)[a-z])/g, function (val) {
      return val.toUpperCase();
    });
    newkey = newkey.replace(/(-Os-)/g, function (val) {
      return val.toUpperCase();
    });
    req.headers[newkey] = req.headers[oldkey];
    delete req.headers[oldkey];
  }
  next();
}

router.use('/authenticate', passport.authenticate('cas', {
  successRedirect: '/',
  failureRedirect: '/authentication-failure',
  failureFlash: true
}));

router.use('/authentication-failure', function (req, res, next) {
  var err = new Error('Not authorized');
  err.status = 401;
  next(err);
});

router.use('/', function (req, res, next) {
  if (req.user == undefined && app.get('SKIP_AUTHENTICATION') == false) {
    res.redirect(req.baseUrl + '/authenticate');
    return;
  }

  // Xpra proxying requires path query variable.
  if (app.locals.PROXYING_MODE === 'xpra') {
    if (req.originalUrl.match(`/${app.locals.JOB_ID}$`)) {
      res.redirect(req.originalUrl + `/?path=${app.locals.JOB_ID}`);
      return;
    }
    if (req.originalUrl.match(`/${app.locals.JOB_ID}/$`)) {
      res.redirect(req.originalUrl + `?path=${app.locals.JOB_ID}`);
      return;
    }
  }

  if (req.originalUrl.match(`/${app.locals.JOB_ID}$`)) {
    res.redirect(req.originalUrl + '/');
    return;
  }

  console.log(req.originalUrl);
  next();
});


app.use('/' + app.locals.JOB_ID, router);
app.use('/' + app.locals.JOB_ID, uppercase_headers);
app.use('/' + app.locals.JOB_ID, proxy(proxyConfiguration));

app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      error: err,
      message: err.message,
    });
  });
}

//production error handler
//no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: err,
    message: err.message,
  });
});


module.exports = app;
