import Packer from "zip-stream";

import { createWriteStream } from "fs";
import { basename } from "path";

export interface Img {
    fname: string;
    data: Buffer;
}

export async function packZip(fname: string, imgs: Img[]) {
    const archive = new Packer(); // OR new Packer(options)

    function push(data: any, opt: any): Promise<any> {
        return new Promise<any>((res, rej) => {
            console.log("entry %j", opt, data.length);
            archive.entry(data, opt, (err: Error, entry: any) => {
                err ? rej(err) : res(entry);
            });
        });
    }

    const output = createWriteStream(fname);
    archive.pipe(output);

    const qs = imgs.map((img) => {
        return push(img.data, { name: basename(img.fname) });
    });
    await Promise.all(qs);
    archive.finish();
}

/** 简化axios的异常 */
export function axiosCatch(error: any): any {
    const { response } = error;
    if (!response) {
        return error;
    }
    const { config, status, statusText } = response;
    const { method, url, data } = config;
    const err: any = new Error([method, url, "with", status, statusText].join(" "));
    if (data) {
        err.data = data;
    }
    err.body = response.data;
    return err;
}

export async function noError<T>(p: Promise<T>): Promise<T | undefined> {
    let err: any;
    try {
        return await p;
    }
    catch (error) {
        err = error;
    }
}

export function times(i: number): number[] {
    return "1".repeat(i).split("").map((e, i) => i);
}

export function doLimit(limit: number, qs: (() => Promise<void>)[]): Promise<void[]> {
    if (limit >= qs.length) {
        return Promise.all(qs.map(fn => fn()));
    }
    const res = new Array<Promise<void>>(qs.length);
    return new Promise((a, b) => {
        function gogo(i: number) {
            const end = qs[i]();
            res[i] = end;
            end.then(next(i)).catch(next(i));
        }
        function next(i: number) {
            return () => {
                const j = res.findIndex((r, j) => !res[j]);
                if (j === -1) {
                    return Promise.all(res).then(a).catch(b);
                }
                gogo(j);
            };
        }
        times(limit).forEach(gogo);
    });
}
