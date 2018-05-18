/* main
https://nhentai.net/g/233660/
预览
https://t.nhentai.net/galleries/1226654/1t.jpg

page https://nhentai.net/g/233660/1/
src org
https://i.nhentai.net/galleries/1226654/1.jpg
*/


import * as moment from 'moment'
import axios from 'axios'
import { basename, extname } from 'path'
import { writeFile, axiosCatch, noError } from "../../model/tool"
import { createWriteStream, unlinkSync } from 'fs'
import * as _ from "lodash"
import * as archiver from 'archiver'
import { constants } from 'http2';

const regSite = /https:\/\/nhentai.net\/g\/(\d+)/

export function valid(url: string): boolean {
    return regSite.test(url)
}

interface Img {
    fname: string
    data: Buffer
}

const imgs: Img[] = []

interface Info {
    id: number
    media_id: number
    num_pages: number
}

async function exec(bpath: string, outdir: string = '') {
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    const infoLine = mainHtml.data.split('\n').find((e) => {
        return e.includes('var gallery = new N.gallery')
    })
    if (!infoLine) return
    const mc = /(\{.*\})/.exec(infoLine)
    if (!mc) return
    const info = JSON.parse(mc[1]) as Info
    console.log(info)
}

export async function main(bpath: string, outdir: string = '') {
    try {
        await exec(bpath, outdir)
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
    if (imgs.length) {
        // await packZip()
    }
}
