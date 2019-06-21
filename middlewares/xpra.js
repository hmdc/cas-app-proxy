const {
  Router
} = require('express');
const url = require('url');

module.exports = function (job_id) {
  return function (req, res, next) {
    const {
      originalUrl
    } = req;
    const {
      path
    } = req.query;
    const urlWithoutParams = url.parse(originalUrl).pathname;

    if (path === undefined) {
      res.redirect(urlWithoutParams + `?path=/${job_id}&top_bar=false`);
      return;
    }

    next();
    return;
  }
}
