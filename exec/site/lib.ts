
import * as archiver from 'archiver'
import { createWriteStream, unlinkSync } from 'fs'
import { basename, extname } from 'path'

export interface Img {
    fname: string
    data: Buffer
}

export function packZip(fname: string, imgs: Img[]) {
    return new Promise<void>((res, rej) => {
        const zip = archiver('zip')
        const output = createWriteStream(fname)
        output.on('close', function () {
            console.log(zip.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has !close.')
            res()
        })
        output.on('end', () => {
            console.log(zip.pointer() + ' total bytes', fname)
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
