import * as moment from 'moment'
import axios from 'axios'
import { axiosCatch } from "../model/tool"
import * as _ from "lodash"


interface Site {
    valid(url: string): boolean
    main(url: string, dir?: string): Promise<void>
}

import * as yqmh from './site/yqmh'
const s1 = { valid: yqmh.valid, main: yqmh.main } as Site


(async function () {
    const [node_path, self_path, ...strs] = process.argv
    for (let { valid, main } of [s1]) {
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