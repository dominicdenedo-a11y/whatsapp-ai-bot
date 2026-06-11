function log(...args) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`[${time}]`, ...args);
}
module.exports = { log };
