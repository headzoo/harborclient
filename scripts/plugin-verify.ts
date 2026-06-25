import { runVerifyCli } from '@harborclient/plugin-api/signing';

/**
 * HarborClient wrapper for the plugin verification CLI.
 */
const exitCode = await runVerifyCli(process.argv);
process.exit(exitCode);
