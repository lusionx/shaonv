
/**
 *
 *  -H 'Referer: https://www.manhuagui.com/'
 */
import axios from 'axios'
import { writeFile, axiosCatch, reawait } from "../model/tool"
import { Img, packZip } from './lib'
import { extname, join as pathJoin, basename } from 'path'
import * as crypto from 'crypto'


const HOME = 'https://www.manhuadui.com'
const regSite = /^https:\/\/www.manhuadui.com\/manhua\/(.+)\/(\d+)\.html/
const lsSite = /^https:\/\/www.manhuadui.com\/manhua\/([a-zA-Z0-9]+)\/$/

export function valid(url: string): boolean {
    return regSite.test(url) || lsSite.test(url)
}

interface ChapterData {
    id: number
    comic_id: number
    comic_name: string
    name: string
}

interface Info {
    chapterImages: string
    pageTitle: string
    pageId: string
    chapterPath: string
    prevChapterData: ChapterData
    nextChapterData: ChapterData
    files: string[]
    id: number
    name: string
    cid: number
    pageUrl: string
}

async function exec(imgs: Img[], bpath: string, outdir: string = '') {
    let mc = regSite.exec(bpath)
    if (!mc) return
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    let infoLine = ''
    for (const e of mainHtml.data.split('\n')) {
        const mc = /<script>(.+)<\/script>/.exec(e)
        if (mc && e.includes('chapterImages')) {
            infoLine = mc[1]
        }
    }
    if (!infoLine) return
    infoLine = ['(function () {', infoLine, 'return {chapterImages,chapterPath,pageTitle,pageId,pageUrl,prevChapterData,nextChapterData };})()'].join('\n')
    const info = eval(infoLine) as Info
    const der = crypto.createDecipheriv('aes-128-cbc', "123456781234567G", "ABCDEF1G34123412")
    let ss = der.update(info.chapterImages, 'base64', 'utf8')
    ss += der.final('utf8')
    info.files = JSON.parse(ss)
    delete info.chapterImages
    mc = /\/(\d+)\/$/.exec(info.chapterPath)
    if (mc) {
        info.id = +mc[1]
    }
    mc = /(\d+)/.exec(info.pageId)
    if (mc) {
        info.cid = +mc[1]
    }
    [info.name] = info.pageTitle.split('-')
    if (info.prevChapterData && info.prevChapterData.id) {
        console.log('prevChapterData', info.prevChapterData.name, info.pageUrl + info.prevChapterData.id + '.html')
    }
    if (info.nextChapterData && info.nextChapterData.id) {
        console.log('nextChapterData', info.nextChapterData.name, info.pageUrl + info.nextChapterData.id + '.html')
    }
    const PAD = info.files.length > 99 ? 3 : 2
    for (let index = 0; index < info.files.length; index++) {
        const ee = info.files[index]
        const upath = 'https://mhcdn.manhuazj.com/' + info.chapterPath + ee
        let fname = [info.id, '_', index.toString().padStart(PAD, '0'), extname(ee)].join('')
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

async function fetchList(bpath: string) {
    console.log('current', bpath)
    let mc = lsSite.exec(bpath)
    if (!mc) return
    let cname = mc[1]
    let rel = new RegExp(`href="/manhua/${cname}/(\\d+).html"`)
    const ret = /e="(.+?)"/g
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    const mp = new Map<string, string>()
    for (const e of mainHtml.data.split('\n')) {
        let mcl = rel.exec(e)
        if (!mcl) continue
        let href = `/manhua/${cname}/${mcl[1]}.html`
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
        console.log(HOME + href, '--', title)
    }
}

export async function main(bpath: string, outdir: string = '') {
    await fetchList(bpath)
    const imgs: Img[] = []
    try {
        const info = await exec(imgs, bpath, outdir)
        if (!info) return
        let mc = regSite.exec(bpath)
        if (imgs.length && mc) {
            const zp = 'mhd_' + mc[1] + '_' + mc[2] + '.zip'
            await packZip(pathJoin(outdir, zp), imgs)
            console.log('mv', zp, info.name + '.zip')
        }
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
}
