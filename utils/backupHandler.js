const jsonIO = require("./json-io");

var e = {};

let logger = global.logger

e.init = () => {
    jsonIO.writeJSON("backup.json", `{"version":"${global.version}"}`);
    jsonIO.writeJSON("backup.map.json", `{"version":"${global.version}"}`);
}

e.restoreInit = () => {
    jsonIO.writeJSON("restore.map.json", `{"version":"${global.version}"}`);
}

e.save = (_k, _d) => {
    let data = jsonIO.readJSON("backup.json");
    data[_k] = _d;
    jsonIO.writeJSON("backup.json", (data));
};

e.backupMapper = (_t, _k, _d) => {
    let data = jsonIO.readJSON("backup.map.json");
    if (!data[_t]) data[_t] = {};
    data[_t][_k] = _d;
    jsonIO.writeJSON("backup.map.json", (data));
    logger.info(`Updated backup.map.json : ${_t} : ${_k} : ${_d}`)
};

e.restoreMapper = (_t, _k, _d) => {
    let data = jsonIO.readJSON("restore.map.json");
    if (!data[_t]) data[_t] = {};
    data[_t][_k] = _d;
    jsonIO.writeJSON("restore.map.json", (data));
    logger.info(`Updated restore.map.json : ${_t} : ${_k} : ${_d}`)
};

e.read = _k => {
    let data = jsonIO.readJSON("backup.json");
    return data[_k];
}

module.exports = e;