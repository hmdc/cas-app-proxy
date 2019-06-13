const express = require("express");
const uuid = require('uuid');
const Passport = require('./util/passport');
const CasAuthentication = require('./routes/authentication');
const applyDefaultMiddlewareTo = require('./middleware');
const slashes = require("connect-slashes");
const proxy = require('./util/proxy');
const { isAuthenticated } = require('./helpers');
const middlewares = require('./middlewares');

module.exports = (function () {
  const app = express();

  app.enable('strict routing');
  app.set('trust proxy', 1);
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

  app.set('env', app.locals.environment);

  // Setup passport configuration.
  const passport = Passport({
    server_base_url: app.locals.server_base_url,
    cas_valid_user: app.locals.cas_valid_user
  });

  app.use(passport.initialize());
  app.use(passport.session());

  applyDefaultMiddlewareTo(app);

  const JobPath = `/${app.locals.job_id}`;

  // This will make sure trailing slash is added
  app.use(new RegExp(`^${JobPath}$`), slashes());
  // Authentication routes
  app.use(JobPath, CasAuthentication(passport));
  // Authentication middleware
  app.use(JobPath, isAuthenticated(app.locals));
  // App specific middleware, if any actually exist. Jupyter
  // doesn't need one.
  const AppMiddleware = middlewares(app.locals);
  if (AppMiddleware) app.use(JobPath, AppMiddleware);
  // Finally proxy to the application.
  app.use(JobPath, proxy(app.locals));


  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  //production error handler
  //no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      error: err,
      message: err.message,
    });
  });

  return app;
})();
