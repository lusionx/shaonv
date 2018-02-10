import * as moment from 'moment'
import axios from 'axios'
import { basename, extname } from 'path'
import { writeFile, axiosCatch, noError } from "../../model/tool"
import * as _ from "lodash"

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

export async function main(bpath: string, outdir: string = '') {
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
            let img = await noError(axios.get<ArrayBuffer>(src, { responseType: 'arraybuffer' }))
            if (!img) {
                console.log([url, src, 'error skip'].join(' -> '))
                i++
                continue
            }
            let fname = [outdir, id, '_', _.padStart(i.toString(), 2, '0'), extname(src)].join('')
            console.log([url, src, fname].join(' -> '))
            await writeFile(fname, img.data)
            i++
            continue
        }
        break
    } while (true)
}

