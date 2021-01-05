require("colors")
const misc = require("../utils/misc.js");
const inquirer = require("inquirer");
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

var e = {}

const options = ["Backup", "Restore"]
// const options = ["Backup", "Restore", new inquirer.Separator(), "Delete All"]

e.pickMode = _ => {
    return inquirer.prompt([{
        type: 'list',
        name: 'mode',
        message: 'Select mode: ',
        choices: options
    }]).then(_d => {
        misc.print("Selected mode", _d.mode)
        logger.info(`Selected mode : ${_d.mode}`)
        return _d.mode;
    })
};

e.pickApp = _apps => {
    var names = _apps.map(_d => _d._id);
    names = names.sort();
    return inquirer.prompt([{
        type: 'autocomplete',
        name: 'appName',
        message: 'Select app: ',
        pageSize: 5,
        source: (_ans, _input) => {
            _input = _input || '';
            return new Promise(_res => _res(names.filter(_n => _n.indexOf(_input) > -1)));
        }
    }]).then(_d => {
        misc.print("Selected app", _d.appName)
        logger.info(`Selected app : ${_d.appName}`)
        return _d.appName;
    })
};

e.customise = _ => {
    return inquirer.prompt([{
        type: 'confirm',
        name: 'mode',
        message: 'Do you want to customise the backup?',
        default: false
    }]).then(_d => {
        logger.info(`Customization -  : ${_d.mode}`)
        if (_d.mode) return Promise.resolve();
        return Promise.reject()
    })
};

e.selections = (_type, _options) => {
    if (_options.length == 0) return Promise.resolve([])
    return inquirer.prompt([{
        type: 'checkbox',
        name: 'selections',
        message: `Select ${_type.yellow} to backup`,
        choices: _options
    }]).then(_d => {
        logger.info(`Selected : ${_d.selections}`)
        return _d.selections;
    })
};

e.init = _ => {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter Server Name',
        },
        {
            type: 'input',
            name: 'url',
            message: 'Enter Server URL',
        },
        {
            type: 'input',
            name: 'username',
            message: 'Enter Username',
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter Password',
        }
    ]).then(_d => {
        misc.print("Server Name", _d.name)
        logger.info(`Server Name : ${_d.name}`)
        misc.print("Server URL", _d.url)
        logger.info(`Server URL : ${_d.url}`)
        misc.print("Username", _d.username)
        logger.info(`Username : ${_d.username}`)
        return _d;
    })
};

module.exports = e;