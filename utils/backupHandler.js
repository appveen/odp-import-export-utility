const fs = require("fs");

var e = {};

let logger = global.logger

e.init = () => {
    fs.writeFileSync("backup.json", `{"version":"${global.version}"}`);
    fs.writeFileSync("backup.map.json", `{"version":"${global.version}"}`);
}

e.restoreInit = () => {
    fs.writeFileSync("restore.map.json", `{"version":"${global.version}"}`);
}

e.save = (_k, _d) => {
    let data = fs.readFileSync("backup.json");
    data = JSON.parse(data);
    data[_k] = _d;
    fs.writeFileSync("backup.json", JSON.stringify(data));
};

e.backupMapper = (_t, _k, _d) => {
    let data = fs.readFileSync("backup.map.json");
    data = JSON.parse(data);
    if (!data[_t]) data[_t] = {};
    data[_t][_k] = _d;
    fs.writeFileSync("backup.map.json", JSON.stringify(data));
    logger.info(`Updated backup.map.json : ${_t} : ${_k} : ${_d}`)
};

e.restoreMapper = (_t, _k, _d) => {
    let data = fs.readFileSync("restore.map.json");
    data = JSON.parse(data);
    if (!data[_t]) data[_t] = {};
    data[_t][_k] = _d;
    fs.writeFileSync("restore.map.json", JSON.stringify(data));
    logger.info(`Updated restore.map.json : ${_t} : ${_k} : ${_d}`)
};

e.read = _k => {
    let data = fs.readFileSync("backup.json");
    data = JSON.parse(data);
    return data[_k];
}

module.exports = e;