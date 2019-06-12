const express = require('express');
const router = express.Router({
  strict: true
});
const url = require('url');
const proxy = require('http-proxy-middleware');
const logger = require('morgan');
const passport = require('passport');
const passport_cas = require('passport-cas');
const uuid = require('uuid');
const app = express();
const slashes = require("connect-slashes");

app.enable('strict routing');
app.locals = {
  environment: process.env.NODE_ENV || 'development',
  session_secret: process.env.EXPRESS_SESSION_SECRET || uuid.v4(),
  proxy_destination: process.env.PROXY_DESTINATION || 'http://localhost:8080',
  cas_valid_user: process.env.CAS_VALID_USER,
  server_base_url: process.env.CAS_SERVER_BASE_URL,
  service_url: process.env.CAS_SERVICE_URL,
  job_id: process.env.JOB_ID,
  proxying_mode: process.env.PROXYING_MODE,
  skip_authentication: process.env.SKIP_AUTHENTICATION || false
};

//app.locals.ENV = env;
//app.locals.SESSION_SECRET = process.env.SESSION_SECRET || uuid.v4();
//app.locals.DESTINATION = process.env.DESTINATION || 'http://localhost:8080';
//app.locals.VALIDUSER = process.env.VALIDUSER;
//app.locals.ENV_DEVELOPMENT = env == 'development';
//app.locals.SERVICE_URL = process.env.SERVICE_URL;
//app.locals.JOB_ID = process.env.JOB_ID;
//app.locals.PROXYING_MODE = process.env.PROXYING_MODE || undefined;
//app.locals.SKIP_AUTHENTICATION = process.env.SKIP_AUTHENTICATION || false;

// Rstudio needs special proxying.
var rstudio_onProxyRes = function (proxyRes, req, res) {
  if ([307, 308, 301, 302].indexOf(proxyRes.statusCode) == -1) {
    return;
  }

  var redirect = proxyRes.headers.location;
  redirect = redirect.replace('http://localhost:8787', `/${app.locals.job_id}`);
  proxyRes.headers.location = redirect;
};

var proxyConfiguration = {
  target: app.locals.proxy_destination,
  ws: true,
  pathRewrite: {},
  hostRewrite: true,
  changeOrigin: true,
  onProxyRes: undefined,
  autoRewrite: true,
  httpVersion: '1.0',
  protocolRewrite: 'https'
};

if (app.locals.proxying_mode === 'xpra' || app.locals.proxying_mode === 'rstudio') {
  proxyConfiguration['pathRewrite'][`^/${app.locals.job_id}`] = '/';
}

if (app.locals.proxying_mode === 'rstudio') {
  proxyConfiguration.onProxyRes = rstudio_onProxyRes;
}

// setup passport for harvard cas
passport.use(new passport_cas.Strategy({
  version: 'CAS3.0',
  ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
  serverBaseURL: app.locals.server_base_url,
  validateURL: '/serviceValidate',
  serviceURL: app.locals.service_url
}, function (login, cb) {

  switch (login.attributes.netid) {
    case app.locals.cas_valid_user:
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

app.set('env', app.locals.environment);
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
  const {
    skip_authentication
  } = app.locals;
  const {
    user
  } = req;
  const {
    path
  } = req.query;

  if (user === undefined && skip_authentication === false) {
    res.redirect(req.baseUrl + '/authenticate');
    return;
  }

  // Xpra proxying requires path query variable.
  // This will also disable the Xpra top bar in the HTML5 client.

  if (app.locals.proxying_mode === 'xpra' && path === undefined) {
    const {
      originalUrl
    } = req;
    const urlWithoutParams = url.parse(originalUrl).pathname;
    res.redirect(urlWithoutParams + `?path=/${app.locals.job_id}&top_bar=false`);
    return;
  }

  next();
});


const JobPath = `/${app.locals.job_id}`;
// This will make sure trailing slash is added
app.use(new RegExp(`^${JobPath}$`), slashes());
app.use(JobPath, router);
app.use(JobPath, uppercase_headers);
app.use(JobPath, proxy(proxyConfiguration));

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
