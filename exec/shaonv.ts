import * as yargs from 'yargs'

interface Site {
    valid(url: string): boolean
    main(url: string, dir?: string): Promise<void>
}

const argv = yargs.usage('$0 --dir <fo> url')
    .option('dir', {
        alias: 'd',
        describe: '目录',
        default: './',
    })
    .help('h').alias('h', 'help')
    .argv

import * as nhent from '../site/nht'
import * as gui from '../site/manhuagui'
import * as ppmh from '../site/pipimhw'
import * as dui from '../site/manhuadui'

process.nextTick(async function () {
    const sites: Site[] = []
    sites.push({ valid: nhent.valid, main: nhent.main })
    sites.push({ valid: gui.valid, main: gui.main })
    sites.push({ valid: dui.valid, main: dui.main })
    sites.push({ valid: ppmh.valid, main: ppmh.main })
    for (const { valid, main } of sites) {
        for (const url of argv._) {
            const dir = argv.dir as string
            if (valid(url)) {
                await main(url, dir)
            }
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
