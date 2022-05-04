#!/usr/bin/env node
import { Lancer } from "@xerjs/lancer";
import assert from "assert";
import { Hent } from "../src/sites/nht";

async function main() {
    const ava = new Lancer();
    ava.initialize([Hent]);
    const arr = process.argv.slice(2);
    Hent.attchCmd(arr);
    const cmd = ava.getCommander(arr);
    assert.ok(cmd);
    cmd.execute();
}

process.nextTick(main);


process.on("unhandledRejection", (error) => {
    console.error(error);
});