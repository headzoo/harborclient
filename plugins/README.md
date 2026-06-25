# HarborClient plugins directory

This folder holds marketplace metadata and official plugin signing keys.

| File           | In git | Purpose                                                                                                                                                       |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.json` | Yes    | Source for the [plugin marketplace](https://harborclient.com/plugins)                                                                                         |
| `public.key`   | Yes    | Ed25519 public key for verifying official plugin signatures (published at [harborclient.com/plugins/public.key](https://harborclient.com/plugins/public.key)) |
| `signing.pem`  | **No** | Ed25519 private key for signing official plugins — generate locally, never commit                                                                             |

## Generate the signing key pair

If you do not already have `signing.pem`:

```bash
openssl genpkey -algorithm ED25519 -out plugins/signing.pem
openssl pkey -in plugins/signing.pem -pubout -out plugins/public.key
```

Commit `public.key` after generation or rotation. Keep `signing.pem` on your machine or in CI secrets only.

## Sign and verify official plugins

From the HarborClient repository root:

```bash
pnpm plugin:sign -- --dir /path/to/plugin --private-key plugins/signing.pem --key-id harborclient-official
pnpm plugin:verify -- --dir /path/to/plugin --public-key plugins/public.key
```

The docs build copies `public.key` into the static site so verifiers can fetch it from the URL above.
