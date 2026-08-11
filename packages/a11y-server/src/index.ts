/**
 * Language server entry for VS Code / Cursor.
 * vscode-languageclient starts this via TransportKind.ipc (`module` + fork).
 * createConnection(ProposedFeatures.all) selects IPC or stdio automatically.
 */
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { startServer } from './server.js';

const connection = createConnection(ProposedFeatures.all);
startServer(connection);
