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

import * as nhent from '../site/nht'
import * as gui from '../site/manhuagui'
import * as ppmh from '../site/pipimhw'

process.nextTick(async function () {
    const sites: Site[] = []
    sites.push({ valid: nhent.valid, main: nhent.main })
    sites.push({ valid: gui.valid, main: gui.main })
    sites.push({ valid: ppmh.valid, main: ppmh.main })
    for (const { valid, main } of sites) {
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
