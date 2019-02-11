import axios from 'axios'
import { basename, extname } from 'path'
import { writeFile, axiosCatch, Single } from "../model/tool"
import { Img, packZip } from './lib'

const HOME = 'https://www.pipimhw.com/'
const regSite = /https:\/\/www\.pipimhw\.com\/cartoon\/(.+)\/(.+)\.html/

export function valid(url: string): boolean {
    return regSite.test(url)
}

interface Info {
    chapterTree: string[]
    picTree: string[]
}

let viewname = 'viewname'

async function exec(bpath: string, outdir: string = '') {
    const imgs: Img[] = []
    let mc = regSite.exec(bpath)
    if (!mc) return imgs
    const bid = mc[1]
    const mainHtml = await axios.get<string>(bpath, { responseType: 'text' })
    const infoLine = mainHtml.data.split('\n').find((e) => {
        let mm = /viewname = "(.+?)"/.exec(e)
        if (mm) viewname = mm[1]
        return e.includes('chapterTree')
    })
    if (!infoLine) return imgs
    const src = infoLine.replace('<script type="text/javascript">', '(function(){')
        .replace('</script>', 'return {chapterTree,picTree,currentChapterid,cid};})()')
    const info = eval(src) as Info
    const [Prev, Curr, Next] = info.chapterTree
    console.log({ Prev })
    console.log({ Next })
    mc = regSite.exec(Curr)
    const cid = mc ? mc[2] : viewname
    for (let index = 0; index < info.picTree.length; index++) {
        const ee = info.picTree[index]
        const upath = 'https://pic.pipimhw.com' + ee
        console.log(bid, viewname, upath)
        const resp = await axios.get<Buffer>(upath, { responseType: 'arraybuffer', timeout: 20000 })
        const fname = [outdir, viewname, '.', index.toString().padStart(2, '0'), extname(ee)].join('')
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
    const mc = regSite.exec(bpath)
    if (imgs.length && mc) {
        const [s, id, cid] = mc
        await packZip(outdir + 'ppmh_' + id + '.' + viewname + '.zip', imgs)
    }
}
