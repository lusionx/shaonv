
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
    return regSite.test(url)
}

async function exec(bpath: string, outdir: string = '') {
    const imgs: Img[] = []
    let mc = regSite.exec(bpath)
    if (!mc) return imgs
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    let infoLine = ''
    mc = /(window.*?)<\/script>/.exec(mainHtml.data)
    if (!mc) return imgs
    infoLine = mc[1]
    const indow = {
        eval: (e: string) => e
    }
    Object.defineProperty(String.prototype, 'splic', {
        value: function (f: any) {
            const s = this
            return decompressFromBase64(s).split(f)
        }
    })
    const SMH = {
        imgData: (e: any) => {
            info = e
            return SMH
        },
        preInit: () => { },
    }
    let info: Info | undefined
    eval(eval(infoLine.slice(1)))
    if (!info) return imgs
    console.log('%j', info)
    console.log({ Next: `${HOME}/comic/${info.bid}/${info.nextId}.html` })
    console.log({ Prev: `${HOME}/comic/${info.bid}/${info.prevId}.html` })
    for (let index = 0; index < info.files.length; index++) {
        const ee = info.files[index]
        const upath = 'https://i.hamreus.com' + encodeURI(info.path) + ee
        console.log(upath)
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
        let fname = [outdir, info.cid, '_', index.toString().padStart(2, '0'), extname(ee)].join('')
        console.log(' ', info.bname, info.cname, '->', fname)
        await writeFile(fname, resp.data)
        imgs.push({ data: resp.data, fname: fname, })
    }
    return imgs
}

export async function main(bpath: string, outdir: string = '') {
    const imgs: Img[] = []
    imgs.push(...await exec(bpath, outdir))
    try {
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
    let mc = regSite.exec(bpath)
    if (imgs.length && mc) {
        const id = mc[2]
        await packZip(outdir + 'mhgui_' + id + '.zip', imgs)
    }
}
