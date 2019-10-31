
/**
 *
 * curl 'https://i.hamreus.com/ps2/y/ysjjjwax_ccxz/%E7%AC%AC15%E8%AF%9D/03_062.jpg.webp?cid=415396&md5=1IebumjGeZ2O0W4Hd4cBYQ'
 *  -H 'Referer: https://www.manhuagui.com/'
 */
import * as moment from 'moment'
import axios from 'axios'
import { writeFile, axiosCatch, noError } from "../model/tool"
import { Img, packZip } from './lib'
import { decompressFromBase64 } from 'lz-string'
import { extname } from 'path'

const HOME = 'https://www.manhuagui.com'
const regSite = /https:\/\/www.manhuagui.com\/comic\/(\d+)\/(\d+)\.html/
const regList = /https:\/\/www.manhuagui.com\/comic\/(\d+)/

interface Info {
    bid: number;
    bname: string;
    bpic: string;
    cid: number;
    cname: string;
    files: string[];
    finished: boolean;
    len: number;
    path: string;
    status: number;
    block_cc: string;
    nextId: number;
    prevId: number;
    sl: {
        md5: string;
    }
}

export function valid(url: string): boolean {
    return regSite.test(url) || regList.test(url)
}

let splic = false

async function exec(imgs: Img[], bpath: string, outdir: string = '') {
    let mc = regSite.exec(bpath)
    if (!mc) return
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    let infoLine = ''
    mc = /(window.*?)<\/script>/.exec(mainHtml.data)
    if (!mc) return
    infoLine = mc[1]
    const indow = {
        eval: (e: string) => e
    }
    if (!splic) {
        Object.defineProperty(String.prototype, 'splic', {
            value: function (f: any) {
                const s = this
                return decompressFromBase64(s).split(f)
            }
        })
        splic = true
    }
    const SMH = {
        imgData: (e: any) => {
            info = e
            return SMH
        },
        preInit: () => { },
    }
    let info: Info | undefined
    eval(eval(infoLine.slice(1)))
    if (!info) return
    console.log('%j', info)
    console.log("Prev", `${HOME}/comic/${info.bid}/${info.prevId}.html`, "\t\tNext", `${HOME}/comic/${info.bid}/${info.nextId}.html`)
    const PAD = info.files.length > 99 ? 3 : 2
    for (let index = 0; index < info.files.length; index++) {
        const ee = info.files[index]
        const upath = 'https://i.hamreus.com' + encodeURI(info.path) + ee
        let fname = [outdir, info.cid, '_', index.toString().padStart(PAD, '0'), extname(ee)].join('')
        console.log(info.bname, info.cname, upath, '\t', fname)
        const resp = await axios.get<Buffer>(upath, {
            params: {
                cid: info.cid,
                md5: info.sl.md5,
            },
            headers: {
                Referer: HOME + '/'
            },
            responseType: 'arraybuffer'
        })
        await writeFile(fname, resp.data)
        imgs.push({ data: resp.data, fname: fname, })
    }
    console.log("Prev", `${HOME}/comic/${info.bid}/${info.prevId}.html`, "Next", `${HOME}/comic/${info.bid}/${info.nextId}.html`)
    return info
}

async function fetchList(bpath: string) {
    console.log('current', bpath)
    let mc = regList.exec(bpath)
    if (!mc) return
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    const li = /<li>(<a href="\/comic\/.*)$/
    const rel = /href="(.+?)"/
    const til = /title="(.+?)"/
    for (const str of mainHtml.data.split('</li>')) {
        const a = li.exec(str)
        if (!a) continue
        let mf = rel.exec(a[1])
        let mt = til.exec(a[1])
        if (mf && mt) {
            console.log('href', HOME + mf[1], mt[1])
        }
    }
}

export async function main(bpath: string, outdir: string = '') {
    await fetchList(bpath)
    const imgs: Img[] = []
    try {
        const info = await exec(imgs, bpath, outdir)
        if (!info) return
        const id = info.cid
        const cname = info.cname.replace(/ /g, '')
        await packZip(outdir + 'mhgui_' + id + '_' + cname + '.zip', imgs)
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
}
