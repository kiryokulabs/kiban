# Release Checklist

Kiban releases must publish both runtime images and installer assets.

## Required images

- `ghcr.io/kiryokulabs/kiban-api:<version>`
- `ghcr.io/kiryokulabs/kiban-web:<version>`

## Required release assets

- `VERSION`
- `install.sh`
- `compose.yaml`
- `kiban`

## Release channel

The default installer and update command use the `latest` release channel:

```txt
https://get.kibanos.com/latest/
```

That channel must serve:

```txt
https://get.kibanos.com/latest/VERSION
https://get.kibanos.com/latest/install.sh
https://get.kibanos.com/latest/compose.yaml
https://get.kibanos.com/latest/kiban
```

`VERSION` must contain the published Kiban version without the `v` prefix, for example:

```txt
0.2.0
```

## Before publishing

- Run the test suite.
- Build API and web images.
- Attach all release assets to the GitHub Release.
- Verify `get.kibanos.com/latest/VERSION` returns the expected version.
- Verify `get.kibanos.com/latest/compose.yaml` is reachable.
- Verify `get.kibanos.com/latest/kiban` is reachable and executable.
- Install Kiban on a clean VPS.
- Verify `kiban update` from the previous release candidate.
- Configure an Instance Domain on the previous release, run `kiban update` and `kiban restart`, and verify the domain still routes without saving it again.
- Verify the updated `kiban-web` runtime has the shared `kiban` network and HTTPS Traefik labels.
- Verify existing service URLs still work after the update.
