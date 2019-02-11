import { axiosCatch } from "../model/tool"
import * as yargs from 'yargs'

interface Site {
    valid(url: string): boolean
    main(url: string, dir?: string): Promise<void>
}

const argv = yargs.usage('$0 --dir <fo> url')
    .demandCommand(1)
    .demandOption(['dir'])
    .alias('d', 'dir').describe('d', '目录')
    .help('h').alias('h', 'help')
    .argv

import * as nhent from './site/nht'
const s2 = { valid: nhent.valid, main: nhent.main } as Site
import * as gui from './site/manhuagui'
const s3 = { valid: gui.valid, main: gui.main } as Site

process.nextTick(async function () {
    for (const { valid, main } of [s2, s3]) {
        const url = argv._[0]
        const dir = argv.dir as string
        if (valid(url)) {
            await main(url, dir)
            break
        }
    }
})

process.on("unhandledRejection", (error) => {
    const { response, config } = error
    if (config && response) {
        return console.error({ config, data: response.data })
    }
    console.error(error)
})
