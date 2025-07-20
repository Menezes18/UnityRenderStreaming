import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan';
import cors from 'cors';

import signaling from './signaling';
import Options from './class/options';
import { reset as resetHandler } from './class/httphandler';
import { log, LogLevel } from './log';

export const createServer = (config: Options): Application => {
  const app = express();

  // 1) Handler de modo (public/private)
  resetHandler(config.mode);

  // 2) Logging HTTP
  if (config.logging !== 'none') {
    app.use(morgan(config.logging));
  }

  // 3) Middlewares básicos
  app.use(cors({ origin: '*' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // 4) Endpoint de configuração
  app.get('/config', (_req, res) => {
    res.json({
      useWebSocket: config.type === 'websocket',
      startupMode: config.mode,
      logging:     config.logging,
    });
  });

  // 5) Rota de signaling (socket ou http polling)
  app.use('/signaling', signaling);

  // 6) Static files do cliente
  app.use(
    express.static(path.join(__dirname, '../client/public'))
  );
  app.use(
    '/module',
    express.static(path.join(__dirname, '../client/src'))
  );

  // 7) Rota raiz: envia index.html
  app.get('/', (_req, res) => {
    const indexPath = path.join(__dirname, '../client/public/index.html');
    fs.access(indexPath, fs.constants.R_OK, err => {
      if (err) {
        log(
          LogLevel.warn,
          `Can't find file '${indexPath}'`
        );
        res
          .status(404)
          .send(`Can't find file ${indexPath}`);
      } else {
        res.sendFile(indexPath);
      }
    });
  });

  return app;
};
