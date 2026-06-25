import { runSignCli } from '@harborclient/sdk/signing';

/**
 * HarborClient wrapper for the plugin signing CLI.
 */
const exitCode = await runSignCli(process.argv);
process.exit(exitCode);
