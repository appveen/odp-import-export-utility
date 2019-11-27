const api = require("../utils/apiHandler")
const cli = require("../cli/cli");
const misc = require("../utils/misc");
const backup = require("../utils/backupHandler");
const parser = require("../utils/parser");
const generator = require("./generator");

var e = {};
var selectedApp = null;

e.login = () => {
    return api.login().then(_d => {
            loginResponse = _d;
            misc.print("Logged in as", _d.username);
            return _d.apps;
        })
        .then(_d => cli.pickApp(_d))
        .then(_d => {
            selectedApp = _d;
            backup.save("app", selectedApp);
        });
};

function __strip(_data) {
    delete _data._id;
    delete _data._metadata;
    delete _data.__v;
    return _data
};

function __exists(_api, _name, _qs) {
    let qs = {
        page: 1,
        count: -1,
        select: "name",
        filter: JSON.stringify({
            "name": _name,
            "app": selectedApp
        })
    };
    if (_qs) qs = _qs;
    return api.get(_api, qs).then(_d => {
        if (_d.length > 0 && _d[0]._id) return _d[0]._id;
        else return null;
    })
};

function __upsert(_type, _api, _data, _qs) {
    return __exists(_api, _data.name, _qs)
        .then(_id => {
            logger.info(_id);
            let data = JSON.parse(JSON.stringify(_data));
            data.app = selectedApp;
            if (data.definition) data.definition = JSON.parse(data.definition);
            if (_id) {
                data._id = _id;
                if (_type == "partner") delete data.flows;
                return api.put(`${_api}/${_id}`, data)
                    .then(_d => {
                        if (_type == "dataserviceroles") _d.name = _d.entityName;
                        if (_type != "flow") backup.restoreMapper(_type, _d._id, _d.name);
                        return {
                            data: _d,
                            mode: 2
                        }
                    }, _e => {
                        return {
                            data: _data,
                            mode: 0,
                            message: _e.message
                        }
                    })
            } else {
                if (_type == "partner") data.flows = [];
                return api.post(`${_api}`, __strip(data))
                    .then(_d => {
                        if (_type == "dataserviceroles") _d.name = _d.entityName;
                        if (_type != "flow") backup.restoreMapper(_type, _d._id, _d.name)
                        return {
                            data: _d,
                            mode: 1
                        }
                    }, _e => {
                        return {
                            data: _data,
                            mode: 0,
                            message: _e.message
                        }
                    })
            }
        })
};

e.upsertLibrary = () => {
    misc.header("Libraries")
    var data = backup.read("library");
    return data.reduce((_p, _c) => {
        return _p.then(_ => {
            return __upsert("library", "/api/a/sm/globalSchema", _c, null)
                .then(_d => misc.upsert("Library", _d))
        });
    }, new Promise(_res => _res()));
}

e.upsertDataFormats = () => {
    misc.header("Data formats")
    var data = backup.read("dataformats");
    return data.reduce((_p, _c) => {
        return _p.then(_ => {
            return __upsert("dataformat", "/api/a/pm/dataFormat", _c, null)
                .then(_d => misc.upsert("Data format", _d))
        });
    }, new Promise(_res => _res()));
};

function __createDataServices(_listOfDataServices, _data) {
    return _listOfDataServices.reduce((_prev, _listOfIds) => {
        return _prev.then(() => {
            return _listOfIds.reduce((_p, _c) => {
                return _p.then(_ => {
                    let data = {};
                    _data.forEach(_d => {
                        if (_d._id == _c) data = _d;
                    });
                    data = generator.generateSampleDataService(data.name, data.api, selectedApp);
                    return __exists("/api/a/sm/service", data.name, null)
                        .then(_d => {
                            if (!_d) {
                                return api.post("/api/a/sm/service", data)
                                    .then(_d => backup.restoreMapper("dataservice", _d._id, _d.name))
                            } else backup.restoreMapper("dataservice", _d, data.name)
                        });
                });
            }, new Promise(_r => _r()));
        })
    }, new Promise(_r => _r()));
};

function __updateDataServices(_listOfDataServices, _data) {
    return _listOfDataServices.reduce((_prev, _listOfIds) => {
        return _prev.then(() => {
            return _listOfIds.reduce((_p, _c) => {
                let data = {};
                _data.forEach(_d => {
                    if (_d._id == _c) data = _d;
                });
                return _p.then(_ => {
                    let dataService = parser.repairDataServiceRelations(data);
                    dataService = parser.repairDataServiceLibrary(dataService);
                    return api.put("/api/a/sm/service/" + dataService._id, dataService)
                        .then(_d => misc.restore("Data service", _d));
                });
            }, new Promise(_res => _res()));
        })
    }, new Promise(_r => _r()));
};

e.upsertDataServices = () => {
    misc.header("Data services")
    var data = backup.read("dataservices");
    dependencyMatrix = parser.generateDependencyMatrix(data);
    let largestRank = dependencyMatrix.largestRank;
    let listOfDataServices = [];
    while (largestRank >= 0) {
        if (dependencyMatrix.list[largestRank]) listOfDataServices.push(dependencyMatrix.list[largestRank]);
        largestRank--;
    }
    return __createDataServices(listOfDataServices, data)
        .then(_ => __updateDataServices(listOfDataServices, data));
};

e.upsertRoles = () => {
    misc.header("Roles");
    var data = backup.read("dataserviceroles");
    return data.reduce((_prev, _role) => {
        return _prev.then(_ => {
            let repairedRole = parser.repairDataServiceRoles(_role);
            delete repairedRole._metadata;
            delete repairedRole._v;
            let qs = {
                page: 1,
                count: -1,
                select: "entityName",
                filter: JSON.stringify({
                    "_id": repairedRole._id,
                    "app": selectedApp
                })
            };
            return __upsert("dataserviceroles", "/api/a/rbac/role", repairedRole, qs)
                .then(_d => misc.upsert("Data service role", _d));
        })
    }, new Promise(_r => _r()));
};

e.upsertNanoServices = () => {
    misc.header("Nano-services");
    var data = backup.read("nanoservices");
    return data.reduce((_prev, _nanoService) => {
        return _prev.then(_ => {
            let repairedNanoService = parser.repairNanoService(_nanoService);
            return __upsert("nanoservice", "/api/a/pm/nanoService", repairedNanoService, null)
                .then(_d => misc.upsert("Nano-service", _d));
        })
    }, new Promise(_r => _r()));
};

e.upsertAgents = () => {
    misc.header("Agents");
    var data = backup.read("agent");
    return data.reduce((_prev, _agent) => {
        return _prev.then(_ => {
            let agentData = JSON.parse(JSON.stringify(_agent));
            agentData = __strip(agentData);
            delete agentData.ipAddress;
            delete agentData.macAddress;
            delete agentData.lastInvokedAt;
            delete agentData.status;
            delete agentData.agentID;
            return __upsert("agent", "/api/a/pm/agentRegistry", agentData, null)
                .then(_agent => {
                    backup.restoreMapper("agentID", _agent.data.agentID, _agent.data.name)
                    return _agent;
                })
                .then(_d => misc.upsert("Agent", _d));
        })
    }, new Promise(_r => _r()));
};

function __createSecrets(_partnerId, _secrets) {
    let listofPartnerSecretsMaps = {};
    return _secrets.reduce((_prev, _secret) => {
            return _prev.then(() => {
                let secretPayload = {
                    app: selectedApp,
                    data: _secret.data
                };
                return api.post(`/api/a/sec/pm/${_partnerId}/secret/enc`, secretPayload)
                    .then(_d => listofPartnerSecretsMaps[_d.id] = _secret.name)
                    .then(() => misc.restore("Secret", _secret));
            });
        }, new Promise(r => r()))
        .then(() => backup.restoreMapper("partnersecret", _partnerId, listofPartnerSecretsMaps))
};

e.upsertPartnerSecrets = () => {
    misc.header("Partner secrets");
    var data = backup.read("partnersecrets");
    let promises = [];
    for (_partnerId in data) promises.push(__createSecrets(_partnerId, data[_partnerId]));
    return Promise.all(promises);
};

e.upsertPartners = () => {
    misc.header("Partners");
    var data = backup.read("partners");
    return data.reduce((_prev, _partner) => {
        return _prev.then(_ => {
            let partner = JSON.parse(JSON.stringify(_partner));
            partner = __strip(partner);
            partner.app = selectedApp;
            delete partner.agentID;
            partner = parser.repairPartner(partner);
            return __upsert("partner", "/api/a/pm/partner", partner, null)
                .then(_d => {
                    backup.restoreMapper("partnerAgent", _d.data.agentID, _d.data.name)
                    misc.upsert("Partner", _d)
                });
        });
    }, new Promise(_r => _r()));
};

e.upsertFlows = () => {
    let flowMap = {};
    misc.header("Flows");
    var data = backup.read("flows");
    return data.reduce((_prev, _flow) => {
            return _prev.then(_ => {
                let flow = JSON.parse(JSON.stringify(_flow));
                flow = __strip(flow);
                flow.app = selectedApp;
                flow = parser.repairFlow(flow);
                delete flow.port;
                let qs = {
                    page: 1,
                    count: -1,
                    select: "name",
                    filter: JSON.stringify({
                        "name": flow.name,
                        "app": selectedApp,
                        "partner": flow.partner
                    })
                };
                return __upsert("flow", "/api/a/pm/flow", flow, qs)
                    .then(_d => {
                        misc.upsert("Flow", _d)
                        if (!flowMap[_d.data.partner]) flowMap[_d.data.partner] = {};
                        flowMap[_d.data.partner][_d.data._id] = _d.data.name;
                    })
            });
        }, new Promise(_r => _r()))
        .then(_ => {
            for (keys in flowMap) backup.restoreMapper("flow", keys, flowMap[keys]);
        });
};

e.upsertBookmarks = () => {
    misc.header("Bookmarks");
    var data = backup.read("bookmarks");
    return data.reduce((_p, _c) => {
        return _p.then(_ => {
            return __upsert("bookmarks", `/api/a/rbac/app/${selectedApp}/bookmark`, _c, null)
                .then(_d => misc.upsert("Bookmark", _d))
        });
    }, new Promise(_res => _res()));
};

e.upsertGroups = () => {
    misc.header("Groups");
    var data = backup.read("groups");
    return data.reduce((_prev, _group) => {
        return _prev.then(_ => {
            let group = JSON.parse(JSON.stringify(_group));
            if (_group.name != "#") {
                group = parser.repairGroup(selectedApp, group);
                group.app = selectedApp;
                group.users = [];
                return __upsert("groups", "/api/a/rbac/group", group, null)
                    .then(_d => misc.upsert("Groups", _d))
            } else return true;
        });
    }, new Promise(_r => _r()));
}

module.exports = e;