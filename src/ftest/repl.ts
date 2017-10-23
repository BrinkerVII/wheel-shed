import * as repl from 'repl';

const local = repl.start("wheel-shed > ");
let indexjs = require("../index.js");
Object.assign(local.context, indexjs);
