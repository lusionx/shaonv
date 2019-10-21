
/**
 *
 *  -H 'Referer: https://www.manhuagui.com/'
 */
import * as moment from 'moment'
import axios from 'axios'
import { writeFile, axiosCatch, noError } from "../model/tool"
import { Img, packZip } from './lib'
import { extname, join as pathJoin, dirname } from 'path'
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
        console.log(info.name, index, upath)
        const resp = await axios.get<Buffer>(upath, {
            timeout: 1e4,
            headers: {
                Referer: HOME + '/',
                'User-Agent': 'Mozilla/5.0',
                Accept: '*/*',
            },
            responseType: 'arraybuffer'
        })
        let fname = [info.id, '_', index.toString().padStart(PAD, '0'), extname(ee)].join('')
        console.log('  ->', fname)
        await writeFile(pathJoin(outdir, fname), resp.data)
        imgs.push({ data: resp.data, fname: fname, })
    }
    return info
}

export async function main(bpath: string, outdir: string = '') {
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
