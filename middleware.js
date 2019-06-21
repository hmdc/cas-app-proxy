const logger = require('morgan');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

module.exports = function (app) {
  app.set('env', app.locals.environment);
  app.use(logger('common'));
  const JobPath = `/${app.locals.job_id}`;

  if (app.get('env') === 'production') {
    app.use(session({
      store: new FileStore,
      secret: app.locals.session_secret,
      cookie: {
        secure: false,
        httpOnly: false,
        path: JobPath
      },
      saveUninitialized: true,
      resave: true,
    }));
  } else {
    app.use(session({
      store: new FileStore,
      secret: app.locals.session_secret,
      cookie: {
        path: JobPath
      },
      saveUninitialized: true,
      resave: true
    }));
  }
}
