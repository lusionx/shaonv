/* main
https://nhentai.net/g/233660/
预览
https://t.nhentai.net/galleries/1226654/1t.jpg

page https://nhentai.net/g/233660/1/
src org
https://i.nhentai.net/galleries/1226654/1.jpg
*/


import { alias, Cmd, Commander, length } from "@xerjs/lancer";
import axios from "axios";
import { extname } from "path";
import { writeFile } from "fs/promises";
import { packZip, axiosCatch, noError, times, doLimit } from "../lib";
import { Img } from "../types";

const regSite = /https:\/\/nhentai.net\/g\/(\d+)/;

export function valid(url: string): boolean {
    return regSite.test(url);
}

interface Info {
    id: number;
    media_id: number;
    num_pages: number;
}

@Cmd("nhentai")
export class Hent implements Commander {

    static attchCmd(arr: string[]) {
        if (arr.some(e => /nhentai\.net/.test(e))) {
            arr.push("nhentai");
        }
    }

    async execute(): Promise<void> {
        const imgs: Img[] = [];
        const bpath = this.sourceArgs.find(e => e.startsWith("https://"))!;
        const outdir = this.dir;
        try {
            const ls = await exec(bpath, outdir);
            ls.forEach(e => imgs.push(e));
        }
        catch (error) {
            console.log(axiosCatch(error));
            console.log("fetch imgs FIN!");
        }
        const mc = regSite.exec(bpath);
        if (imgs.length > 99 && mc) {
            const id = mc[1];
            console.log(`zip -m nh_${id}.zip ${id}_*.jpg`);
            return;
        }
        if (imgs.length && mc) {
            const id = mc[1];
            await packZip(outdir + "nh_" + id + ".zip", imgs);
        }
    }

    @alias("dir")
    d!: string;

    @length({ min: 2 })
    dir!: string;

    sourceArgs!: string[];

}

async function exec(bpath: string, outdir: string = "", limit: number = 5) {
    const imgs: Img[] = [];
    const mc = regSite.exec(bpath);
    if (!mc) return imgs;
    const id = mc[1];
    const mainHtml = await axios.get<string>(bpath, { responseType: "text" });
    const infoLine = mainHtml.data.split("\n").find((e) => {
        return e.includes("window._gallery");
    });
    // eslint-disable-next-line prefer-const
    let _gallery: any = {};
    if (!infoLine) return imgs;
    // eslint-disable-next-line no-eval
    eval(infoLine.replace("window.", ""));
    if (!mc) return imgs;
    const info: Info = _gallery;
    console.log("%j", info);
    const pad = info.num_pages > 99 ? 3 : 2;
    const qs = times(info.num_pages).map(i => {
        return async (): Promise<void> => {
            const index = i + 1;
            const src = `https://i.nhentai.net/galleries/${info.media_id}/${index}.jpg`;
            const img = await noError(axios.get<Buffer>(src, { responseType: "arraybuffer" }));
            if (!img) {
                console.log([bpath, src, "error skip"].join(" -> "));
                return;
            }
            const fname = [outdir, id, "_", index.toString().padStart(pad, "0"), extname(src)].join("");
            console.log([bpath, src, fname].join(" -> "));
            await writeFile(fname, img.data);
            if (info.num_pages > 99) {
                imgs.push({ fname, data: Buffer.alloc(0) });
            }
            else {
                imgs.push({ fname, data: img.data });
            }
        };
    });
    await doLimit(limit, qs);
    return imgs;
}


