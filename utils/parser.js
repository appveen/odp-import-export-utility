const read = require("fs").readFileSync;
const backup = require("./backupHandler").read;

var e = {};

var map_backup = {};
var map_restore = {};
var roles = {};

function __init() {
    map_backup = read("backup.map.json");
    map_backup = JSON.parse(map_backup);
    map_restore = read("restore.map.json");
    map_restore = JSON.parse(map_restore);
    roles = backup("dataserviceroles");
};

e.generateDependencyMatrix = _dataServices => {
    let dependencyMatrix = {
        matrix: {},
        rank: {},
        largestRank: 0,
        list: {}
    };
    _dataServices.forEach(_ds => {
        let dataServiceId = _ds._id;
        dependencyMatrix.matrix[dataServiceId] = []
        dependencyMatrix.rank[dataServiceId] = {
            self: false,
            rank: 0
        };
        if (_ds.relatedSchemas && _ds.relatedSchemas.incoming) {
            _ds.relatedSchemas.incoming.forEach(_incoming => {
                dependencyMatrix.matrix[dataServiceId].push(_incoming.service);
                if (_incoming.service == dataServiceId) dependencyMatrix.rank[dataServiceId].self = true;
                else dependencyMatrix.rank[dataServiceId].rank++;
                if (dependencyMatrix.largestRank < dependencyMatrix.rank[dataServiceId].rank) dependencyMatrix.largestRank = dependencyMatrix.rank[dataServiceId].rank;
            });
        }
    });
    for (k in dependencyMatrix.rank) {
        if (!dependencyMatrix.list[dependencyMatrix.rank[k].rank]) dependencyMatrix.list[dependencyMatrix.rank[k].rank] = [];
        dependencyMatrix.list[dependencyMatrix.rank[k].rank].push(k);
    }
    return dependencyMatrix
};

function __getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0,
        index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

function __fetchRoles(_id) {
    __init();
    let role = {}
    roles.forEach(_role => {
        if (_id == _role.entity) {
            role = {
                fields: JSON.parse(_role.fields),
                roles: _role.roles
            }
        }
    });
    return role;
};

function __getNewID(_key, _oldId) {
    __init();
    for (k_restore in map_restore[_key]) {
        if (map_restore[_key][k_restore] == map_backup[_key][_oldId]) return k_restore;
    }
    return null;
};

function __findSubstituitionPairsFromData(_key, _name, _data) {
    __init();
    let substituitionPairs = [];
    for (k in map_backup[_key]) {
        if (map_backup[_key][k] != _name) {
            var index = __getIndicesOf(k, _data);
            if (index.length) {
                let newId = __getNewID(_key, k);
                substituitionPairs.push([k, newId]);
            }
        }
    }
    return substituitionPairs;
};

e.repairDataServiceRelations = _dataService => {
    var updatedDataService = {
        name: _dataService.name,
        api: _dataService.api,
        definition: JSON.parse(_dataService.definition),
        versionValidity: _dataService.versionValidity,
        roles: __fetchRoles(_dataService._id),
        wizard: _dataService.wizard,
        preHooks: _dataService.preHooks,
        webHooks: _dataService.webHooks,
        workflowHooks: _dataService.workflowHooks
    };
    updatedDataService = JSON.stringify(updatedDataService);
    let substituitionPairs = __findSubstituitionPairsFromData("dataservice", _dataService.name, updatedDataService);
    substituitionPairs.forEach(_pair => {
        updatedDataService = updatedDataService.replace(new RegExp(_pair[0], 'g'), _pair[1])
    })
    updatedDataService = JSON.parse(updatedDataService);
    updatedDataService._id = __getNewID("dataservice", _dataService._id);
    return updatedDataService;
};

e.repairDataServiceRoles = _role => {
    _role._id = __getNewID("dataservice", _role._id);
    _role.entity = __getNewID("dataservice", _role.entity);
    return _role;
}

e.repairDataServiceLibrary = _dataService => {
    let updatedDataService = JSON.stringify(_dataService);
    let substituitionPairs = __findSubstituitionPairsFromData("library", _dataService.name, updatedDataService);
    substituitionPairs.forEach(_pair => {
        updatedDataService = updatedDataService.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });
    updatedDataService = JSON.parse(updatedDataService);
    return updatedDataService;
};

e.repairNanoService = _nanoService => {
    let nanoService = JSON.stringify(_nanoService);
    let substituitionPairs = __findSubstituitionPairsFromData("dataformat", null, nanoService);
    substituitionPairs.forEach(_pair => {
        nanoService = nanoService.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });
    substituitionPairs = __findSubstituitionPairsFromData("dataservice", null, nanoService);
    substituitionPairs.forEach(_pair => {
        nanoService = nanoService.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });
    return JSON.parse(nanoService);
};

function __findSecetSubstituitionPairs(_partnerName) {
    __init();
    let substituitionPairs = [];
    let partnerId = null;
    for (_k in map_backup.partner)
        if (map_backup.partner[_k] == _partnerName) partnerId = _k;
    let backupSecretMap = map_backup.partnersecret[partnerId];
    let restoreSecretMap = map_restore.partnersecret[partnerId];
    for (_backupKey in backupSecretMap)
        for (_restoreKey in restoreSecretMap)
            if (backupSecretMap[_backupKey] === restoreSecretMap[_restoreKey])
                substituitionPairs.push([_backupKey, _restoreKey])
    return substituitionPairs;
};

e.repairPartner = _partner => {
    let partner = JSON.stringify(_partner);
    let substituitionPairs = __findSecetSubstituitionPairs(_partner.name);
    substituitionPairs.forEach(_pair => {
        partner = partner.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });
    return JSON.parse(partner);
};

function __findPartnerAgentSubstituitionPairs(_partnerId, _flow) {
    __init();
    // find partner name and backup and restore ids
    let partnerName = map_backup.partner[_partnerId];
    // find partner agent id from backup and restore maps
    let backupPartnerAgents = map_backup.partnerAgent;
    let restorePartnerAgents = map_restore.partnerAgent;
    let backupPartnerAgentId = null;
    for (_k in backupPartnerAgents) {
        if (backupPartnerAgents[_k] == partnerName) backupPartnerAgentId = _k;
    }
    let restorePartnerAgentId = null;
    for (_k in restorePartnerAgents) {
        if (restorePartnerAgents[_k] == partnerName) restorePartnerAgentId = _k;
    }
    return [
        [backupPartnerAgentId, restorePartnerAgentId]
    ];
};

function __findAgentSubstituitionPairs(_flow) {
    __init();
    let substituitionPairs = [];
    let backupAgents = map_backup.agentID;
    let restoreAgents = map_restore.agentID;
    for (_agentId in backupAgents) {
        let indices = __getIndicesOf(_agentId, _flow);
        if (indices.length > 0) {
            for (_restoreId in restoreAgents) {
                if (restoreAgents[_restoreId] == backupAgents[_agentId])
                    substituitionPairs.push([_agentId, _restoreId])
            }
        }
    }
    return substituitionPairs;
};

e.repairFlow = _flow => {
    __init();
    let flow = JSON.stringify(_flow);
    let substituitionPairs = __findPartnerAgentSubstituitionPairs(_flow.partner, flow);
    substituitionPairs.forEach(_pair => {
        flow = flow.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });
    substituitionPairs = __findAgentSubstituitionPairs(flow);
    substituitionPairs.forEach(_pair => {
        flow = flow.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });

    substituitionPairs = __findSubstituitionPairsFromData("partner", map_backup.partner[flow.partner], flow);
    substituitionPairs.forEach(_pair => {
        flow = flow.replace(new RegExp(_pair[0], 'g'), _pair[1])
    });

    for(_mapDs in map_backup.dataservice){
      for(_restoreDs in map_restore.dataservice){
        let index = __getIndicesOf(_mapDs, flow)
        if (index.length) {
          flow = flow.replace(new RegExp(_mapDs, 'g'), _restoreDs)
        }
      }
    }

    for(_mapDF in map_backup.dataformat){
      for(_restoreDF in map_restore.dataformat){
        let index = __getIndicesOf(_mapDF, flow)
        if (index.length) {
          flow = flow.replace(new RegExp(_mapDF, 'g'), _restoreDF)
        }
      }
    }
    return JSON.parse(flow);
};

function __findGroupSubstituitionPairs(_entity) {
    let tokens = _entity.split("_");
    let newId = null;
    if (tokens[0] == "SM") newId = __getNewID("dataservice", tokens[1]);
    if (tokens[0] == "GS") newId = __getNewID("library", tokens[1]);
    if (tokens[0] == "PM") newId = __getNewID("partner", tokens[1]);
    if (tokens[0] == "DF") newId = __getNewID("dataformat", tokens[1]);
    if (tokens[0] == "NS") newId = __getNewID("nanoservice", tokens[1]);
    if (tokens[0] == "BM") newId = __getNewID("bookmarks", tokens[1]);
    if (tokens[0] == "INTR") {
        let backupFlowID = tokens[1];
        let backupPartnerID = null;
        for (_partnerID in map_backup.flow)
            if (map_backup.flow[_partnerID][backupFlowID]) backupPartnerID = _partnerID;
        let restorePartnerID = __getNewID("partner", backupPartnerID);
        let restoreFlowID = null;
        for (_flowId in map_restore.flow[restorePartnerID])
            if (map_restore.flow[restorePartnerID][_flowId] == map_backup.flow[backupPartnerID][backupFlowID]) restoreFlowID = _flowId;
        newId = restoreFlowID;
    };
    return `${tokens[0]}_${newId}`;
}

e.repairGroup = (_app, _group) => {
    _group.roles.forEach(_role => {
        _role.app = _app;
        if (_role.entity.indexOf("_") > -1)
            _role.entity = __findGroupSubstituitionPairs(_role.entity);
        if (_role.type == "appcenter" && _role.entity.indexOf("SRVC") > -1)
            _role.entity = __getNewID("dataservice", _role.entity);
    });
    return _group;
};

module.exports = e;