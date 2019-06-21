module.exports = function({ proxying_mode, job_id }) {
    if (proxying_mode === undefined || proxying_mode === "none") return undefined;
    return require(`./${proxying_mode}`)(job_id);
}