module.exports = function ({
  proxyConfiguration,
  job_id
}) {

  // Redirection for static assets for RStudio
  function onProxyRes(proxyRes, req, res) {
    if ([307, 308, 301, 302].indexOf(proxyRes.statusCode) == -1) {
      return;
    }

    var redirect = proxyRes.headers.location;
    redirect = redirect.replace('http://localhost:8787', `/${job_id}`);
    proxyRes.headers.location = redirect;
  }

  return Object.assign({}, proxyConfiguration, {
    pathRewrite: {
      [`^/${job_id}`]: '/'
    },
    onProxyRes: onProxyRes
  });

}