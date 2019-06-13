const logger = require('morgan');

module.exports = function (app) {
  app.set('env', app.locals.environment);
  app.use(logger('common'));

  if (app.get('env') === 'production') {
    app.use(require('express-session')({
      secret: app.locals.session_secret,
      cookie: {
        secure: false,
        httpOnly: false
      },
      saveUninitialized: true,
      resave: true,
    }));
  } else {
    app.use(require('express-session')({
      secret: app.locals.session_secret,
      cookie: {},
      saveUninitialized: true,
      resave: true
    }));
  }
}
