import { createInterface } from 'readline'
import { createReadStream, writeFile as _writeFile } from 'fs'


export async function noError<T>(p: Promise<T>): Promise<T | undefined> {
    let err: any
    try {
        return await p
    } catch (error) {
        err = error
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise<void>((res, rej) => {
        setTimeout(() => {
            res()
        }, ms)
    })
}
/** 简化axios的异常 */
export function axiosCatch(error: any): any {
    let { response } = error
    if (!response) {
        return error
    }
    let { config, status, statusText } = response
    let { method, url, data } = config
    let err: any = new Error([method, url, 'with', status, statusText].join(' '))
    if (data) {
        err.data = data
    }
    err.body = response.data
    return err
}

function _readFile(filename: string, callback: (err?: any, lines?: string[]) => void) {
    let rl = createInterface({
        input: createReadStream(filename),
        terminal: false
    })
    var ls: string[] = [];
    rl.on('line', function (e) {
        return ls.push(e as string);
    })
    rl.on('close', function () {
        callback(undefined, ls)
    })
}

export async function readFile(filename: string): Promise<string[]> {
    return new Promise<string[]>((res, rej) => {
        _readFile(filename, (err, ls) => {
            res(ls)
        })
    })
}

export function writeFile(path: string, data: any): Promise<void> {
    return new Promise<void>((res, rej) => {
        _writeFile(path, data, (err) => {
            err ? rej(err) : res()
        })
    })
}

class Single<T> {
    instance?: T
    get(fn?: () => T): T {
        if (this.instance) {
            return this.instance
        }
        if (fn) {
            return this.instance = fn()
        }
        throw new Error('need creater')
    }
}
