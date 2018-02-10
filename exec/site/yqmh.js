"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const path_1 = require("path");
const tool_1 = require("../../model/tool");
const _ = require("lodash");
const regSite = /http:\/\/www\.yqmh\.co\/shaonvmanhua\/(\d+).html/;
function valid(url) {
    return regSite.test(url);
}
exports.valid = valid;
function imgSrc(html) {
    const reg = /<img alt="(.+)" src="(.+)" \/>/g;
    for (let l of html.split('\n')) {
        // console.log(l)
        let m = reg.exec(l);
        if (m) {
            return m[2];
        }
    }
}
function getInfo(url) {
    let m = regSite.exec(url);
    if (!m) {
        return;
    }
    let id = m[1];
    let [head, tail] = url.split(id);
    return { id, head, tail };
}
async function main(bpath, outdir = '') {
    let info = getInfo(bpath);
    if (!info)
        return;
    let { head, id, tail } = info;
    let i = 1;
    do {
        let url = head + id + '_' + i + tail;
        if (i === 1) {
            url = head + id + tail;
        }
        let resp = await axios_1.default.get(url, { responseType: 'text' });
        let src = imgSrc(resp.data);
        if (src) {
            let img = await tool_1.noError(axios_1.default.get(src, { responseType: 'arraybuffer' }));
            if (!img) {
                console.log([url, src, 'error skip'].join(' -> '));
                i++;
                continue;
            }
            let fname = [outdir, id, '_', _.padStart(i.toString(), 2, '0'), path_1.extname(src)].join('');
            console.log([url, src, fname].join(' -> '));
            await tool_1.writeFile(fname, img.data);
            i++;
            continue;
        }
        break;
    } while (true);
}
exports.main = main;
