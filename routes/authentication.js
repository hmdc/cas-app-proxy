const {
  Router
} = require('express');

module.exports = function (passport) {
  const router = Router({
    strict: true
  });

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

  return router;
}
