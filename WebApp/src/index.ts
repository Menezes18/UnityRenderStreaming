// src/index.ts

import { Command } from 'commander';
import * as express from 'express';
import * as https from 'https';
import { Server } from 'http';
import * as fs from 'fs';
import * as os from 'os';
import { createServer } from './server';
import { AddressInfo } from 'net';
import WSSignaling from './websocket';
import type Options from './class/options';
export class RenderStreaming {
  public app: express.Application;
  public server?: Server;
  public options: Options;

  public static run(argv: string[]): RenderStreaming {
    const program = new Command();
    // configura as opções de CLI / env
    program
      .usage('[options] <apps...>')
      .option('-p, --port <n>', 'Port to start the server on.', process.env.PORT || `80`)
      .option('-s, --secure', 'Enable HTTPS (you need server.key and server.cert).', process.env.SECURE || false)
      .option('-k, --keyfile <path>', 'https key file.', process.env.KEYFILE || 'server.key')
      .option('-c, --certfile <path>', 'https cert file.', process.env.CERTFILE || 'server.cert')
      .option('-t, --type <type>', 'Choose signaling protocol: websocket or http.', process.env.TYPE || 'websocket')
      .option('-m, --mode <type>', 'Choose Communication mode: public or private.', process.env.MODE || 'public')
      .option('-l, --logging <type>', 'HTTP logging: combined, dev, short, tiny or none.', process.env.LOGGING || 'dev')
      .parse(argv);

    const opt = program.opts();
const options: Options = {
      port: Number(opt.port),
      secure: Boolean(opt.secure),
      keyfile: opt.keyfile,
      certfile: opt.certfile,
      type: opt.type,
      mode: opt.mode,
      logging: opt.logging,
    };
    return new RenderStreaming(options);
  }

  constructor(options: Options) {
    this.options = options;
    // monta express app (rotas, static etc)
    this.app = createServer(this.options);

    const PORT = this.options.port;
    const HOST = '0.0.0.0';  // escuta todas as interfaces

    if (this.options.secure) {
      // HTTPS
      const httpsServer = https.createServer({
        key: fs.readFileSync(this.options.keyfile),
        cert: fs.readFileSync(this.options.certfile),
      }, this.app);
      this.server = httpsServer.listen(PORT, HOST, () => {
        const addr = this.server!.address() as AddressInfo;
        const addresses = this.getIPAddress();
        for (const address of addresses) {
          console.log(`https://${address}:${addr.port}`);
        }
      });
    } else {
      // HTTP puro
      this.server = this.app.listen(PORT, HOST, () => {
        const addr = this.server!.address() as AddressInfo;
        const addresses = this.getIPAddress();
        for (const address of addresses) {
          console.log(`http://${address}:${addr.port}`);
        }
      });
    }

    // valida tipo de signaling e inicia WebSocket se for o caso
    if (this.options.type === 'websocket') {
      console.log(`Use websocket for signaling server ws://${this.getIPAddress()[0]}`);
      new WSSignaling(this.server!, this.options.mode);
    } else if (this.options.type === 'http') {
      console.log(`Use HTTP polling for signaling server.`);
    } else {
      console.warn(`Tipo de signaling "${this.options.type}" não suportado. Usando "websocket".`);
      this.options.type = 'websocket';
      new WSSignaling(this.server!, this.options.mode);
    }

    console.log(`Server iniciado em modo "${this.options.mode}"`);
  }

  private getIPAddress(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name in interfaces) {
      for (const info of interfaces[name]!) {
        if (info.family === 'IPv4' && !info.internal) {
          addresses.push(info.address);
        }
      }
    }
    return addresses;
  }
}

// inicia a aplicação
RenderStreaming.run(process.argv);
