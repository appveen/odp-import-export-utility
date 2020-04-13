require("colors")
var logger = global.logger;
var e = {};

function padCount(_d) {
    if (_d.length > 1) return ` ${_d} `;
    return `  ${_d} `
}

e.print = (_pre, _post) => {
    logger.info(`${_pre} ${_post}`);
    console.log(`${_pre} ${_post.yellow}`);
};

e.done = (_msg, _count, _restore) => {
    logger.info(`Backed-up  ${padCount(_count)} ${_msg}`);
    console.log(`  ${padCount(_count).yellow} ${_msg.red}`);
};

e.delete = (_msg, _count) => {
    logger.info(`Deleted  ${padCount(_count)} ${_msg}`);
    console.log(`  ${padCount(_count).yellow} ${_msg.red}`);
};

e.error = (_pre, _post) => {
    logger.error(`${_pre}: ${_post}`);
    console.log(`${_pre}: ${_post.red}`);
};

e.upsert = (_type, _data) => {
    if (_data.mode == 1) {
        logger.info(`${_type} ${"added"} : ${_data.data.name}`);
        console.log(`${_type} ${"added".green} : ${_data.data.name}`);
    } else if (_data.mode == 2) {
        logger.info(`${_type} ${"updated"} : ${_data.data.name}`);
        console.log(`${_type} ${"updated".yellow} : ${_data.data.name}`);
    } else {
        logger.error(`${_type} ${"error"} : ${_data.data.name} : ${_data.message}`);
        console.log(`${_type} ${"error".red} : ${_data.data.name} : ${_data.message}`);
    }
};

e.restore = (_type, _data) => {
    logger.info(`${_type} ${"restored"} : ${_data.name}`);
    console.log(`${_type} ${"restored".yellow} : ${_data.name}`);
};

e.header = _s => {
    let totalWidth = 32;
    let fitLength = _s.length;
    if (_s.length % 2 != 0) {
        fitLength += 1;
        _s += " ";
    }
    let sideWidth = (totalWidth - fitLength) / 2;
    var middle = "";
    i = 0;
    while (i < fitLength) {
        middle += "─"
        i++;
    };
    let liner = "";
    let spacer = "";
    i = 0;
    while (i < sideWidth) {
        liner += "─";
        spacer += " ";
        i++;
    }
    var top = "┌" + liner + middle + liner + "┐";
    var bottom = "└" + liner + middle + liner + "┘";
    var center = "│" + spacer + _s + spacer + "│";
    console.log(top.yellow)
    console.log(center.yellow)
    console.log(bottom.yellow)
    logger.info(top)
    logger.info(center)
    logger.info(bottom)
};

module.exports = e;