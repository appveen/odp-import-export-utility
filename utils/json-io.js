const join = require('path').join;
const read = require('fs').readFileSync;
const write = require('fs').writeFileSync;


/**
 * 
 * @param {string} filename The JSON file path
 */
function readJSON(filename) {
    const filePath = join(process.cwd(), filename);
    return JSON.parse(read(filePath));
}



/**
 * 
 * @param {string} filename The JSON file path
 * @param {object} data The JSON Data
 */
function writeJSON(filename, data) {
    if (typeof data == 'object') {
        data = JSON.stringify(data);
    }
    const filePath = join(process.cwd(), filename);
    write(filePath, data);
}

module.exports.readJSON = readJSON;
module.exports.writeJSON = writeJSON;