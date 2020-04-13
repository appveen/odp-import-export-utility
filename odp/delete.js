const api = require("../utils/apiHandler")
const cli = require("../cli/cli");
const misc = require("../utils/misc");
const backup = require("../utils/backupHandler");
const parser = require("../utils/parser");
require("colors")

let logger = global.logger

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
    		.then(() => api.get("/api/a/rbac/app?select=name&count=-1"))
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

e.deleteGroups = () => {
		logger.info("Deleting groups")
    let URL = `/api/a/rbac/${selectedApp}/group`
    return api.get(URL, qs).then(
      _d => {
      	logger.info(`Groups to delete : ${JSON.stringify(_d)}`)
        misc.delete("Groups", _d.length)
        __delete(`/api/a/rbac/group`, _d)
      },
      _e => misc.error("Error fetching groups", _e))
}

e.deleteBookmarks = () => {
		logger.info("Deleting groups")
    let URL = `/api/a/rbac/app/${selectedApp}/bookmark`
    return api.get(URL, qs).then(
      _d => {
      	logger.info(`Bookmarks to delete : ${JSON.stringify(_d)}`)
        misc.delete("Bookmarks", _d.length)
        __delete(`/api/a/rbac/app/${selectedApp}/bookmark`, _d)
      },
      _e => misc.error("Error fetching bookmars", _e))
}

e.deleteDataServices = () => {
		logger.info("Deleting dataservice")
    let URL = "/api/a/sm/service"
    let ds_qs = {
    	count: -1,
    	filter: JSON.stringify({"app": selectedApp})
    }
    return api.put(`api/a/sm/${selectedApp}/service/stop`, {})
    .then(() => api.get(URL, ds_qs))
    .then(_data => {
    	let ids = _data.map(_d => _d._id)
    	logger.info(`Data services to delete : ${JSON.stringify(ids)}`)
    	misc.delete("Data services", _data.length)
    	let dependencyMatrix = parser.generateDependencyMatrix(_data);
	    let largestRank = dependencyMatrix.largestRank;
	    let listOfDataServices = [];
	    let i = 0
	    while (i <= largestRank) {
	        if (dependencyMatrix.list[i]) listOfDataServices.push(dependencyMatrix.list[i]);
	        i++;
	    }
	    logger.info(`listOfDataServices : ${JSON.stringify(listOfDataServices)}`)
  		return listOfDataServices.reduce((_prev, _listOfIds) => {
        return _prev.then(() => {
            return _listOfIds.reduce((_p, _c) => {
                return _p.then(_ => {
                    return api.delete(`${URL}/${_c}`)
                });
            }, Promise.resolve());
        })
    }, Promise.resolve());
    }, _e => misc.error("Error fetching Data services", _e));
}

e.deleteFlows = () => {
  logger.info("Deleting groups")
  let URL = `/api/a/pm/flow`
  return api.get(URL, qs).then(
    _d => {
    	logger.info(`Flows to delete : ${JSON.stringify(_d)}`)
      misc.delete("Flows", _d.length)
      __delete(`/api/a/rbac/app/${selectedApp}/bookmark`, _d)
    },
    _e => misc.error("Error fetching bookmars", _e))
}

e.deletePartners = () => {
    let URL = "/api/a/pm/partner"
    return api.get(URL, qs).then(
            _d => __delete(URL, _d),
            _e => misc.error("Error fetching Partners", _e))
        .then(_d => misc.delete("Partner", _d));
};

e.deleteLibrary = () => {
		logger.info("Deleting dataservice")
    let URL = "/api/a/sm/globalSchema"
    return api.get(URL, qs).then(_d => {
        logger.info(`Libraries to delete : ${JSON.stringify(_d)}`)
        misc.done("Libraries", _d.length.toString())
        __delete(URL, _d)
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

module.exports = e;