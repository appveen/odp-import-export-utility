const fs = require("fs");

var e = {};

e.init = () => {
    fs.writeFileSync("backup.json", "{}");
    fs.writeFileSync("backup.map.json", "{}");
}

e.restoreInit = () => {
    fs.writeFileSync("restore.map.json", "{}");
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
};

e.restoreMapper = (_t, _k, _d) => {
    let data = fs.readFileSync("restore.map.json");
    data = JSON.parse(data);
    if (!data[_t]) data[_t] = {};
    data[_t][_k] = _d;
    fs.writeFileSync("restore.map.json", JSON.stringify(data));
};

e.read = _k => {
    let data = fs.readFileSync("backup.json");
    data = JSON.parse(data);
    return data[_k];
}

module.exports = e;