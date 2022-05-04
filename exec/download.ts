#!/usr/bin/env node
import { Lancer } from "@xerjs/lancer";
import assert from "assert";
import { Hent, Dmzj } from "../src";


async function main() {
    const ava = new Lancer();
    ava.initialize([Hent, Dmzj]);

    const arr = process.argv.slice(2);
    Hent.attchCmd(arr);
    Dmzj.attchCmd(arr);

    const cmd = ava.getCommander(arr);
    assert.ok(cmd);
    cmd.execute();
}

process.nextTick(main);


process.on("unhandledRejection", (error) => {
    console.error(error);
});