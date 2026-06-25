# HarborClient plugins directory

This folder holds marketplace metadata and official plugin signing keys.

| File           | In git | Purpose                                                                                                                                                       |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.json` | Yes    | Source for the [plugin marketplace](https://harborclient.com/plugins)                                                                                         |
| `trusted.json` | Yes    | Registry of trusted plugin signing key URLs (published at [harborclient.com/plugins/trusted.json](https://harborclient.com/plugins/trusted.json))             |
| `public.key`   | Yes    | Ed25519 public key for verifying official plugin signatures (published at [harborclient.com/plugins/public.key](https://harborclient.com/plugins/public.key)) |
| `signing.pem`  | **No** | Ed25519 private key for signing official plugins — generate locally, never commit                                                                             |

Apps and verification tools fetch `trusted.json`, download each listed `key` URL (PEM), and use those public keys to verify plugin `signature.json` files.

## Generate the signing key pair

If you do not already have `signing.pem`:

```bash
openssl genpkey -algorithm ED25519 -out plugins/signing.pem
openssl pkey -in plugins/signing.pem -pubout -out plugins/public.key
```

Commit `public.key` and update `trusted.json` after generation or rotation. Keep `signing.pem` on your machine or in CI secrets only.

## Sign and verify official plugins

From the HarborClient repository root:

```bash
pnpm plugin:sign -- --dir /path/to/plugin --private-key plugins/signing.pem --key-id harborclient-official
pnpm plugin:verify -- --dir /path/to/plugin --public-key plugins/public.key
```

The docs build copies `public.key` and `trusted.json` into the static site so they are available at the URLs above.
