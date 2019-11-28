import axios from 'axios'
import { writeFile, axiosCatch, reawait } from "../model/tool"
import { Img, packZip } from './lib'
import { extname, join as pathJoin, basename } from 'path'
import * as crypto from 'crypto'

//  https://manhua.dmzj.com/wodnvshen/4235.shtml

const HOME = 'https://manhua.dmzj.com'
const regSite = /^https:\/\/manhua.dmzj.com\/([a-z0-9]+)\/(\d+)\.shtml$/
const lsSite = /^https:\/\/manhua.dmzj.com\/([a-z0-9]+)\/$/

export function valid(url: string): boolean {
    return regSite.test(url) || lsSite.test(url)
}

async function fetchList(bpath: string) {
    console.log('current', bpath)
    let mc = lsSite.exec(bpath)
    if (!mc) return
    let cname = mc[1]
    let rel = new RegExp(`href="/${cname}/(\\d+).shtml"`)
    const ret = />([^>]+?)<\/a>/g
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    const mp = new Map<string, string>()
    for (const e of mainHtml.data.split('\n')) {
        let mcl = rel.exec(e)
        if (!mcl) continue
        let href = `/${cname}/${mcl[1]}.shtml`
        let mct = ret.exec(e)
        if (mct) {
            mp.set(href, mct[1])
        } else {
            e.replace(/"(.+?)"/g, (m0, m1) => {
                if (m1 !== href && m1 !== "_blank") {
                    mp.set(href, m1)
                }
                return m0
            })
        }
    }
    for (const [href, title] of mp) {
        console.log(HOME + href, '\t', title)
    }
}

interface Info {
    files: string[]
    name: string
    cid: number
    cname: string
}

async function exec(imgs: Img[], bpath: string, outdir: string = '') {
    let mc = regSite.exec(bpath)
    if (!mc) return
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    let pagesLine = ''
    let gVar: string[] = ['(()=>{']
    gVar.push('let res_id', 'let chapter_id')
    for (let e of mainHtml.data.split('\n')) {
        e = e.trim()
        if (e.startsWith('eval(function(')) {
            pagesLine = 'function _f' + e.slice(13, -1)
            continue
        }
        if (e.startsWith('var g_')) {
            gVar.push(e)
            continue
        }
    }
    if (!pagesLine) return
    gVar.push('return {cid:+chapter_id,name:g_comic_name,cname:g_chapter_name}')
    gVar.push('})()')
    let info = eval(gVar.join('\n')) as Info
    info.files = eval(`(function (){
        let code = ${pagesLine}
        return JSON.parse(code.slice(17,-2))
    })()`)
    const PAD = info.files.length > 99 ? 3 : 2
    for (let index = 0; index < info.files.length; index++) {
        const ee = info.files[index]
        const upath = 'https://images.dmzj.com/' + ee
        let fname = info.cid + '_' + index.toString().padStart(PAD, '0') + extname(ee)
        console.log(info.name, index, upath, '->', fname)
        const resp = await reawait(3, 400, async () => {
            return await axios.get<Buffer>(upath, {
                timeout: 1e4,
                headers: {
                    Referer: HOME + '/',
                    'User-Agent': 'Mozilla/5.0',
                    Accept: '*/*',
                },
                responseType: 'arraybuffer'
            })
        })
        await writeFile(pathJoin(outdir, fname), resp.data)
        imgs.push({ data: resp.data, fname: fname, })
    }
    return info
}

export async function main(bpath: string, outdir: string = '') {
    await fetchList(bpath)
    const imgs: Img[] = []
    try {
        const info = await exec(imgs, bpath, outdir)
        if (!info) return
        let mc = regSite.exec(bpath)
        if (imgs.length && mc) {
            const zp = [mc[1], '-', info.cname, '_', mc[2], '.zip'].join('')
            await packZip(pathJoin(outdir, zp), imgs)
        }
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
}
