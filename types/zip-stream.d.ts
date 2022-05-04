declare module "zip-stream" {

    class Packer extends stream.Readable {
        on(event: "error", fn: Function): void;
        entry(data: String | Buffer, opt: any, call: Function): void;
        pipe(target: any): void;
        finish(): void;
    }
    export default Packer;
}
