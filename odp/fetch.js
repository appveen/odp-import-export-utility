const api = require("../utils/apiHandler")
const cli = require("../cli/cli");
const misc = require("../utils/misc");
const backup = require("../utils/backupHandler");
require("colors")
var ProgressBar = require('progress');

var e = {};
var selectedApp = null;
var flows = [],
    listOfSecrets = {};
var qs = {
    page: 1,
    count: -1
}

e.login = () => {
    return api.login().then(_d => {
            loginResponse = _d;
            misc.print("Logged in as", _d.username);
        })
    		.then(() => api.get("/api/a/rbac/app?select=name&count=-1"))
        .then(_d => cli.pickApp(_d))
        .then(_d => {
            selectedApp = _d;
            qs["filter"] = JSON.stringify({
                "app": selectedApp
            });
            backup.save("app", selectedApp);
        });
}

function fetchDataServices() {
    let URL = "/api/a/sm/service";
    return api.get(URL, qs).then(_d => {
        backup.save("dataservices", _d);
        _d.forEach(_ds => backup.backupMapper("dataservice", _ds._id, _ds.name))
        misc.done("Data services", _d.length.toString())
        return _d
    }, _e => misc.error("Error fetching Data services", _e))
};

function fetchRoles() {
    let URL = "/api/a/rbac/role";
    let query = {
        count: -1,
        filter: JSON.stringify({
            app: selectedApp,
            type: "appcenter"
        })
    };
    return api.get(URL, query).then(_d => {
        backup.save("dataserviceroles", _d);
        misc.done("Data service roles", _d.length.toString())
    });
};

function fetchLibrary() {
    let URL = "/api/a/sm/globalSchema";
    return api.get(URL, qs).then(_d => {
        _d.forEach(_lib => _lib.services = [])
        backup.save("library", _d);
        _d.forEach(_lib => backup.backupMapper("library", _lib._id, _lib.name))
        misc.done("Libraries", _d.length.toString())
    }, _e => misc.error("Error fetching libraries", _e));
};

function fetchAgents() {
    let URL = "/api/a/pm/agentRegistry";
    var queryString = {
        count: -1,
        filter: JSON.stringify({
            "type": "APPAGENT",
            "app": selectedApp
        })
    };
    return api.get(URL, queryString).then(_d => {
        backup.save("agent", _d);
        _d.forEach(_agent => backup.backupMapper("agent", _agent._id, _agent.name))
        _d.forEach(_agent => backup.backupMapper("agentID", _agent.agentID, _agent.name))
        misc.done("App agents", _d.length.toString())
    }, _e => misc.error("Error fetching app agents", _e));
};

function fetchDataFormats() {
    let URL = "/api/a/pm/dataFormat"
    return api.get(URL, qs).then(_d => {
        backup.save("dataformats", _d);
        _d.forEach(_ds => backup.backupMapper("dataformat", _ds._id, _ds.name))
        misc.done("Data formats", _d.length.toString())
    }, _e => misc.error("Error fetching Data formats", _e));
};

function __fetchSecrets(_listOfPartners) {
    let secretCounter = 0;
    return _listOfPartners.reduce((_prev, _partner) => {
            return _prev.then(() => {
                let listofPartnerSecrets = [];
                let listofPartnerSecretsMaps = {};
                secretCounter += _partner.secrets.length;
                return _partner.secrets.reduce((_prevSecret, _secret) => {
                        return _prevSecret.then(() => {
                            listofPartnerSecretsMaps[_secret.secretId] = _secret.name;
                            return api.get(`/api/a/sec/pm/${_partner._id}/secret/dec/${_secret.secretId}`)
                                .then(_d => {
                                    listofPartnerSecrets.push({
                                        _id: _secret.secretId,
                                        name: _secret.name,
                                        data: _d.decryptedSecret
                                    })
                                });
                        })
                    }, new Promise(r => r()))
                    .then(() => listOfSecrets[_partner._id] = listofPartnerSecrets)
                    .then(() => backup.backupMapper("partnersecret", _partner._id, listofPartnerSecretsMaps));
            })
        }, new Promise(r => r()))
        .then(() => backup.save("partnersecrets", listOfSecrets))
        .then(() => misc.done("Partner secrets", secretCounter.toString()));
};

function fetchPartners() {
    let URL = "/api/a/pm/partner"
    return api.get(URL, qs).then(_d => {
        backup.save("partners", _d);
        _d.forEach(_ds => backup.backupMapper("partner", _ds._id, _ds.name))
        _d.forEach(_ds => backup.backupMapper("partnerAgent", _ds.agentID, _ds.name))
        _d.forEach(_partner => flows = flows.concat(_partner.flows))
        misc.done("Partners", _d.length.toString())
        return __fetchSecrets(_d);
    }, _e => misc.error("Error fetching Partners", _e));
};

function fetchNanoServices() {
    let URL = "/api/a/pm/nanoService"
    return api.get(URL, qs).then(_d => {
        backup.save("nanoservices", _d);
        _d.forEach(_ds => backup.backupMapper("nanoservice", _ds._id, _ds.name))
        misc.done("Nano-services", _d.length.toString())
    }, _e => misc.error("Error fetching nano-services", _e));
};

function fetchFlows() {
    var flowData = [];
    var flowMap = {};
    return flows.reduce((_p, _c) => {
            return _p.then(_ => {
                return new Promise((_res, _rej) => {
                    let URL = `/api/a/pm/flow/${_c}`
                    return api.get(URL).then(_d => {
                        flowData.push(_d);
                        if (!flowMap[_d.partner]) flowMap[_d.partner] = {};
                        flowMap[_d.partner][_d._id] = _d.name;
                        _res();
                    }, _e => {
                        misc.error(`Error fetching Flow ${_c}`, _e)
                        _rej();
                    });
                });
            });
        }, new Promise(_res => _res()))
        .then(_ => backup.save("flows", flowData))
        .then(_ => {
            for (keys in flowMap) backup.backupMapper("flow", keys, flowMap[keys]);
        })
        .then(_ => misc.done("Flows", flows.length.toString()))
};

function fetchBookmarks() {
    var numberOfBookmarks = 0;
    var qs = {
        count: -1
    };
    return api.get(`/api/a/rbac/app/${selectedApp}/bookmark/count`, null)
        .then(_count => numberOfBookmarks = _count)
        .then(_ => api.get(`/api/a/rbac/app/${selectedApp}/bookmark`, qs))
        .then(_bookmarks => {
            backup.save("bookmarks", _bookmarks);
            _bookmarks.forEach(_d => backup.backupMapper("bookmarks", _d._id, _d.name));
        })
        .then(_ => misc.done("Bookmarks", numberOfBookmarks.toString()))
};

function fetchGroups() {
    var numberOfGroups = 0;
    var qs = {
        count: -1
    };
    return api.get(`/api/a/rbac/${selectedApp}/group/count`, null)
        .then(_count => numberOfGroups = _count - 1)
        .then(_ => api.get(`/api/a/rbac/${selectedApp}/group`, qs))
        .then(_groups => backup.save("groups", _groups))
        .then(_ => misc.done("Groups", numberOfGroups.toString()))
};

e.startMapping = () => {
  misc.print("Scanning the configurations within the app...", "")
  return fetchDataServices()
  .then(() => fetchRoles())
  .then(() => fetchLibrary())
  .then(() => fetchDataFormats())
  .then(() => fetchNanoServices())
  .then(() => fetchAgents())
  .then(() => fetchPartners())
  .then(() => fetchFlows())
  .then(() => fetchBookmarks())
  .then(() => fetchGroups())
};

module.exports = e;