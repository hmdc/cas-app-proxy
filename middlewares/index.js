module.exports = function({ proxying_mode, job_id }) {
    if (proxying_mode === undefined) return undefined;
    return require(`./${proxying_mode}`)(job_id);
}