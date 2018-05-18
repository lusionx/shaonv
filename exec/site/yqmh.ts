import * as moment from 'moment'
import axios from 'axios'
import { basename, extname } from 'path'
import { writeFile, axiosCatch, noError } from "../../model/tool"
import { createWriteStream, unlinkSync } from 'fs'
import * as _ from "lodash"
import * as archiver from 'archiver'
import { constants } from 'http2';

const regSite = /http:\/\/www\.yqmh\.co\/shaonvmanhua\/(\d+).html/


export function valid(url: string): boolean {
    return regSite.test(url)
}

function imgSrc(html: string) {
    const reg = /<img alt="(.+)" src="(.+)" \/>/g
    for (let l of html.split('\n')) {
        // console.log(l)
        let m = reg.exec(l)
        if (m) {
            return m[2]
        }
    }
}

function getInfo(url: string) {
    let m = regSite.exec(url)
    if (!m) { return }
    let id = m[1]
    let [head, tail] = url.split(id)
    return { id, head, tail }
}

interface Img {
    fname: string
    data: Buffer
}

const imgs: Img[] = []

async function exec(bpath: string, outdir: string = '') {
    let info = getInfo(bpath)
    if (!info) return
    let { head, id, tail } = info
    let i = 1
    do {
        let url = head + id + '_' + i + tail
        if (i === 1) {
            url = head + id + tail
        }
        let resp = await axios.get<string>(url, { responseType: 'text' })
        let src = imgSrc(resp.data)
        if (src) {
            let img = await noError(axios.get<Buffer>(src, { responseType: 'arraybuffer' }))
            if (!img) {
                console.log([url, src, 'error skip'].join(' -> '))
                i++
                continue
            }
            let fname = [outdir, id, '_', _.padStart(i.toString(), 2, '0'), extname(src)].join('')
            console.log([url, src, fname].join(' -> '))
            await writeFile(fname, img.data)
            imgs.push({ fname, data: img.data })
            i++
        }
        // if (i === 3) break
    } while (true)
}

function packZip() {
    return new Promise<void>((res, rej) => {
        let aimg = imgs[0]
        const zip = archiver('zip')
        const output = createWriteStream(aimg.fname.replace('01' + extname(aimg.fname), '.zip'))
        output.on('close', function () {
            console.log(zip.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has !close.')
            res()
        })
        output.on('end', () => {
            console.log(zip.pointer() + ' total bytes')
            console.log('Data has been drained')
            rej()
        })
        zip.on('warning', rej)
        // good practice to catch this error explicitly
        zip.on('error', rej)
        zip.pipe(output)
        for (const img of imgs) {
            zip.append(img.data, { name: basename(img.fname) })
        }
        zip.finalize()
        for (const img of imgs) {
            unlinkSync(img.fname)
        }
    })
}


export async function main(bpath: string, outdir: string = '') {
    try {
        await exec(bpath, outdir)
    } catch (error) {
        console.log(axiosCatch(error))
        console.log('fetch imgs FIN!')
    }
    if (imgs.length) {
        await packZip()
    }
}
