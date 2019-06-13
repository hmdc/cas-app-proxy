const passport = require('passport');
const { Strategy } = require('passport-cas');

module.exports = function ({
  server_base_url,
  cas_valid_user
}) {

  passport.use(new Strategy({
    version: 'CAS3.0',
    ssoBaseURL: 'https://www.pin1.harvard.edu/cas',
    serverBaseURL: server_base_url,
    validateURL: '/serviceValidate',
    serviceURL: cas_valid_user
  }, function (login, cb) {

    switch (login.attributes.netid) {
      case cas_valid_user:
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

  return passport;
}
