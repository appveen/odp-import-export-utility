const log4js = require("log4js");
let d = new Date();
let fileName = `odp_backup_restore_${d.toISOString()}.log`
log4js.configure({
    appenders: {
        fileOut: {
            type: 'file',
            filename: fileName,
            maxLogSize: 100000,
            layout: {
                type: 'basic'
            }
        },
        out: {
            type: 'stdout',
            layout: {
                type: 'basic'
            }
        }
    },
    categories: {
        default: {
            appenders: ['fileOut'],
            level: 'error'
        }
    }
});
const logger = log4js.getLogger("ODPCLI");
logger.level = "info";
global.logger = logger;

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const odp_fetch = require("./odp/fetch")
const odp_upsert = require("./odp/upsert")
const odp_delete = require("./odp/delete")
const backup = require("./utils/backupHandler")
const misc = require("./utils/misc")
const cli = require("./cli/cli")

misc.header('ODP CLI Utility');

cli.pickMode()
    .then(_mode => {
        if (_mode == "Backup") _backup()
        if (_mode == "Restore") _restore()
        if (_mode == "Delete All") _delete()
    })

function _backup() {
    backup.init();
    odp_fetch.login()
        .then(_ => odp_fetch.fetchDataServices())
        .then(_ => odp_fetch.fetchRoles())
        .then(_ => odp_fetch.fetchLibrary())
        .then(_ => odp_fetch.fetchDataFormats())
        .then(_ => odp_fetch.fetchNanoServices())
        .then(_ => odp_fetch.fetchAgents())
        .then(_ => odp_fetch.fetchPartners())
        .then(_ => odp_fetch.fetchFlows())
        .then(_ => odp_fetch.fetchBookmarks())
        .then(_ => odp_fetch.fetchGroups())
        .then(_ => misc.header('Backup complete!'))
}

function _restore() {
    backup.restoreInit();
    odp_upsert.login()
        .then(_ => odp_upsert.upsertLibrary())
        .then(_ => odp_upsert.upsertDataFormats())
        .then(_ => odp_upsert.upsertDataServices())
        .then(_ => odp_upsert.upsertRoles())
        .then(_ => odp_upsert.upsertNanoServices())
        .then(_ => odp_upsert.upsertAgents())
        .then(_ => odp_upsert.upsertPartnerSecrets())
        .then(_ => odp_upsert.upsertPartners())
        .then(_ => odp_upsert.upsertFlows())
        .then(_ => odp_upsert.upsertBookmarks())
        .then(_ => odp_upsert.upsertGroups())
        .then(_ => misc.header('Restore complete!'))
}

function _delete() {
    odp_delete.login()
        .then(_ => odp_delete.deleteDataServices());
}