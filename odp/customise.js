const fs = require("fs");
const cli = require("../cli/cli");
const misc = require("../utils/misc");
const jsonIO = require("../utils/json-io");
const backup = require("../utils/backupHandler");
require("colors")

var backupSelectFile = "backup.select.json"
var backupMapData = null;
var allconfigData = null;
var e = {};

e.customBackup = () => {
  backupMapData = jsonIO.read("backup.map.json");
  jsonIO.writeJSON(backupSelectFile, `{"version":"${global.version}"}`);
  cli.customise()
    .then(() => genericSelectData("Libraries", "library", backupMapData.library))
    .then(() => genericSelectData("Data formats", "dataformat", backupMapData.dataformat))
    .then(() => genericSelectData("Bookmarks", "bookmarks", backupMapData.bookmarks))
    .then(() => genericSelectData("Nano serivces", "nanoservice", backupMapData.nanoservice))
    .then(() => findDependenciesInSelection("nanoservices", "nanoservice", "dataservice"))
    .then(() => findDependenciesInSelection("nanoservices", "nanoservice", "dataformat"))
    .then(() => genericSelectData("Partners", "partner", backupMapData.partner))
    .then(() => selectFlowsFromPartners())
    .then(() => findRelatedConfigsUsedByFlows())
    .then(() => genericSelectData("Data services", "dataservice", backupMapData.dataservice))
    .then(() => findRelationShipsInDataServiceSelections())
    .then(() => findDependenciesInSelection("dataservices", "dataservice", "library"))
    .then(() => prepareFiles())
    .catch(_e => {
      misc.header("Backup completed.")
    })
}

function _readSelectedData(_key) {
  selectedData = jsonIO.readJSON(backupSelectFile);
  return selectedData[_key] || {}
}

function _writeSelectedData(_key, _data) {
  selectedData = jsonIO.readJSON(backupSelectFile);
  selectedData[_key] = _data;
  jsonIO.writeJSON(backupSelectFile, selectedData);
}

function genericSelectData(_label, _key, _data) {
  let _dataKeys = [];
  for (_k in _data) _dataKeys.push(_data[_k])
  return cli.selections(_label, _dataKeys)
    .then(_selections => {
      let selectedData = _readSelectedData(_key);
      _selections.forEach(_d => {
        for (_k in _data) {
          if (_data[_k] == _d) selectedData[_k] = _data[_k];
        }
      })
      _writeSelectedData(_key, selectedData);
    })
}

function findDependenciesInSelection(_baseKeyInBackupFile, _baseKeyInMapFile, _targetKeyInMapFile) {
  let backupDataFromFile = jsonIO.readJSON('backup.json')[_baseKeyInBackupFile];
  let targetRawDataFromMapFile = backupMapData[_targetKeyInMapFile];
  let targetRawDataKeysFromMapFile = []
  for (_k in targetRawDataFromMapFile) targetRawDataKeysFromMapFile.push(_k);

  let baseRawDataKeysFromMapFile = [];
  for (_k in _readSelectedData(_baseKeyInMapFile)) baseRawDataKeysFromMapFile.push(_k);

  let targetDataToBackup = {}

  backupDataFromFile.forEach(_backupData => {
    if (baseRawDataKeysFromMapFile.indexOf(_backupData._id) != -1) {
      let stringifiedDataService = JSON.stringify(_backupData)
      targetRawDataKeysFromMapFile.forEach(_targetRawDataId => {
        if (stringifiedDataService.indexOf(_targetRawDataId) != -1)
          targetDataToBackup[_targetRawDataId] = targetRawDataFromMapFile[_targetRawDataId];
      })
    }
  });

  let selectedTargetData = _readSelectedData(_targetKeyInMapFile);
  for (k in targetDataToBackup) selectedTargetData[k] = targetDataToBackup[k]
  _writeSelectedData(_targetKeyInMapFile, selectedTargetData)
}

function findRelationShipsInDataServiceSelections() {
  let backupDataFromFile = jsonIO.readJSON('backup.json').dataservices;
  let targetRawDataFromMapFile = backupMapData.dataservice;
  let targetRawDataKeysFromMapFile = []
  for (_k in targetRawDataFromMapFile) targetRawDataKeysFromMapFile.push(_k);

  let baseRawDataKeysFromMapFile = [];
  for (_k in _readSelectedData("dataservice")) baseRawDataKeysFromMapFile.push(_k);

  let targetDataToBackup = {}

  backupDataFromFile.forEach(_backupData => {
    if (baseRawDataKeysFromMapFile.indexOf(_backupData._id) != -1) {
      targetRawDataKeysFromMapFile.forEach(_targetRawDataId => {
        _backupData.relatedSchemas.outgoing.forEach(_outgoing => {
          if (_outgoing.service == _targetRawDataId)
            targetDataToBackup[_targetRawDataId] = targetRawDataFromMapFile[_targetRawDataId];
        })
      })
    }
  });

  let selectedTargetData = _readSelectedData("dataservice");
  for (k in targetDataToBackup) selectedTargetData[k] = targetDataToBackup[k]
  _writeSelectedData("dataservice", selectedTargetData)
}

function selectFlowsFromPartners() {
  let dataToSave = {};
  let partners = _readSelectedData("partner")
  let partnerIds = []
  for (partnerId in partners) partnerIds.push(partnerId);
  return partnerIds.reduce((_p, _partnerId, _currIndex) => {
    return _p.then(() => {
      let flows = backupMapData.flow[_partnerId]
      let flowNames = [];
      for (k in flows)
        flowNames.push(flows[k]);
      let label = `flows of partner ${partners[_partnerId]}`;
      return cli.selections(label, flowNames)
        .then(_selections => {
          _selections.forEach(_s => {
            for (_k in flows) {
              if (flows[_k] == _s) dataToSave[_k] = flows[_k]
            }
          })
          return _writeSelectedData("flow", dataToSave);
        });
    })
  }, Promise.resolve())
}

function findRelatedConfigsUsedByFlows() {
  let dataFormatsToBackUp = [];
  let dataServicesToBackUp = [];
  let nanoServicesToBackUp = [];
  let agentsToBackUp = [];

  let agentIds = [];
  for (k in backupMapData.agentID) agentIds.push(k);
  let backupFlowDataFromFile = jsonIO.readJSON('backup.json').flows;
  let backedupFlows = _readSelectedData("flow")

  for (_flowId in backedupFlows) {
    backupFlowDataFromFile.forEach(_f => {
      if (_f._id == _flowId) {
        _f.dataService.forEach(_ds => {
          if (dataServicesToBackUp.indexOf(_ds) == -1) dataServicesToBackUp.push(_ds)
        })
        _f.dataFormat.forEach(_df => {
          if (dataFormatsToBackUp.indexOf(_df) == -1) dataFormatsToBackUp.push(_df)
        })
        _f.nanoService.forEach(_df => {
          if (nanoServicesToBackUp.indexOf(_df) == -1) nanoServicesToBackUp.push(_df)
        })
        let stringifiedFlowData = JSON.stringify(_f);
        agentIds.forEach(_agent => {
          if (stringifiedFlowData.indexOf(_agent) != -1 && agentsToBackUp.indexOf(_agent) == -1) agentsToBackUp.push(_agent)
        })
      }
    })
  }

  let selectedDataServices = _readSelectedData("dataservice");
  let dataServicesFromMapFile = backupMapData.dataservice
  dataServicesToBackUp.forEach(_ds => selectedDataServices[_ds] = dataServicesFromMapFile[_ds])
  _writeSelectedData("dataservice", selectedDataServices)

  let selectedDataFormats = _readSelectedData("dataformat");
  let dataFormatsFromMapFile = backupMapData.dataformat
  dataFormatsToBackUp.forEach(_df => selectedDataFormats[_df] = dataFormatsFromMapFile[_df])
  _writeSelectedData("dataformat", selectedDataFormats)

  let selectedNanoServices = _readSelectedData("nanoservice");
  let nanoServicesFromMapFile = backupMapData.nanoservice
  nanoServicesToBackUp.forEach(_ns => selectedNanoServices[_ns] = nanoServicesFromMapFile[_ns])
  _writeSelectedData("nanoservice", selectedNanoServices)

  let selectedAgents = _readSelectedData("agentID");
  let agentIDsFromMapFile = backupMapData.agentID
  agentsToBackUp.forEach(_agent => selectedAgents[_agent] = agentIDsFromMapFile[_agent])
  _writeSelectedData("agentID", selectedAgents)
}

function prepareFiles() {
  allconfigData = jsonIO.readJSON("backup.json");
  let data = {};
  data["app"] = allconfigData["app"];
  data["groups"] = allconfigData["groups"];
  jsonIO.writeJSON('backup.tmp.json', data);

  _copyDataFromConfigToFinal("library", "library")
  _copyDataFromConfigToFinal("dataformats", "dataformat")
  _copyDataFromConfigToFinal("bookmarks", "bookmark")
  _copyDataFromConfigToFinal("nanoservices", "nanoservice")
  _copyDataFromConfigToFinal("partners", "partner")
  _copyDataFromConfigToFinal("flows", "flow")
  _copyDataFromConfigToFinal("dataservices", "dataservice")
  _copyDataServiceRolesFromConfigToFinal()
  _copyAgentsFromConfigToFinal()
  _copyPartnerSecretsFromConfigToFinal()

  fs.unlinkSync("backup.json")
  fs.renameSync("backup.tmp.json", "backup.json")
}

function _copyDataFromConfigToFinal(_key, _selectedKey) {
  let data = jsonIO.readJSON('backup.tmp.json');

  data[_key] = [];
  let selectedData = _readSelectedData(_selectedKey);
  data[_key] = allconfigData[_key].filter(_l => selectedData[_l._id])

  jsonIO.writeJSON('backup.tmp.json', data);
}

function _copyDataServiceRolesFromConfigToFinal() {
  let data = jsonIO.readJSON("backup.tmp.json");

  data["dataserviceroles"] = [];
  let selectedData = _readSelectedData("dataservice");
  data["dataserviceroles"] = allconfigData["dataserviceroles"].filter(_l => selectedData[_l.entity])

  jsonIO.writeJSON('backup.tmp.json', data);
}

function _copyAgentsFromConfigToFinal() {
  let data = jsonIO.readJSON("backup.tmp.json");

  data["agent"] = [];
  let selectedData = _readSelectedData("agentID");
  data["agent"] = allconfigData["agent"].filter(_l => selectedData[_l.agentID])

  jsonIO.writeJSON('backup.tmp.json', data);
}

function _copyPartnerSecretsFromConfigToFinal() {
  let data = jsonIO.readJSON("backup.tmp.json");

  data["partnersecrets"] = {};
  let selectedData = _readSelectedData("partner");
  for (_k in allconfigData["partnersecrets"]) {
    if (selectedData[_k]) data["partnersecrets"][_k] = allconfigData["partnersecrets"][_k]
  }

  jsonIO.writeJSON('backup.tmp.json', data);
}

module.exports = e;