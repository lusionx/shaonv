import Packer from "zip-stream";

import { createWriteStream } from "fs";

export interface Img {
    fname: string;
    data?: Buffer;
    path?: string;
}

export async function packZip(fname: string, imgs: Img[]) {
    const archive = new Packer(); // OR new Packer(options)

    function push(data: any, opt: any): Promise<any> {
        return new Promise<any>((res, rej) => {
            archive.entry(data, opt, (err: Error, entry: any) => {
                err ? rej(err) : res(entry);
            });
        });
    }

    const output = createWriteStream(fname);
    archive.pipe(output);

    const qs = imgs.map((img) => {
        return push(img.data, { name: img.fname });
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

