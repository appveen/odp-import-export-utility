const api = require("../utils/apiHandler")
const cli = require("../cli/cli");
const misc = require("../utils/misc");
const backup = require("../utils/backupHandler");
require("colors")

var e = {};
var selectedApp = null;
var qs = {
    page: 1,
    count: -1,
    select: "_id"
};


e.login = () => {
    return api.login().then(_d => {
            loginResponse = _d;
            misc.print("Logged in as", _d.username);
            return _d.apps;
        })
        .then(_d => cli.pickApp(_d))
        .then(_d => {
            selectedApp = _d;
            qs["filter"] = JSON.stringify({
                "app": selectedApp
            });
        });
};

__delete = (_api, _data) => {
    return _data.reduce((_p, _c) => {
        return _p.then(_ => {
            return new Promise(_res => api.delete(`${_api}/${_c._id}`).then(_ => _res(), _ => _res()))
        })
    }, new Promise(_res => _res())).then(_ => _data.length);
}

e.deletePartners = () => {
    let URL = "/api/a/pm/partner"
    return api.get(URL, qs).then(
            _d => __delete(URL, _d),
            _e => misc.error("Error fetching Partners", _e))
        .then(_d => misc.delete("Partner", _d));
};

e.deleteDataServices = () => {
    let URL = "/api/a/sm/service"
    return api.get(URL, qs).then(_d => {
        return __delete(URL, _d)
            .then(_len => misc.delete("Data services", _len.toString()));
    }, _e => misc.error("Error fetching Data services", _e));
}

e.deleteLibrary = () => {
    let URL = "/api/a/sm/globalSchema"
    return api.get(URL, qs).then(_d => {
        backup.save("library", _d);
        _d.forEach(_lib => backup.mapper(`lib.${_lib.name}`, _lib._id))
        misc.done("Libraries", _d.length.toString())
    }, _e => misc.error("Error fetching libraries", _e));
}

e.deleteDataFormats = () => {
    let URL = "/api/a/pm/dataFormat"
    return api.get(URL, qs).then(_d => {
        backup.save("dataformats", _d);
        _d.forEach(_ds => backup.mapper(`df.${_ds.name}`, _ds._id))
        misc.done("Data formats", _d.length.toString())
    }, _e => misc.error("Error fetching Data formats", _e));
}



e.deleteNanoServices = () => {
    let URL = "/api/a/pm/nanoService"
    return api.get(URL, qs).then(_d => {
        backup.save("nanoservices", _d);
        _d.forEach(_ds => backup.mapper(`ns.${_ds.name}`, _ds._id))
        misc.done("Nano-services", _d.length.toString())
    }, _e => misc.error("Error fetching nano-services", _e));
}

e.deleteFlows = () => {
    backup.save(`flows`, {});
    var bar = new ProgressBar('Flows [:bar] :percent :current/:total', {
        complete: '#'.gray,
        incomplete: ' ',
        total: flows.length,
        width: 50
    });
    return flows.reduce((_p, _c) => {
            return _p.then(_ => {
                return new Promise((_res, _rej) => {
                    let URL = `/api/a/pm/flow/${_c}`
                    return api.get(URL).then(_d => {
                        backup.save(`flows.${_c}`, _d);
                        backup.mapper(`flow.${_d.name}`, _d._id);
                        _res();
                        bar.tick();
                    }, _e => {
                        misc.error(`Error fetching Flow ${_c}`, _e)
                        _rej();
                    });
                });
            });
        }, new Promise(_res => _res()))
        .then(_ => misc.done("Flows", flows.length.toString()))
}

module.exports = e;