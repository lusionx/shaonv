import * as moment from 'moment'
import axios from 'axios'
import { axiosCatch } from "../model/tool"


interface Site {
    valid(url: string): boolean
    main(url: string, dir?: string): Promise<void>
}


import * as nhent from './site/nht'
const s2 = { valid: nhent.valid, main: nhent.main } as Site
import * as gui from './site/manhuagui'
const s3 = { valid: gui.valid, main: gui.main } as Site

(async function () {
    const [node_path, self_path, ...strs] = process.argv
    for (let { valid, main } of [s2, s3]) {
        try {
            if (valid(strs[0])) {
                await main(strs[0], strs[1])
                break
            }
        } catch (error) {
            console.log(axiosCatch(error))
        }
    }
})()
