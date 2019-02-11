/* main
https://nhentai.net/g/233660/
预览
https://t.nhentai.net/galleries/1226654/1t.jpg

page https://nhentai.net/g/233660/1/
src org
https://i.nhentai.net/galleries/1226654/1.jpg
*/


import axios from 'axios'
import { basename, extname } from 'path'
import { writeFile, axiosCatch, noError } from "../model/tool"
import { Img, packZip } from './lib'

const regSite = /https:\/\/nhentai.net\/g\/(\d+)/

export function valid(url: string): boolean {
    return regSite.test(url)
}

interface Info {
    id: number
    media_id: number
    num_pages: number
}

async function exec(bpath: string, outdir: string = '') {
    const imgs: Img[] = []
    let mc = regSite.exec(bpath)
    if (!mc) return imgs
    const id = mc[1]
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    const infoLine = mainHtml.data.split('\n').find((e) => {
        return e.includes('var gallery = new N.gallery')
    })
    if (!infoLine) return imgs
    mc = /(\{.*\})/.exec(infoLine)
    if (!mc) return imgs
    const info = JSON.parse(mc[1]) as Info
    for (let index = 1; index <= info.num_pages; index++) {
        const src = `https://i.nhentai.net/galleries/${info.media_id}/${index}.jpg`
        let img = await noError(axios.get<Buffer>(src, { responseType: 'arraybuffer' }))
        if (!img) {
            console.log([bpath, src, 'error skip'].join(' -> '))
            continue
        }
        let fname = [outdir, id, '_', index.toString().padStart(2, '0'), extname(src)].join('')
        console.log([bpath, src, fname].join(' -> '))
        await writeFile(fname, img.data)
        imgs.push({ fname, data: img.data })
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
        const id = mc[1]
        await packZip(outdir + 'nh_' + id + '.zip', imgs)
    }
}
