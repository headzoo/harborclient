import { runVerifyCli } from '@harborclient/sdk/signing';

/**
 * HarborClient wrapper for the plugin verification CLI.
 */
const exitCode = await runVerifyCli(process.argv);
process.exit(exitCode);
