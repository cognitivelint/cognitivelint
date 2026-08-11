#!/usr/bin/env node
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { startServer } from './server.js';

const connection = createConnection(ProposedFeatures.all);
startServer(connection);
