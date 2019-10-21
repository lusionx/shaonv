
/**
 *
 *  -H 'Referer: https://www.manhuagui.com/'
 */
import * as moment from 'moment'
import axios from 'axios'
import { writeFile, axiosCatch, noError } from "../model/tool"
import { Img, packZip } from './lib'
import { extname } from 'path'
import * as crypto from 'crypto'


const HOME = 'https://www.manhuadui.com'
const regSite = /^https:\/\/www.manhuadui.com\/manhua\/(.+)\/(\d+)\.html/

export function valid(url: string): boolean {
    return regSite.test(url)
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

async function exec(bpath: string, outdir: string = '') {
    const imgs: Img[] = []
    let mc = regSite.exec(bpath)
    if (!mc) return imgs
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    let infoLine = ''
    for (const e of mainHtml.data.split('\n')) {
        const mc = /<script>(.+)<\/script>/.exec(e)
        if (mc && e.includes('chapterImages')) {
            infoLine = mc[1]
        }
    }
    if (!infoLine) return imgs
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
        console.log(info.name, upath)
        const resp = await axios.get<Buffer>(upath, {
            headers: {
                Referer: HOME + '/'
            },
            responseType: 'arraybuffer'
        })
        let fname = [outdir, info.id, '_', index.toString().padStart(PAD, '0'), extname(ee)].join('')
        console.log('  ->', fname)
        await writeFile(fname, resp.data)
        imgs.push({ data: resp.data, fname: fname, })
    }
    return imgs
}

export async function main(bpath: string, outdir: string = '') {
    const imgs: Img[] = []
    try {
        imgs.push(...await exec(bpath, outdir))
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
    let mc = regSite.exec(bpath)
    if (imgs.length && mc) {
        const nn = mc[1]
        const id = mc[2]
        await packZip(outdir + 'mhd_' + nn + '_' + id + '.zip', imgs)
    }
}
