const log4js = require("log4js");
global.version = require("./package.json").version
let d = new Date();
d = d.toISOString().replace(/:/gi, "-")
let fileName = `odp_backup_restore_${d}.log`
log4js.configure({
    appenders: {
        fileOut: {
            type: 'file',
            filename: fileName,
            maxLogSize: 500000,
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
logger.level = process.env.LOGLEVEL ? process.env.LOGLEVEL : "info";
global.logger = logger;

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const odp_fetch = require("./odp/fetch")
const odp_customise = require("./odp/customise")
const odp_upsert = require("./odp/upsert")
const odp_delete = require("./odp/delete")
const backup = require("./utils/backupHandler")
const misc = require("./utils/misc")
const cli = require("./cli/cli")

misc.header(`ODP Config. Import/Export Utility ${global.version}`);

cli.pickMode()
    .then(_mode => {
        if (_mode == "Backup") _backup()
        if (_mode == "Restore") _restore()
        if (_mode == "Delete All") _delete()
    })

function _backup() {
    backup.init();
    odp_fetch.login()
    .then(() => odp_fetch.startMapping())
    .then(() => odp_customise.customBackup())
}

function _restore() {
    backup.restoreInit();
    odp_upsert.login()
        .then(() => odp_upsert.upsertLibrary())
        .then(() => odp_upsert.upsertDataFormats())
        .then(() => odp_upsert.upsertDataServices())
        .then(() => odp_upsert.upsertRoles())
        .then(() => odp_upsert.upsertNanoServices())
        .then(() => odp_upsert.upsertAgents())
        .then(() => odp_upsert.upsertPartnerSecrets())
        .then(() => odp_upsert.upsertPartners())
        .then(() => odp_upsert.upsertFlows())
        .then(() => odp_upsert.upsertBookmarks())
        .then(() => odp_upsert.upsertGroups())
        .then(() => misc.header('Restore complete!'))
}

function _delete() {
    odp_delete.login()
        .then(_ => odp_delete.deleteGroups())
        .then(_ => odp_delete.deleteBookmarks())
        .then(_ => odp_delete.deleteDataServices())
        .then(_ => odp_delete.deleteLibrary());
}