# World Gym Guest Registration

Attempting to improve the UX for the [_worst online form of all times_](https://ggpx.info/guestreg.aspx?gymid=1).

## QuickStart

```sh
pnpm install
pnpm start
```

```sh
ngrok http 3000
```

## Docker

Copy [`ngrok-template.yml`](ngrok/ngrok-template.yml) to [`ngrok.yml`](ngrok/ngrok.yml) and fill the blanks:

```YAML
version: "2"

# https://dashboard.ngrok.com/get-started/your-authtoken
authtoken: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


log: stdout
region: us

tunnels:
  wgr:
    proto: http
    addr: wgr:3000

    # https://dashboard.ngrok.com/cloud-edge/domains
    domain: fill-me.ngrok-free.app
    oauth:
      provider: "google"

      # Fill me
      allow_emails: []
```
