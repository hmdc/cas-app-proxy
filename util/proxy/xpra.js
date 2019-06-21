module.exports = function({ proxyConfiguration, job_id }) {
    return Object.assign({}, proxyConfiguration, {
        pathRewrite: {
            [`^/${job_id}`]: '/'
        }
    });
}