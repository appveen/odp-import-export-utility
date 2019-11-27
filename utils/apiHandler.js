const req = require("request-promise");
const config = require("../config.json");
const misc = require("./misc")

var logger = global.logger;

var e = {};
var token = null;

e.login = () => {
    misc.print("Server    :", `${config.name}(${config.url})`)
    logger.info(`User ${config.username} logging into ${config.name}`);
    return req({
        uri: `${config.url}/api/a/rbac/login`,
        method: "POST",
        json: true,
        body: config,
    }).then(
        _d => {
            logger.info(`User ${config.username} logged into ${config.name} successfully`)
            token = _d.token;
            return _d;
        },
        _e => {
            logger.error(`Unable to login to ${config.name}`);
            logger.error(_e.message)
            console.log(`Unable to login to ${config.name}`)
            misc.error("Error",_e.message)
            process.exit()
        }
    );
};

e.get = (_url, _qs) => {
    logger.info(`GET :: ${config.url}${_url}`)
    return req({
        method: "GET",
        uri: `${config.url}${_url}`,
        headers: {
            "Authorization": `JWT ${token}`
        },
        qs: _qs,
        json: true
    }).then(_d => {
        return _d;
    }, _e => {
        logger.error(_e.message);
        return _e.message;
    });
};

e.post = (_url, _body) => {
    logger.info(`POST :: ${config.url}${_url}`)
    return req({
        method: "POST",
        uri: `${config.url}${_url}`,
        headers: {
            "Authorization": `JWT ${token}`
        },
        body: _body,
        json: true
    }).then(_d => {
        return _d;
    }, _e => {
        logger.error(_e.message);
        logger.error(JSON.stringify(_body));
        return _e.message;
    });
};

e.put = (_url, _body) => {
    logger.info(`PUT :: ${config.url}${_url}`)
    return req({
        method: "PUT",
        uri: `${config.url}${_url}`,
        headers: {
            "Authorization": `JWT ${token}`
        },
        body: _body,
        json: true
    }).then(_d => {
        return _d;
    }, _e => {
        logger.error(_e.message);
        logger.error(JSON.stringify(_body));
        return _e.message;
    });
};

e.delete = (_url) => {
    logger.info(`DELETE :: ${config.url}${_url}`)
    return req({
        method: "DELETE",
        uri: `${config.url}${_url}`,
        headers: {
            "Authorization": `JWT ${token}`
        },
        json: true
    }).then(_d => {
        return _d;
    }, _e => {
        logger.error(_e.message);
        return _e.message;
    });
};

module.exports = e;