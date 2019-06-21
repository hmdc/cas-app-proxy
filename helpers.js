module.exports = {
  uppercase_headers: function transformHeadersToUppercase(req, res, next) {
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
  },
  isAuthenticated: function ({
    skip_authentication,
    cas_valid_user
  }) {
    return function (req, res, next) {
      let { user } = req;

      if (skip_authentication) {
        next();
        return;
      }

      if (user === undefined) {
        res.redirect(req.baseUrl + '/authenticate');
        return;
      }

      if (user === cas_valid_user) {
        next();
        return;
      }

      let err = new Error("Unauthorized");
      err.status = 401;
      next(err);
      return;
    }
  }
};
