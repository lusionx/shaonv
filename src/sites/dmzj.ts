/* eslint-disable no-eval */
import axios from "axios";
import { packZip, axiosCatch, } from "../lib";
import { extname, join as pathJoin, basename } from "path";
import { Img } from "../types";
import { writeFile } from "fs/promises";
import { alias, Cmd, Commander, length } from "@xerjs/lancer";

//  https://manhua.dmzj.com/wodnvshen/4235.shtml

const HOME = "https://manhua.dmzj.com";
const regSite = /^https:\/\/manhua.dmzj.com\/([a-z0-9]+)\/(\d+)\.shtml$/;
const lsSite = /^https:\/\/manhua.dmzj.com\/([a-z0-9]+)\/$/;

export function valid(url: string): boolean {
    return regSite.test(url) || lsSite.test(url);
}

@Cmd("dmzj")
export class Dmzj implements Commander {
    static attchCmd(arr: string[]) {
        if (arr.some(e => regSite.test(e) || lsSite.test(e))) {
            arr.push("dmzj");
        }
    }

    async execute(): Promise<void> {
        const bpath = this.sourceArgs.find(e => e.startsWith("https://"))!;
        const outdir = this.dir;
        await fetchList(bpath);
        const imgs: Img[] = [];
        try {
            const info = await exec(imgs, bpath, outdir);
            if (!info) return;
            const mc = regSite.exec(bpath);
            if (imgs.length && mc) {
                const zp = [mc[1], "-", info.cname, "_", mc[2], ".zip"].join("");
                await packZip(pathJoin(outdir, zp), imgs);
            }
        }
        catch (error) {
            console.log(axiosCatch(error));
            console.log("fetch imgs FIN!");
        }
    }
    sourceArgs!: string[];

    @alias("dir")
    d!: string;

    @length({ min: 2 })
    dir!: string;
}

async function fetchList(bpath: string) {
    console.log("current", bpath);
    const mc = lsSite.exec(bpath);
    if (!mc) return;
    const cname = mc[1];
    const rel = new RegExp(`href="/${cname}/(\\d+).shtml"`);
    const ret = />([^>]+?)<\/a>/g;
    const mainHtml = await axios.get<string>(bpath, { responseType: "text" });
    const mp = new Map<string, string>();
    for (const e of mainHtml.data.split("\n")) {
        const mcl = rel.exec(e);
        if (!mcl) continue;
        const href = `/${cname}/${mcl[1]}.shtml`;
        const mct = ret.exec(e);
        if (mct) {
            mp.set(href, mct[1]);
        }
        else {
            e.replace(/"(.+?)"/g, (m0, m1) => {
                if (m1 !== href && m1 !== "_blank") {
                    mp.set(href, m1);
                }
                return m0;
            });
        }
    }
    for (const [href, title] of mp) {
        console.log(HOME + href, "\t", title);
    }
}

interface Info {
    files: string[];
    name: string;
    cid: number;
    cname: string;
}

async function exec(imgs: Img[], bpath: string, outdir: string = "") {
    const mc = regSite.exec(bpath);
    if (!mc) return;
    const mainHtml = await axios.get<string>(bpath, { responseType: "text" });
    let pagesLine = "";
    const gVar: string[] = ["(()=>{"];
    gVar.push("let res_id", "let chapter_id");
    for (let e of mainHtml.data.split("\n")) {
        e = e.trim();
        if (e.startsWith("eval(function(")) {
            pagesLine = "function _f" + e.slice(13, -1);
            continue;
        }
        if (e.startsWith("var g_")) {
            gVar.push(e);
            continue;
        }
    }
    if (!pagesLine) return;
    gVar.push("return {cid:+chapter_id,name:g_comic_name,cname:g_chapter_name}");
    gVar.push("})()");
    const info = eval(gVar.join("\n")) as Info;
    info.files = eval(`(function (){
        let code = ${pagesLine}
        return JSON.parse(code.slice(17,-2))
    })()`);
    const PAD = info.files.length > 99 ? 3 : 2;
    for (let index = 0; index < info.files.length; index++) {
        const ee = info.files[index];
        const upath = "https://images.dmzj.com/" + ee;
        const fname = info.cid + "_" + index.toString().padStart(PAD, "0") + extname(ee);
        console.log(info.name, index, upath, "->", fname);
        const resp = await axios.get<Buffer>(upath, {
            timeout: 1e4,
            headers: {
                "Referer": HOME + "/",
                "User-Agent": "Mozilla/5.0",
                "Accept": "*/*",
            },
            responseType: "arraybuffer"
        });

        await writeFile(pathJoin(outdir, fname), resp.data);
        imgs.push({ data: resp.data, fname: fname, });
    }
    return info;
}
