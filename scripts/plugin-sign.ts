import { runSignCli } from '@harborclient/plugin-api/signing';

/**
 * HarborClient wrapper for the plugin signing CLI.
 */
const exitCode = await runSignCli(process.argv);
process.exit(exitCode);
