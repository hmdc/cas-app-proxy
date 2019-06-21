const proxy = require('http-proxy-middleware');

module.exports = function ({ proxying_mode, proxy_destination, job_id }) {
  const proxyConfiguration = {
    target: proxy_destination,
    ws: true,
    pathRewrite: {},
    hostRewrite: true,
    changeOrigin: true,
    onProxyRes: undefined,
    autoRewrite: true,
    httpVersion: '1.0',
    protocolRewrite: 'https'
  };

  const mode = (proxying_mode === undefined || proxying_mode === "none") && "default" || proxying_mode;

  configuration = require(`./proxy/${mode}`)({ proxyConfiguration, job_id });

  return proxy(configuration);
}
