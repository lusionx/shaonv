import * as yargs from 'yargs'

interface Site {
    valid(url: string): boolean
    main(url: string, dir?: string): Promise<void>
}

const argv = yargs.usage('$0 --dir <fo> url')
    .option('dir', {
        alias: 'd',
        describe: '目录',
        string: true,
        default: './',
    })
    .help('h').alias('h', 'help')
    .argv

import * as nhent from '../site/nht'
import * as gui from '../site/manhuagui'
import * as ppmh from '../site/pipimhw'
import * as dui from '../site/manhuadui'
import * as dmzj from '../site/dmzj'

process.nextTick(async function () {
    const sites: Site[] = []
    sites.push(nhent)
    sites.push(gui, dui)
    sites.push(ppmh)
    sites.push(dmzj)
    for (const { valid, main } of sites) {
        for (let url of argv._) {
            [url] = url.split('?')
            if (valid(url)) {
                console.log('valid', url)
                await main(url, argv.dir)
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
